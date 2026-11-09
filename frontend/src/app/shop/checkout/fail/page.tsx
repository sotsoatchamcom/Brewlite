"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, RotateCcw, Coffee, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function FailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const orderId = searchParams.get("orderId");
    const orderCode = searchParams.get("orderCode") || orderId;

    return (
        <div className="bg-[#FFFFFF] border border-[#E8E2D9] w-full max-w-md rounded-3xl p-8 shadow-xs text-center space-y-6">
            {/* Icon thất bại đỏ */}
            <div className="w-16 h-16 bg-[#FBE9E7] text-[#A12B1F] rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
                <h1 className="text-2xl font-bold text-[#2B2118]">Thanh toán thất bại!</h1>
                <p className="text-xs text-[#6B5E52]">
                    Giao dịch chưa hoàn tất. Đơn nước của bạn đã được lưu để thanh toán lại.
                </p>
            </div>

            {/* Box thông tin đơn hàng */}
            <div className="bg-[#FAF7F2] border border-[#E8E2D9] rounded-2xl p-4 text-xs space-y-3 text-left">
                <div className="flex justify-between items-center">
                    <span className="text-[#6B5E52]">Mã đơn hàng:</span>
                    <span className="font-mono font-bold text-[#2B2118]">#{orderCode || "---"}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[#6B5E52]">Trạng thái:</span>
                    <span className="font-bold text-[#A12B1F] bg-[#FBE9E7] border border-[#A12B1F]/20 px-2.5 py-0.5 rounded-full text-[11px]">
                        ● PAYMENT_FAILED (CHƯA THANH TOÁN)
                    </span>
                </div>
            </div>

            {/* Nút hành động */}
            <div className="space-y-2.5 pt-2">
                <Button
                    onClick={() => router.push(orderId ? `/shop/orders#order-${orderId}` : "/shop/orders")}
                    className="w-full rounded-2xl py-6 font-bold bg-[#1A1A1A] hover:bg-[#000000] text-white flex items-center justify-center gap-2"
                >
                    <RotateCcw className="w-4 h-4" />
                    Thanh toán lại ngay
                </Button>

                <Button
                    asChild
                    variant="ghost"
                    className="w-full rounded-2xl text-xs text-[#6B5E52] hover:text-[#2B2118]"
                >
                    <Link href="/shop" className="flex items-center justify-center gap-1.5">
                        <Coffee className="w-4 h-4" />
                        Tiếp tục gọi món
                    </Link>
                </Button>
            </div>
        </div>
    );
}

export default function CheckoutFailPage() {
    return (
        <div className="w-full min-h-[80vh] flex items-center justify-center bg-[#FAF7F2] p-4">
            <Suspense
                fallback={
                    <div className="flex flex-col items-center justify-center gap-2 text-xs text-[#6B5E52]">
                        <Loader2 className="w-6 h-6 animate-spin text-[#B45F2B]" />
                        <span>Đang tải thông tin đơn hàng...</span>
                    </div>
                }
            >
                <FailContent />
            </Suspense>
        </div>
    );
}