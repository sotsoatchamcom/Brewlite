"use client";

import { Check, Clock, CreditCard, Coffee, BellRing, CheckCircle2 } from "lucide-react";

const STEPS = [
    { key: "PENDING", label: "Chờ duyệt", icon: Clock },
    { key: "PAID", label: "Đã thanh toán", icon: CreditCard },
    { key: "PREPARING", label: "Đang pha chế", icon: Coffee },
    { key: "READY", label: "Mời nhận nước", icon: BellRing },
    { key: "COMPLETED", label: "Hoàn tất", icon: CheckCircle2 },
];

export default function OrderTimeline({ currentStatus }: { currentStatus: string }) {
    // Chuẩn hóa trạng thái nếu backend trả về BREWING
    const normalizedStatus = currentStatus === "BREWING" ? "PREPARING" : currentStatus;
    const activeIdx = STEPS.findIndex((s) => s.key === normalizedStatus);
    const validIdx = activeIdx === -1 ? 0 : activeIdx;

    return (
        <div className="w-full py-4">
            <div className="relative flex items-center justify-between">
                {/* 1. Đường line nền mờ (Nối từ tâm nút 1 đến tâm nút 5: 36px / 2 = 18px) */}
                <div className="absolute left-[18px] right-[18px] top-[18px] -translate-y-1/2 h-1 bg-stone-200 dark:bg-stone-800 z-0" />

                {/* 2. Đường line tiến trình màu Amber (Chạy phủ kín 100% khoảng cách giữa các nút) */}
                <div
                    className="absolute left-[18px] top-[18px] -translate-y-1/2 h-1 bg-amber-600 dark:bg-amber-500 transition-all duration-500 z-0"
                    style={{
                        width: `calc((100% - 36px) * (${validIdx} / ${STEPS.length - 1}))`,
                    }}
                />

                {STEPS.map((step, idx) => {
                    const StepIcon = step.icon;
                    const isDone = idx < validIdx;
                    const isCurrent = idx === validIdx;

                    return (
                        <div key={step.key} className="relative z-10 flex flex-col items-center">
                            <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    isCurrent
                                        ? "bg-amber-900 text-white shadow-lg shadow-amber-900/30 ring-4 ring-amber-100 dark:ring-amber-950 scale-110"
                                        : isDone
                                            ? "bg-amber-600 text-white"
                                            : "bg-stone-100 dark:bg-stone-800 text-stone-400 border border-stone-200 dark:border-stone-700"
                                }`}
                            >
                                {isDone ? (
                                    <Check className="w-4 h-4 stroke-[2.5]" />
                                ) : (
                                    <StepIcon className={`w-4 h-4 ${isCurrent ? "animate-bounce" : ""}`} />
                                )}
                            </div>
                            <span
                                className={`text-[11px] mt-2 font-medium text-center whitespace-nowrap transition-colors ${
                                    isCurrent
                                        ? "font-bold text-amber-900 dark:text-amber-300"
                                        : isDone
                                            ? "text-stone-700 dark:text-stone-300"
                                            : "text-stone-400 dark:text-stone-500"
                                }`}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}