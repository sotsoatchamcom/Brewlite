"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, CheckCheck, Loader2, X, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface NotificationItem {
    id: number;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    orderId?: number;
    data?: { orderId?: number };
}

export default function NotificationBell() {
    const { user, isAuthenticated } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const loadData = useCallback(async () => {
        if (!isAuthenticated || !user?.id) return;

        try {
            const [countRes, listRes] = await Promise.all([
                apiFetch<{ count: number }>(`/notifications/me/unread-count?userId=${user.id}`).catch(() => ({ count: 0 })),
                apiFetch<any>(`/notifications/me?userId=${user.id}`).catch(() => ({ data: [] })),
            ]);

            setUnreadCount(countRes?.count ?? 0);

            const items = Array.isArray(listRes)
                ? listRes
                : Array.isArray(listRes?.data)
                    ? listRes.data
                    : [];

            setNotifications(items);
        } catch {
            // Bỏ qua lỗi ngầm khi mạng chập chờn
        }
    }, [isAuthenticated, user?.id]);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 10000);
        return () => clearInterval(interval);
    }, [loadData]);

    // Đóng dropdown khi click ra ngoài (chỉ áp dụng cho màn hình desktop)
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Khóa cuộn trang nền khi mở thông báo trên màn hình điện thoại (PWA UX)
    useEffect(() => {
        if (open) {
            document.body.classList.add("overflow-hidden", "sm:overflow-auto");
        } else {
            document.body.classList.remove("overflow-hidden", "sm:overflow-auto");
        }
        return () => document.body.classList.remove("overflow-hidden", "sm:overflow-auto");
    }, [open]);

    const markAsRead = async (id: number) => {
        if (!user?.id) return;
        try {
            await apiFetch(`/notifications/me/${id}/read?userId=${user.id}`, { method: "PATCH" });
            setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
            setUnreadCount((c) => Math.max(0, c - 1));
        } catch (err: any) {
            toast.error(err.message || "Không thể cập nhật trạng thái");
        }
    };

    const markAllRead = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            await apiFetch(`/notifications/me/read-all?userId=${user.id}`, { method: "PATCH" });
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);
            toast.success("Đã đánh dấu đã đọc tất cả");
        } catch (err: any) {
            toast.error(err.message || "Lỗi thao tác");
        } finally {
            setLoading(false);
        }
    };

    const handleItemClick = (item: NotificationItem) => {
        if (!item.isRead) {
            markAsRead(item.id);
        }

        const orderId =
            item.orderId ??
            item.data?.orderId ??
            item.title?.match(/#(\d+)/)?.[1] ??
            item.message?.match(/#(\d+)/)?.[1];

        setOpen(false);

        if (!orderId) return;

        const targetAnchor = `order-${orderId}`;

        if (pathname === "/shop/orders") {
            const el = document.getElementById(targetAnchor);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.classList.add("ring-2", "ring-[#B45F2B]", "shadow-lg");
                setTimeout(() => {
                    el.classList.remove("ring-2", "ring-[#B45F2B]", "shadow-lg");
                }, 3000);
            } else {
                window.location.hash = targetAnchor;
            }
        } else {
            router.push(`/shop/orders#${targetAnchor}`);
        }
    };

    if (!isAuthenticated) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Nút Chuông thông báo */}
            <Button
                variant="ghost"
                size="icon"
                className="relative rounded-xl text-[#2B2118] hover:bg-[#FAF7F2] hover:text-[#2B2118] transition-colors w-9 h-9 sm:w-10 sm:h-10"
                aria-label="Thông báo đơn hàng"
                onClick={() => setOpen(!open)}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-[#A12B1F] text-white text-[10px] sm:text-[11px] font-bold h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center ring-2 ring-[#FFFFFF] animate-pulse">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </Button>

            {/* GIAO DIỆN THÔNG BÁO:
                - Mobile: Bottom Sheet trượt từ đáy màn hình lên, full-width (360px–410px), có Backdrop làm mờ, không bao giờ bị cắt xén cạnh trái/phải.
                - Desktop (sm trở lên): Dropdown menu neo góc phải như cũ.
            */}
            {open && (
                <>
                    {/* Backdrop mờ nền khi mở trên mobile */}
                    <div
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs sm:hidden animate-in fade-in duration-200"
                        onClick={() => setOpen(false)}
                    />

                    <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] rounded-t-2xl sm:rounded-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:bottom-auto sm:top-full sm:mt-2 sm:w-96 bg-[#FFFFFF] border border-[#E8E2D9] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
                        {/* Thanh quai kéo (drag handle) chỉ hiển thị trên mobile */}
                        <div className="w-12 h-1.5 bg-[#E8E2D9] rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

                        {/* Tiêu đề & Nút thao tác */}
                        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-[#E8E2D9] bg-[#FAF7F2] shrink-0">
                            <div className="flex items-center gap-2">
                                <BellRing className="w-4 h-4 text-[#B45F2B]" />
                                <span className="font-bold text-sm text-[#2B2118]">Thông báo của bạn</span>
                                {unreadCount > 0 && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#B45F2B]/10 text-[#B45F2B]">
                                        {unreadCount} mới
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={markAllRead}
                                        disabled={loading}
                                        className="text-xs text-[#B45F2B] hover:text-[#9A4F22] hover:underline flex items-center gap-1 font-semibold disabled:opacity-50 transition-colors py-1 px-2 rounded-lg"
                                    >
                                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                                        <span className="hidden xs:inline">Đọc tất cả</span>
                                        <span className="xs:hidden">Đã đọc hết</span>
                                    </button>
                                )}
                                {/* Nút X đóng popup trên Mobile */}
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="p-1 rounded-lg text-[#6B5E52] hover:bg-[#E8E2D9]/40 sm:hidden"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Danh sách thông báo */}
                        <div className="overflow-y-auto divide-y divide-[#E8E2D9] max-h-[60vh] sm:max-h-80 overscroll-contain">
                            {notifications.length === 0 ? (
                                <div className="py-12 px-4 text-center text-xs text-[#6B5E52] space-y-1">
                                    <Bell className="w-8 h-8 mx-auto text-[#6B5E52]/30 mb-2" />
                                    <p className="font-semibold text-[#2B2118]">Bạn chưa có thông báo nào</p>
                                    <p className="text-[11px]">Các cập nhật về đơn hàng sẽ hiển thị ở đây</p>
                                </div>
                            ) : (
                                notifications.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleItemClick(item)}
                                        className={`p-3.5 transition-colors cursor-pointer text-left active:bg-[#FDF1E7] ${
                                            item.isRead ? "bg-[#FFFFFF] opacity-80" : "bg-[#FDF1E7]/40 hover:bg-[#FDF1E7]"
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <p className={`text-xs ${item.isRead ? "font-medium text-[#2B2118]" : "font-bold text-[#2B2118]"}`}>
                                                {item.title}
                                            </p>
                                            {!item.isRead && (
                                                <span className="w-2 h-2 rounded-full bg-[#B45F2B] shrink-0 mt-1 ring-2 ring-[#FDF1E7]" />
                                            )}
                                        </div>
                                        <p className="text-xs text-[#6B5E52] mt-1 leading-relaxed">
                                            {item.message}
                                        </p>
                                        <span className="text-[10px] text-[#6B5E52]/80 mt-1.5 block">
                                            {new Date(item.createdAt).toLocaleTimeString("vi-VN", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                day: "2-digit",
                                                month: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}