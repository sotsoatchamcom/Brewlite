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

export const LOGIN_PATH = "/auth/login";
export const CHECKOUT_PATH = "/shop/checkout";


export function matchesSearch(p: Product, query: string): boolean {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;
    const words = normalize(`${p.name} ${p.category?.name ?? ""}`).split(/\s+/);
    return tokens.every((t) => words.some((w) => w.startsWith(t)));
}

export const CART_STORAGE_KEY = "brewlite_cart_v1";
export const CART_OWNER_KEY = "brewlite_cart_owner";

export function claimCartForUser(email: string) {
    try {
        const owner = localStorage.getItem(CART_OWNER_KEY);
        if (owner && owner !== email) localStorage.removeItem(CART_STORAGE_KEY);
        localStorage.setItem(CART_OWNER_KEY, email);
    } catch {  }
}


export function releaseCartOwner() {
    try { localStorage.removeItem(CART_OWNER_KEY); } catch {  }
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
