"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Pencil, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EditLineDialog from "@/components/shop/EditLineDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { CHECKOUT_PATH, LOGIN_PATH, formatVND, lineTotal, type CartItem } from "@/lib/shop";

export default function CartPage() {
    const { items, totalPrice, totalQty, hydrated, increase, decrease, remove } = useCart();
    const [editing, setEditing] = useState<CartItem | null>(null);
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    // Khách xem menu/thêm giỏ tự do; chỉ khi thanh toán mới yêu cầu đăng nhập
    const handleCheckout = () => {
        if (isAuthenticated) return router.push(CHECKOUT_PATH);
        toast.info("Vui lòng đăng nhập để thanh toán");
        router.push(`${LOGIN_PATH}?redirect=${encodeURIComponent(CHECKOUT_PATH)}`);
    };

    if (!hydrated) return <Skeleton className="h-48 rounded-2xl" aria-busy="true" />;

    if (items.length === 0) {
        return (
            <div className="bg-card border border-border rounded-2xl py-16 text-center shadow-xs">
                <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground/50" />
                <h1 className="text-xl font-bold mt-4">Giỏ hàng trống</h1>
                <p className="text-sm text-muted-foreground mt-1">Chọn một món từ menu để bắt đầu đặt.</p>
                <Button asChild className="rounded-xl mt-5"><Link href="/shop">Xem menu</Link></Button>
            </div>
        );
    }

    return (
        <>
            <h1 className="text-2xl font-bold tracking-tight">Giỏ hàng ({totalQty} ly)</h1>
            <ul className="mt-5 bg-card border border-border rounded-2xl overflow-hidden shadow-xs divide-y divide-border">
                {items.map((i) => (
                    <li key={i.key} className="flex flex-wrap items-center gap-4 p-4">
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold">
                                {i.name}
                                {i.sizeName && <span className="font-normal text-muted-foreground"> · Size {i.sizeName}</span>}
                            </p>
                            {i.toppings.length > 0 && <p className="text-sm text-muted-foreground">{i.toppings.map((t) => t.name).join(", ")}</p>}
                            <p className="text-sm text-muted-foreground mt-1">{formatVND(i.unitPrice)} / ly</p>
                        </div>
                        <div className="flex items-center border border-border rounded-xl">
                            <Button variant="ghost" size="icon" className="rounded-xl" aria-label={`Giảm ${i.name}`} onClick={() => decrease(i.key)}>
                                <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-8 text-center font-semibold">{i.qty}</span>
                            <Button variant="ghost" size="icon" className="rounded-xl" aria-label={`Tăng ${i.name}`} disabled={i.qty >= i.maxQty} onClick={() => increase(i.key)}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="w-28 text-right font-semibold">{formatVND(lineTotal(i))}</p>
                        <Button variant="ghost" size="icon" className="rounded-lg" aria-label={`Tùy chỉnh ${i.name}`} onClick={() => setEditing(i)}>
                            <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50" aria-label={`Xóa ${i.name}`} onClick={() => remove(i.key)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </li>
                ))}
            </ul>

            <div className="mt-5 flex items-center justify-between bg-card border border-border rounded-2xl p-4 shadow-xs">
                <span className="text-lg font-bold">Tổng: {formatVND(totalPrice)}</span>
                {/* trang /shop/checkout và /shop/login */}
                <Button className="rounded-xl" disabled={authLoading} onClick={handleCheckout}>Thanh toán</Button>
            </div>
            {editing && <EditLineDialog key={editing.key} item={editing} onClose={() => setEditing(null)} />}
        </>
    );
}
