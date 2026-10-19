import type { ReactNode } from "react";
import { CartProvider } from "@/contexts/CartContext";
import ShopHeader from "@/components/shop/ShopHeader";

export default function ShopLayout({ children }: { children: ReactNode }) {
    return (
        <CartProvider>
            <div className="min-h-screen bg-accent/20">
                <ShopHeader rightSlot={null} />
                <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
            </div>
        </CartProvider>
    );
}
