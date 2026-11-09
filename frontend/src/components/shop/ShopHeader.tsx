"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
    Coffee,
    LayoutDashboard,
    LogIn,
    LogOut,
    ShoppingBag,
    Clock,
    KeyRound,
    User,
    X,
    Loader2,
    CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { LOGIN_PATH, releaseCartOwner } from "@/lib/shop";
import NotificationBell from "@/components/shop/NotificationBell";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface ShopHeaderProps {
    rightSlot?: ReactNode;
}

export default function ShopHeader({ rightSlot }: ShopHeaderProps = {}) {
    const { totalQty, hydrated, clearCart } = useCart();
    const { user, isAuthenticated, isLoading, logout } = useAuth();

    const [showChangePassword, setShowChangePassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogout = () => {
        logout();
        clearCart();
        releaseCartOwner();
    };

    const handleChangePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentPassword) {
            toast.error("Vui lòng nhập mật khẩu cũ");
            return;
        }
        if (newPassword.length < 8) {
            toast.error("Mật khẩu mới phải từ 8 ký tự trở lên");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Xác nhận mật khẩu mới không khớp");
            return;
        }

        setIsSubmitting(true);
        try {
            await apiFetch("/auth/change-password", {
                method: "PATCH",
                body: JSON.stringify({
                    oldPassword: currentPassword,
                    newPassword: newPassword,
                    confirmNewPassword: confirmPassword,
                }),
            });

            toast.success("Đổi mật khẩu thành công!");
            setShowChangePassword(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            toast.error(err.message || "Đổi mật khẩu thất bại");
        } finally {
            setIsSubmitting(false);
        }
    };

    const displayName = user?.name || user?.email || "Tài khoản";
    const isAdmin = (user as any)?.role === "ADMIN";

    return (
        <>
            {/* Header: px-3 trên mobile, px-6 trên desktop */}
            <header className="h-14 sm:h-16 bg-[#FFFFFF] border-b border-[#E8E2D9] px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
                {/* Logo thương hiệu */}
                <Link href="/shop" className="flex items-center gap-2 group shrink-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#2B2118] text-[#FAF7F2] flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                        <Coffee className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FAF7F2]" />
                    </div>
                    <span className="font-bold text-sm sm:text-base tracking-tight text-[#2B2118]">BrewLite</span>
                </Link>

                {/* Danh mục nút chức năng bên phải */}
                <div className="flex items-center gap-1 sm:gap-2">
                    {rightSlot}

                    {/* 1. Chuông thông báo */}
                    {isAuthenticated && <NotificationBell />}

                    {/* 2. Lịch sử đơn hàng */}
                    {isAuthenticated && (
                        <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="rounded-xl text-[#2B2118] hover:bg-[#FAF7F2] transition-colors w-9 h-9 sm:w-10 sm:h-10"
                            aria-label="Lịch sử đơn hàng"
                            title="Lịch sử đơn hàng"
                        >
                            <Link href="/shop/orders">
                                <Clock className="w-5 h-5 text-[#2B2118]" />
                            </Link>
                        </Button>
                    )}

                    {/* 3. Giỏ hàng */}
                    <Button
                        asChild
                        variant="outline"
                        className="rounded-xl gap-1.5 sm:gap-2 border-[#E8E2D9] text-[#2B2118] hover:bg-[#FAF7F2] transition-colors px-2.5 sm:px-3 h-9 sm:h-10"
                        aria-label={`Giỏ hàng, ${totalQty} ly`}
                    >
                        <Link href="/shop/cart">
                            <ShoppingBag className="w-4 h-4 text-[#B45F2B]" />
                            <span className="hidden sm:inline font-semibold">Giỏ hàng</span>
                            {hydrated && totalQty > 0 && (
                                <span className="min-w-4.5 h-4.5 sm:min-w-5 sm:h-5 px-1 rounded-full bg-[#B45F2B] text-white text-[10px] sm:text-xs font-bold flex items-center justify-center">
                                    {totalQty}
                                </span>
                            )}
                        </Link>
                    </Button>

                    {/* 4. Menu tài khoản */}
                    {isLoading ? (
                        <Skeleton className="h-8 w-8 sm:h-9 sm:w-28 rounded-xl bg-[#E8E2D9]/60" />
                    ) : isAuthenticated ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="rounded-xl gap-1.5 px-1 sm:px-2 hover:bg-[#FAF7F2] transition-colors h-9 sm:h-10"
                                    aria-label="Menu tài khoản"
                                >
                                    <span className="w-7 h-7 rounded-full bg-[#2B2118] text-white text-xs font-bold flex items-center justify-center shrink-0">
                                        {displayName.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="max-w-28 truncate text-sm font-semibold text-[#2B2118] hidden sm:inline">
                                        {displayName}
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl w-56 bg-[#FFFFFF] border-[#E8E2D9] shadow-md z-50">
                                <DropdownMenuLabel className="font-normal">
                                    <p className="text-sm font-semibold text-[#2B2118] truncate">{displayName}</p>
                                    {user?.email && <p className="text-xs text-[#6B5E52] truncate">{user.email}</p>}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-[#E8E2D9]" />

                                {isAdmin && (
                                    <DropdownMenuItem asChild className="gap-2 cursor-pointer font-semibold text-[#B45F2B] hover:bg-[#FDF1E7]">
                                        <Link href="/orders">
                                            <LayoutDashboard className="w-4 h-4" /> Trang Quản Trị
                                        </Link>
                                    </DropdownMenuItem>
                                )}

                                <DropdownMenuItem asChild className="gap-2 cursor-pointer text-[#2B2118] hover:bg-[#FAF7F2]">
                                    <Link href="/shop/orders">
                                        <Clock className="w-4 h-4 text-[#6B5E52]" /> Lịch sử đơn hàng
                                    </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem asChild className="gap-2 cursor-pointer text-[#2B2118] hover:bg-[#FAF7F2]">
                                    <Link href="/shop/profile">
                                        <User className="w-4 h-4 text-[#6B5E52]" /> Thông tin & Điểm tích lũy
                                    </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                    onClick={() => setShowChangePassword(true)}
                                    className="gap-2 cursor-pointer text-[#2B2118] hover:bg-[#FAF7F2]"
                                >
                                    <KeyRound className="w-4 h-4 text-[#6B5E52]" /> Đổi mật khẩu
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="bg-[#E8E2D9]" />
                                <DropdownMenuItem
                                    onClick={handleLogout}
                                    className="gap-2 cursor-pointer text-[#A12B1F] focus:text-[#A12B1F] hover:bg-[#FBE9E7]"
                                >
                                    <LogOut className="w-4 h-4" /> Đăng xuất
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button asChild className="rounded-xl gap-1.5 bg-[#B45F2B] hover:bg-[#9A4F22] text-white font-semibold shadow-xs text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3">
                            <Link href={LOGIN_PATH}><LogIn className="w-3.5 h-3.5" /> <span>Đăng nhập</span></Link>
                        </Button>
                    )}
                </div>
            </header>

            {/* MODAL ĐỔI MẬT KHẨU (Tương thích Mobile) */}
            {showChangePassword && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-[#FFFFFF] border border-[#E8E2D9] w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-xl relative space-y-4 sm:space-y-5">
                        <div className="flex items-center justify-between border-b border-[#E8E2D9] pb-3">
                            <div className="flex items-center gap-2">
                                <KeyRound className="w-5 h-5 text-[#B45F2B]" />
                                <h3 className="font-bold text-sm sm:text-base text-[#2B2118]">Đổi mật khẩu tài khoản</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowChangePassword(false)}
                                className="text-[#6B5E52] hover:text-[#2B2118] p-1 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleChangePasswordSubmit} className="space-y-3 sm:space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-[#2B2118]">Mật khẩu hiện tại</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full bg-[#FFFFFF] border border-[#E8E2D9] rounded-xl px-3 py-2 text-sm text-[#2B2118] placeholder:text-[#6B5E52]/50 focus:outline-none focus:border-[#B45F2B] focus:ring-2 focus:ring-[#B45F2B]/20 transition-all"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-[#2B2118]">Mật khẩu mới</label>
                                <input
                                    type="password"
                                    placeholder="Tối thiểu 8 ký tự"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-[#FFFFFF] border border-[#E8E2D9] rounded-xl px-3 py-2 text-sm text-[#2B2118] placeholder:text-[#6B5E52]/50 focus:outline-none focus:border-[#B45F2B] focus:ring-2 focus:ring-[#B45F2B]/20 transition-all"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-[#2B2118]">Xác nhận mật khẩu mới</label>
                                <input
                                    type="password"
                                    placeholder="Nhập lại mật khẩu mới"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-[#FFFFFF] border border-[#E8E2D9] rounded-xl px-3 py-2 text-sm text-[#2B2118] placeholder:text-[#6B5E52]/50 focus:outline-none focus:border-[#B45F2B] focus:ring-2 focus:ring-[#B45F2B]/20 transition-all"
                                    required
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 rounded-xl border-[#E8E2D9] text-[#2B2118] hover:bg-[#FAF7F2] h-10 text-xs sm:text-sm"
                                    onClick={() => setShowChangePassword(false)}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 rounded-xl bg-[#B45F2B] hover:bg-[#9A4F22] text-white font-semibold h-10 text-xs sm:text-sm"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-1.5">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4" /> Cập nhật
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}