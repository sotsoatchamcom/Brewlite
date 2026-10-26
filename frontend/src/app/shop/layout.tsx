import type { ReactNode } from "react";
import { CartProvider } from "@/contexts/CartContext";
import ShopHeader from "@/components/shop/ShopHeader";
import ShopFooter from "@/components/shop/ShopFooter";

export default function ShopLayout({ children }: { children: ReactNode }) {
    return (
        <CartProvider>
            <div className="min-h-screen flex flex-col overflow-x-clip bg-accent/20">
                <ShopHeader rightSlot={null} />
                <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8">{children}</main>
                <ShopFooter />
            </div>
        </CartProvider>
    );
}
