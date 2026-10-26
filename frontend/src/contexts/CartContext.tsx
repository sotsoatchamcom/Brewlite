"use client";

import {
    createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState,
    type ReactNode,
} from "react";
import { CART_STORAGE_KEY, calcUnitPrice, lineTotal, makeCartKey, type CartItem, type CartTopping } from "@/lib/shop";


type Action =
    | { type: "HYDRATE"; items: CartItem[] }
    | { type: "ADD"; item: CartItem }
    | { type: "SET_QTY"; key: string; qty: number }
    | { type: "REMOVE"; key: string }
    | { type: "UPDATE_LINE"; key: string; count: number; next: LineOptions }
    | { type: "CLEAR" };

export interface LineOptions {
    sizeName: string | null;
    sizeSurcharge: number;
    toppings: CartTopping[];
}

function reducer(items: CartItem[], a: Action): CartItem[] {
    switch (a.type) {
        case "HYDRATE":
            return a.items;
        case "ADD": {
            const found = items.find((i) => i.key === a.item.key);
            if (!found) return [...items, { ...a.item, qty: Math.min(a.item.qty, a.item.maxQty) }];
            return items.map((i) =>
                i.key === a.item.key ? { ...i, qty: Math.min(i.qty + a.item.qty, i.maxQty) } : i
            );
        }
        case "SET_QTY":
            return a.qty <= 0
                ? items.filter((i) => i.key !== a.key)
                : items.map((i) => (i.key === a.key ? { ...i, qty: Math.min(a.qty, i.maxQty) } : i));
        case "REMOVE":
            return items.filter((i) => i.key !== a.key);
        case "UPDATE_LINE": {
            const idx = items.findIndex((i) => i.key === a.key);
            if (idx < 0) return items;
            const line = items[idx];
            const newKey = makeCartKey(line.productId, a.next.sizeName, a.next.toppings);
            if (newKey === line.key) return items;

            // Tách `count` ly ra khỏi dòng cũ (xóa dòng nếu tách hết)
            const count = Math.min(Math.max(1, a.count), line.qty);
            const rest = line.qty - count;
            const without = rest > 0
                ? items.map((i, n) => (n === idx ? { ...i, qty: rest } : i))
                : items.filter((_, n) => n !== idx);

            // Gộp vào dòng đã có cùng cấu hình, nếu không thì chèn dòng mới ngay sau dòng cũ
            if (without.some((i) => i.key === newKey)) {
                return without.map((i) => (i.key === newKey ? { ...i, qty: Math.min(i.qty + count, i.maxQty) } : i));
            }
            const moved: CartItem = {
                ...line, ...a.next, key: newKey, qty: count,
                unitPrice: calcUnitPrice(line.basePrice, a.next.sizeSurcharge, a.next.toppings),
            };
            const pos = rest > 0 ? idx + 1 : idx;
            return [...without.slice(0, pos), moved, ...without.slice(pos)];
        }
        case "CLEAR":
            return [];
    }
}

export type AddItemInput = Omit<CartItem, "key">;

interface CartContextValue {
    items: CartItem[];
    totalQty: number;
    totalPrice: number;
    hydrated: boolean;
    addItem: (input: AddItemInput) => void;
    increase: (key: string) => void;
    decrease: (key: string) => void;
    remove: (key: string) => void;
    /** Đổi size/topping của `count` ly trong một dòng (tách dòng nếu cần). */
    updateLine: (key: string, count: number, next: LineOptions) => void;
    /** Gọi sau khi thanh toán thành công. */
    clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, dispatch] = useReducer(reducer, []);
    const [hydrated, setHydrated] = useState(false);

    // Nạp localStorage sau khi mount để tránh lỗi hydration mismatch
    useEffect(() => {
        try {
            const raw = localStorage.getItem(CART_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) dispatch({ type: "HYDRATE", items: parsed });
        } catch {
            /* dữ liệu hỏng: bỏ qua */
        }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (hydrated) localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }, [items, hydrated]);

    const addItem = useCallback(
        (input: AddItemInput) =>
            dispatch({
                type: "ADD",
                item: { ...input, key: makeCartKey(input.productId, input.sizeName, input.toppings) },
            }),
        []
    );

    const value = useMemo<CartContextValue>(() => {
        const step = (key: string, delta: number) => {
            const cur = items.find((i) => i.key === key);
            if (cur) dispatch({ type: "SET_QTY", key, qty: cur.qty + delta });
        };
        return {
            items,
            hydrated,
            totalQty: items.reduce((s, i) => s + i.qty, 0),
            totalPrice: items.reduce((s, i) => s + lineTotal(i), 0),
            addItem,
            increase: (key) => step(key, 1),
            decrease: (key) => step(key, -1),
            remove: (key) => dispatch({ type: "REMOVE", key }),
            updateLine: (key, count, next) => dispatch({ type: "UPDATE_LINE", key, count, next }),
            clearCart: () => dispatch({ type: "CLEAR" }),
        };
    }, [items, hydrated, addItem]);

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
    return ctx;
}
