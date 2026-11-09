"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, Clock, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";

function SuccessView() {
    const searchParams = useSearchParams();
    const orderCode = searchParams.get("orderCode") || "BW-2026";
    const status = searchParams.get("status") || "PAID";

    return (
        <div className="max-w-md mx-auto py-8">
            <div className="bg-card border border-border rounded-3xl p-8 shadow-xs text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
                    <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">Đặt hàng thành công!</h1>
                    <p className="text-sm text-muted-foreground">Đơn nước của bạn đã được chuyển đến quầy pha chế.</p>
                </div>

                <div className="bg-muted/50 border border-border rounded-2xl p-4 text-left space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Mã đơn hàng:</span>
                        <span className="font-mono font-bold text-foreground bg-background px-2.5 py-1 rounded-lg border border-border">
                            #{orderCode}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Trạng thái:</span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            ● {status} (ĐÃ THANH TOÁN)
                        </span>
                    </div>
                </div>

                <div className="space-y-3">
                    <Button asChild className="w-full rounded-xl py-6 font-semibold">
                        <Link href="/shop/orders">
                            <Clock className="w-4 h-4 mr-2" /> Theo dõi tiến trình đơn
                        </Link>
                    </Button>
                    <Button variant="outline" asChild className="w-full rounded-xl py-6">
                        <Link href="/shop">
                            <Coffee className="w-4 h-4 mr-2" /> Tiếp tục gọi món
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={<div className="text-center py-20 text-muted-foreground">Đang tải thông tin đơn...</div>}>
            <SuccessView />
        </Suspense>
    );
}