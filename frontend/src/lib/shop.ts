import type { Product, ProductSize } from "@/lib/types";

export interface CartTopping {
    id: number;
    name: string;
    price: number;
}

export interface CartItem {
    key: string;
    productId: number;
    name: string;
    imageUrl?: string | null;
    sizeName: string | null; 
    sizeSurcharge: number;
    toppings: CartTopping[];
    qty: number;
    basePrice: number;
    unitPrice: number; 
    maxQty: number; 
}

export const calcUnitPrice = (basePrice: number, sizeSurcharge: number, toppings: CartTopping[]) =>
    Number(basePrice) + sizeSurcharge + toppings.reduce((s, t) => s + Number(t.price), 0);

export const lineTotal = (i: Pick<CartItem, "unitPrice" | "qty">) => i.unitPrice * i.qty;

export const makeCartKey = (productId: number, sizeName: string | null, toppings: CartTopping[]) =>
    [productId, sizeName ?? "-", ...toppings.map((t) => t.id).sort((a, b) => a - b)].join("|");

export const formatVND = (n: number) => `${Number(n).toLocaleString("vi-VN")}đ`;

export const normalize = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().trim();


export const LOGIN_PATH = "/login";
export const CHECKOUT_PATH = "/checkout";


export function matchesSearch(p: Product, query: string): boolean {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;
    const words = normalize(`${p.name} ${p.category?.name ?? ""}`).split(/\s+/);
    return tokens.every((t) => words.some((w) => w.startsWith(t)));
}

export const sortedSizes = (p: Product): ProductSize[] =>
    [...(p.sizes ?? [])].filter((s) => s.isAvailable !== false).sort((a, b) => a.surcharge - b.surcharge);


export const toOrderItems = (items: CartItem[]) =>
    items.map((i) => ({
        productId: i.productId,
        ...(i.sizeName ? { size: i.sizeName } : {}),
        quantity: i.qty,
        toppingIds: i.toppings.map((t) => t.id),
    }));
