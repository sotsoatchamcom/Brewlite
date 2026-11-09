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

    const handleCheckout = () => {
        if (isAuthenticated) return router.push(CHECKOUT_PATH);
        toast.info("Vui lòng đăng nhập để thanh toán");
        router.push(`${LOGIN_PATH}?redirect=${encodeURIComponent(CHECKOUT_PATH)}`);
    };

    if (!hydrated) {
        return (
            <div className="w-full max-w-2xl mx-auto space-y-3 p-4">
                <Skeleton className="h-8 w-40 rounded-xl bg-[#E8E2D9]/60" />
                <Skeleton className="h-40 rounded-2xl bg-[#E8E2D9]/60" />
                <Skeleton className="h-16 rounded-2xl bg-[#E8E2D9]/60" />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="w-full max-w-2xl mx-auto px-4 py-8">
                <div className="bg-[#FFFFFF] border border-[#E8E2D9] rounded-2xl py-14 sm:py-16 px-4 text-center shadow-xs">
                    <ShoppingBag className="w-12 h-12 mx-auto text-[#6B5E52]/40" />
                    <h1 className="text-lg sm:text-xl font-bold text-[#2B2118] mt-3">Giỏ hàng trống</h1>
                    <p className="text-xs sm:text-sm text-[#6B5E52] mt-1">
                        Hãy chọn một món từ thực đơn để bắt đầu đặt nhé.
                    </p>
                    <Button
                        asChild
                        className="rounded-xl mt-5 bg-[#B45F2B] hover:bg-[#9A4F22] text-white font-semibold h-10 px-5 text-xs sm:text-sm shadow-xs"
                    >
                        <Link href="/shop">Xem menu</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-28 sm:pb-16 space-y-4">
            {/* Tiêu đề trang */}
            <div className="flex items-center justify-between pb-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#2B2118] flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-[#B45F2B]" />
                    <span>Giỏ hàng ({totalQty} ly)</span>
                </h1>
                <Link
                    href="/shop"
                    className="text-xs font-semibold text-[#B45F2B] hover:text-[#9A4F22] hover:underline"
                >
                    + Thêm món khác
                </Link>
            </div>

            {/* Danh sách các món trong giỏ hàng (Mobile First Layout) */}
            <ul className="bg-[#FFFFFF] border border-[#E8E2D9] rounded-2xl overflow-hidden shadow-xs divide-y divide-[#E8E2D9]">
                {items.map((i) => (
                    <li key={i.key} className="p-3.5 sm:p-4 transition-colors">
                        {/* Hàng 1: Tên món, Size & Nút Xóa nhanh */}
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <h3 className="font-semibold text-sm sm:text-base text-[#2B2118] leading-tight">
                                        {i.name}
                                    </h3>
                                    {i.sizeName && (
                                        <span className="text-[11px] font-medium text-[#6B5E52] bg-[#FAF7F2] border border-[#E8E2D9] px-1.5 py-0.2 rounded-md">
                                            Size {i.sizeName}
                                        </span>
                                    )}
                                </div>

                                {/* Topping đính kèm */}
                                {i.toppings.length > 0 && (
                                    <p className="text-xs text-[#6B5E52] mt-1 leading-relaxed">
                                        + {i.toppings.map((t) => t.name).join(", ")}
                                    </p>
                                )}

                                {/* Đơn giá theo từng ly */}
                                <p className="text-[11px] sm:text-xs text-[#6B5E52]/80 mt-0.5">
                                    {formatVND(i.unitPrice)} / ly
                                </p>
                            </div>

                            {/* Nút Xóa món */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 rounded-lg text-[#6B5E52] hover:text-red-600 hover:bg-red-50 shrink-0 -mt-1 -mr-1"
                                aria-label={`Xóa ${i.name}`}
                                onClick={() => remove(i.key)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Hàng 2: Bộ đếm số lượng, Nút tùy chỉnh và Thành tiền */}
                        <div className="mt-3 pt-2.5 border-t border-[#E8E2D9]/70 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                {/* Bộ tăng giảm [ - 1 + ] */}
                                <div className="flex items-center border border-[#E8E2D9] rounded-xl bg-[#FAF7F2] h-8 sm:h-9">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-l-xl text-[#2B2118] hover:bg-[#E8E2D9]/60 active:scale-95"
                                        aria-label={`Giảm ${i.name}`}
                                        onClick={() => decrease(i.key)}
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </Button>
                                    <span className="w-7 sm:w-8 text-center text-xs sm:text-sm font-bold text-[#2B2118]">
                                        {i.qty}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-r-xl text-[#2B2118] hover:bg-[#E8E2D9]/60 active:scale-95"
                                        aria-label={`Tăng ${i.name}`}
                                        disabled={i.qty >= i.maxQty}
                                        onClick={() => increase(i.key)}
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </Button>
                                </div>

                                {/* Nút Chỉnh sửa topping / size */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 sm:h-9 px-2 text-xs font-semibold text-[#6B5E52] hover:text-[#B45F2B] hover:bg-[#FDF1E7] rounded-xl flex items-center gap-1"
                                    aria-label={`Tùy chỉnh ${i.name}`}
                                    onClick={() => setEditing(i)}
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                    <span>Sửa</span>
                                </Button>
                            </div>

                            {/* Thành tiền của hàng */}
                            <div className="text-right">
                                <span className="text-sm sm:text-base font-bold text-[#B45F2B]">
                                    {formatVND(lineTotal(i))}
                                </span>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>

            {/* Thanh tổng kết & Nút Thanh toán: Sticky đáy màn hình chuẩn PWA */}
            <div className="sticky bottom-3 z-30 flex items-center justify-between bg-[#FFFFFF]/95 backdrop-blur-md border border-[#E8E2D9] rounded-2xl p-3 sm:p-4 shadow-lg shadow-black/5">
                <div className="space-y-0.5">
                    <span className="text-[11px] sm:text-xs text-[#6B5E52] block font-medium">Tổng tiền ({totalQty} món)</span>
                    <span className="text-base sm:text-xl font-bold text-[#2B2118]">
                        {formatVND(totalPrice)}
                    </span>
                </div>

                <Button
                    className="rounded-xl bg-[#2B2118] hover:bg-[#1A140E] text-white font-bold h-10 sm:h-11 px-5 sm:px-7 text-xs sm:text-sm shadow-sm active:scale-[0.98] transition-all"
                    disabled={authLoading}
                    onClick={handleCheckout}
                >
                    Thanh toán
                </Button>
            </div>

            {/* Dialog chỉnh sửa món */}
            {editing && <EditLineDialog key={editing.key} item={editing} onClose={() => setEditing(null)} />}
        </div>
    );
}