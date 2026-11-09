"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
    Coffee,
    RefreshCcw,
    ShoppingBag,
    BellRing,
    Calendar,
    AlertCircle,
    RotateCcw,
    X,
    CheckCircle2,
    AlertTriangle,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import OrderTimeline from "@/components/shop/OrderTimeline";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

// Hàm định dạng tiền an toàn
const safeFormatVND = (value: any): string => {
    const num = Number(value);
    if (isNaN(num) || num <= 0) return "0đ";
    return num.toLocaleString("vi-VN") + "đ";
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Chờ duyệt", color: "bg-[#FDF1E7] text-[#8A4A1F] border-[#E8E2D9]" },
    PAID: { label: "Đã thanh toán", color: "bg-[#FDF1E7] text-[#8A4A1F] border-[#E8E2D9]" },
    PREPARING: { label: "Đang pha chế", color: "bg-[#FDF1E7] text-[#8A4A1F] border-[#E8E2D9]" },
    BREWING: { label: "Đang pha chế", color: "bg-[#FDF1E7] text-[#8A4A1F] border-[#E8E2D9]" },
    READY: { label: "Mời nhận nước", color: "bg-[#FDF1E7] text-[#8A4A1F] border-[#B45F2B]/40 animate-pulse" },
    COMPLETED: { label: "Hoàn tất", color: "bg-[#E7F4EA] text-[#1E6B34] border-[#E7F4EA]" },
    CANCELLED: { label: "Đã huỷ", color: "bg-[#FBE9E7] text-[#A12B1F] border-[#FBE9E7]" },
    PAYMENT_FAILED: { label: "Thanh toán thất bại", color: "bg-[#FBE9E7] text-[#A12B1F] border-[#FBE9E7]" },
};

export default function OrderHistoryPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // State phục vụ modal thanh toán lại
    const [repayOrder, setRepayOrder] = useState<any | null>(null);
    const [paying, setPaying] = useState(false);

    const loadOrders = useCallback(async (isSilent = false) => {
        if (!isSilent) setRefreshing(true);
        try {
            const data: any = await apiFetch("/orders/me");
            setOrders(Array.isArray(data) ? data : data?.data || []);
        } catch (err) {
            console.error("Lỗi tải đơn:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadOrders();
        const interval = setInterval(() => loadOrders(true), 8000);
        return () => clearInterval(interval);
    }, [loadOrders]);

    const scrollToOrder = useCallback((targetId: string) => {
        const el = document.getElementById(targetId);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("ring-2", "ring-[#B45F2B]", "shadow-lg");
            setTimeout(() => {
                el.classList.remove("ring-2", "ring-[#B45F2B]", "shadow-lg");
            }, 3000);
        }
    }, []);

    useEffect(() => {
        if (loading || orders.length === 0) return;
        const checkAndScroll = () => {
            const hash = window.location.hash;
            if (hash && hash.startsWith("#order-")) {
                const targetId = hash.replace("#", "");
                setTimeout(() => scrollToOrder(targetId), 200);
            }
        };
        checkAndScroll();
        window.addEventListener("hashchange", checkAndScroll);
        return () => window.removeEventListener("hashchange", checkAndScroll);
    }, [loading, orders, scrollToOrder]);

    // Xử lý thanh toán lại (Retry Payment)
    const handleExecuteRepay = async (simulateFail: boolean) => {
        if (!repayOrder) return;
        setPaying(true);

        const currentKey = typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `retry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        try {
            const res: any = await apiFetch("/payments", {
                method: "POST",
                headers: { "idempotency-key": currentKey },
                body: JSON.stringify({
                    orderId: Number(repayOrder.id),
                    method: "WALLET",
                    amount: Number(repayOrder.finalAmount ?? repayOrder.total),
                    idempotencyKey: currentKey,
                    simulateFailure: Boolean(simulateFail),
                }),
            });

            if (simulateFail || res?.success === false || res?.orderStatus === "PAYMENT_FAILED") {
                toast.error(res?.message || "Thanh toán lại vẫn chưa thành công!");
                setRepayOrder(null);
                await loadOrders(false);
                return;
            }

            toast.success("Thanh toán lại thành công! Đơn hàng đã được chuyển cho Barista.");
            setRepayOrder(null);
            await loadOrders(false);
        } catch (err: any) {
            toast.error(err.message || "Lỗi xử lý thanh toán");
            setRepayOrder(null);
            await loadOrders(false);
        } finally {
            setPaying(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full min-h-screen bg-[#FAF7F2] py-4 sm:py-8 px-3 sm:px-6">
                <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
                    <Skeleton className="h-8 w-40 sm:w-48 rounded-xl bg-[#E8E2D9]/60" />
                    <Skeleton className="h-44 sm:h-56 rounded-xl bg-[#E8E2D9]/60" />
                    <Skeleton className="h-44 sm:h-56 rounded-xl bg-[#E8E2D9]/60" />
                </div>
            </div>
        );
    }

    return (
        <div
            className="w-full min-h-screen bg-[#FAF7F2] py-4 sm:py-8 px-3 sm:px-6"
            style={{
                "--bg-page": "#FAF7F2",
                "--bg-card": "#FFFFFF",
                "--border-color": "#E8E2D9",
                "--text-main": "#2B2118",
                "--text-muted": "#6B5E52",
                "--accent": "#B45F2B",
                "--accent-hover": "#9A4F22",
                "--accent-light": "#FDF1E7",
                "--success-bg": "#E7F4EA",
                "--success-text": "#1E6B34",
                "--danger-bg": "#FBE9E7",
                "--danger-text": "#A12B1F",
            } as React.CSSProperties}
        >
            <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 pb-24 sm:pb-12">
                {/* Header trang */}
                <div className="flex items-center justify-between border-b border-[#E8E2D9] pb-3 sm:pb-4 gap-2">
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-[#2B2118] flex items-center gap-2 truncate">
                            <Coffee className="w-5 h-5 sm:w-6 sm:h-6 text-[#B45F2B] shrink-0" />
                            <span>Lịch sử đơn hàng</span>
                        </h1>
                        <p className="text-[11px] sm:text-xs text-[#6B5E52] mt-0.5 truncate">
                            Theo dõi tiến độ pha chế theo thời gian thực
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl flex items-center gap-1.5 text-xs font-semibold border-[#B45F2B] text-[#B45F2B] bg-transparent hover:bg-[#FDF1E7] hover:text-[#9A4F22] transition-colors shrink-0 px-2.5 sm:px-3 h-8 sm:h-9"
                        onClick={() => loadOrders(false)}
                        disabled={refreshing}
                    >
                        <RefreshCcw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                        <span>Làm mới</span>
                    </Button>
                </div>

                {orders.length === 0 ? (
                    <div className="bg-[#FFFFFF] border border-[#E8E2D9] rounded-xl py-12 sm:py-16 px-4 text-center shadow-xs">
                        <ShoppingBag className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-[#6B5E52]/40" />
                        <p className="font-semibold text-base sm:text-lg text-[#2B2118] mt-3">
                            Bạn chưa có đơn đặt nào
                        </p>
                        <p className="text-xs text-[#6B5E52] mt-1">
                            Hãy thử một ly Cold Brew hoặc Cà phê muối đặc trưng của BrewLite nhé!
                        </p>
                        <Button asChild className="rounded-xl mt-5 bg-[#B45F2B] hover:bg-[#9A4F22] text-white font-semibold h-10 px-5 text-xs sm:text-sm">
                            <Link href="/shop">Khám phá Menu</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3.5 sm:space-y-5">
                        {orders.map((order) => {
                            const statusInfo = STATUS_CONFIG[order.status] || {
                                label: order.status,
                                color: "bg-[#FAF7F2] text-[#6B5E52] border-[#E8E2D9]",
                            };

                            const totalAmount =
                                order.finalAmount ?? order.totalAmount ?? order.total ?? order.amount ?? 0;
                            const discountAmount = Number(order.discountAmount ?? 0);

                            const itemList = order.items ?? order.orderItems ?? [];
                            const isReady = order.status === "READY";
                            const isFailed = order.status === "PAYMENT_FAILED";
                            const isCancelled = order.status === "CANCELLED";

                            return (
                                <div
                                    key={order.id}
                                    id={`order-${order.id}`}
                                    className={`bg-[#FFFFFF] border rounded-xl p-3.5 sm:p-5 shadow-xs transition-all duration-300 scroll-mt-20 overflow-hidden ${
                                        isReady
                                            ? "border-[#B45F2B] ring-2 ring-[#B45F2B]/20 shadow-sm"
                                            : "border-[#E8E2D9]"
                                    }`}
                                >
                                    {/* Phần đầu thẻ đơn: Mã đơn, ngày tháng & Tổng tiền */}
                                    <div className="flex items-start justify-between gap-2 border-b border-[#E8E2D9] pb-3">
                                        <div className="space-y-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                <span className="font-mono font-bold text-base sm:text-lg text-[#2B2118]">
                                                    #{order.orderCode || order.id}
                                                </span>
                                                <span
                                                    className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${statusInfo.color}`}
                                                >
                                                    ● {statusInfo.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[#6B5E52]">
                                                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                                                <span>
                                                    {new Date(order.createdAt).toLocaleString("vi-VN", {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        year: "numeric",
                                                    })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span className="text-[10px] sm:text-xs text-[#6B5E52] block font-medium">
                                                Tổng thanh toán
                                            </span>
                                            <span className="text-base sm:text-lg font-bold text-[#B45F2B]">
                                                {safeFormatVND(totalAmount)}
                                            </span>
                                            {discountAmount > 0 && (
                                                <span className="text-[10px] sm:text-[11px] text-[#1E6B34] block font-medium">
                                                    (-{safeFormatVND(discountAmount)})
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Thông báo sẵn sàng nhận nước (Khi READY) */}
                                    {isReady && (
                                        <div className="mt-3 bg-[#FDF1E7] border border-[#B45F2B]/30 text-[#2B2118] p-3 sm:p-4 rounded-xl flex items-start sm:items-center gap-2.5 sm:gap-3">
                                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#B45F2B] text-white flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                                                <BellRing className="w-4 h-4 sm:w-5 sm:h-5 animate-wiggle" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-xs sm:text-sm font-bold text-[#2B2118]">Nước của bạn đã sẵn sàng!</h4>
                                                <p className="text-[11px] sm:text-xs text-[#6B5E52] mt-0.5 leading-snug">
                                                    Xin vui lòng tới quầy Barista đọc mã{" "}
                                                    <strong className="font-bold text-[#2B2118] underline">#{order.orderCode || order.id}</strong> để nhận nước.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* KHUNG THANH TOÁN THẤT BẠI + NÚT THANH TOÁN LẠI */}
                                    {isFailed && (
                                        <div className="my-3 p-3 sm:p-4 rounded-xl bg-[#FBE9E7] border border-[#FBE9E7] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                                            <div className="flex items-center gap-2 text-[#A12B1F] text-xs font-semibold">
                                                <AlertCircle className="w-4 h-4 shrink-0 text-[#A12B1F]" />
                                                <span>Giao dịch chưa thành công. Bạn có thể thanh toán lại để giữ đơn!</span>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => setRepayOrder(order)}
                                                className="rounded-xl bg-[#B45F2B] hover:bg-[#9A4F22] text-white text-xs font-bold shrink-0 shadow-xs flex items-center justify-center gap-1.5 h-9 w-full sm:w-auto"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                Thanh toán lại
                                            </Button>
                                        </div>
                                    )}

                                    {/* KHUNG ĐƠN ĐÃ HỦY */}
                                    {isCancelled && (
                                        <div className="my-3 py-2.5 px-3 rounded-xl bg-[#FBE9E7] border border-[#FBE9E7] text-[#A12B1F] text-xs font-semibold flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 shrink-0 text-[#A12B1F]" />
                                            <span>Đơn hàng đã bị huỷ. Tồn kho và voucher đã được hoàn lại đầy đủ.</span>
                                        </div>
                                    )}

                                    {/* TIMELINE TIẾN ĐỘ: Tối ưu chống tràn cho màn hình Mobile */}
                                    {!isFailed && !isCancelled && (
                                        <div className="my-3 py-2 overflow-x-auto touch-pan-x -mx-1 px-1 sm:mx-0 sm:px-0 scrollbar-none">
                                            <div className="min-w-[340px] sm:min-w-0">
                                                <OrderTimeline currentStatus={order.status} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Danh sách món đã gọi */}
                                    {itemList.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-[#E8E2D9] space-y-1.5">
                                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#6B5E52] block">
                                                Món đã gọi ({itemList.length})
                                            </span>
                                            <div className="divide-y divide-[#E8E2D9] bg-[#FAF7F2] rounded-xl p-2.5 sm:p-3 border border-[#E8E2D9]">
                                                {itemList.map((item: any, idx: number) => {
                                                    const itemName =
                                                        item.productName || item.product?.name || item.name || "Cà phê BrewLite";
                                                    const itemQty = item.qty || item.quantity || 1;

                                                    // Ưu tiên lineTotal từ DB (đã tính đủ món + size + topping * số lượng)
                                                    const itemTotalPrice =
                                                        item.lineTotal ?? ((item.unitPrice || item.price || 0) * itemQty);

                                                    // Đọc đúng trường toppingName từ bảng OrderItemTopping
                                                    const rawToppings =
                                                        item.toppings || item.orderItemToppings || item.toppingNames || [];
                                                    const toppingList = (Array.isArray(rawToppings) ? rawToppings : [])
                                                        .map((t: any) => {
                                                            if (typeof t === "string") return t.trim();
                                                            return (
                                                                t?.toppingName ||
                                                                t?.name ||
                                                                t?.topping?.name ||
                                                                ""
                                                            )?.trim();
                                                        })
                                                        .filter((t: string) => Boolean(t) && t.length > 0);

                                                    return (
                                                        <div
                                                            key={item.id || idx}
                                                            className="py-2 first:pt-0 last:pb-0 flex items-start justify-between text-xs gap-2"
                                                        >
                                                            <div className="space-y-0.5 min-w-0">
                                                                <div className="font-semibold text-[#2B2118] truncate">
                                                                    {itemName}{" "}
                                                                    {item.sizeName && (
                                                                        <span className="font-normal text-[#6B5E52]">
                                                                            (Size {item.sizeName})
                                                                        </span>
                                                                    )}
                                                                    <span className="font-bold text-[#2B2118] ml-1">
                                                                        x{itemQty}
                                                                    </span>
                                                                </div>
                                                                {toppingList.length > 0 && (
                                                                    <div className="text-[11px] text-[#6B5E52]">
                                                                        + {toppingList.join(", ")}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="font-semibold text-[#2B2118] shrink-0 text-right">
                                                                {safeFormatVND(itemTotalPrice)}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* MODAL VIETQR THANH TOÁN LẠI: Tương thích Mobile */}
            {repayOrder && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-[#FFFFFF] border-t sm:border border-[#E8E2D9] w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl relative space-y-3.5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-[#E8E2D9] pb-2.5">
                            <div>
                                <h3 className="font-bold text-sm sm:text-base text-[#2B2118]">Thanh toán lại đơn hàng</h3>
                                <p className="text-[11px] sm:text-xs text-[#6B5E52]">Đơn #{repayOrder.orderCode || repayOrder.id}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRepayOrder(null)}
                                className="text-[#6B5E52] hover:text-[#2B2118] p-1.5 rounded-lg active:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Mã VietQR */}
                        <div className="text-center py-1 space-y-2.5">
                            <div className="bg-[#FFFFFF] p-2 sm:p-3 rounded-xl border border-[#E8E2D9] inline-block shadow-2xs mx-auto">
                                <img
                                    src={`https://api.vietqr.io/image/970422-0901234567-compact2.jpg?amount=${repayOrder.finalAmount ?? repayOrder.total}&addInfo=BREWLITE%20${repayOrder.orderCode || repayOrder.id}&accountName=BREWLITE%20COFFEE`}
                                    alt="Mã VietQR"
                                    className="w-44 h-44 sm:w-52 sm:h-52 object-contain mx-auto"
                                />
                            </div>
                            <div>
                                <span className="text-[11px] sm:text-xs text-[#6B5E52] block">Số tiền cần thanh toán</span>
                                <span className="text-lg sm:text-xl font-bold text-[#B45F2B]">
                                    {safeFormatVND(repayOrder.finalAmount ?? repayOrder.total)}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-[#E8E2D9]">
                            {/* Nút thanh toán thành công */}
                            <Button
                                onClick={() => handleExecuteRepay(false)}
                                disabled={paying}
                                className="w-full bg-[#1E6B34] hover:bg-[#165227] text-white rounded-xl h-11 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-[#1E6B34]/20 active:scale-[0.98] transition-transform"
                            >
                                {paying ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Đang xử lý...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Xác nhận đã chuyển khoản (Demo)</span>
                                    </>
                                )}
                            </Button>

                            {/* Nút giả lập thất bại */}
                            <Button
                                type="button"
                                onClick={() => handleExecuteRepay(true)}
                                disabled={paying}
                                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl h-10 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-red-600/20 active:scale-[0.98] transition-transform"
                            >
                                <AlertTriangle className="w-4 h-4" />
                                <span>Giả lập tiếp tục thất bại (Demo)</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}