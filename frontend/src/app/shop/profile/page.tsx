"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, LogOut, Mail, Phone, ShieldCheck, User, LogIn, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { LOGIN_PATH } from "@/lib/shop";
import { toast } from "sonner";

export default function ProfilePage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Nếu đã xác thực xong mà chưa đăng nhập -> không gọi API vô ích
        if (!authLoading && !isAuthenticated) {
            setLoading(false);
            return;
        }

        if (isAuthenticated) {
            apiFetch<any>("/users/me")
                .then((data) => setProfile(data))
                .catch(() => {
                    toast.error("Phiên đăng nhập đã hết hạn");
                })
                .finally(() => setLoading(false));
        }
    }, [isAuthenticated, authLoading]);

    const handleLogout = () => {
        if (logout) {
            logout();
        } else {
            localStorage.removeItem("token");
            localStorage.removeItem("brewlite_token");
            localStorage.removeItem("brewlite_user");
        }
        toast.info("Đã đăng xuất");
        router.push(LOGIN_PATH);
    };

    if (authLoading || (loading && isAuthenticated)) {
        return (
            <div className="max-w-md mx-auto space-y-4 py-8">
                <Skeleton className="h-44 rounded-3xl" />
                <Skeleton className="h-60 rounded-2xl" />
            </div>
        );
    }

    // 1. Chặn người dùng chưa đăng nhập
    if (!isAuthenticated) {
        return (
            <div className="max-w-md mx-auto py-12">
                <div className="bg-card border border-border rounded-3xl p-8 text-center shadow-xs space-y-5">
                    <div className="w-14 h-14 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-amber-500/5">
                        <Lock className="w-7 h-7" />
                    </div>

                    <div className="space-y-1">
                        <h1 className="text-xl font-bold tracking-tight">Yêu cầu đăng nhập</h1>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Vui lòng đăng nhập tài khoản BrewLite để quản lý thông tin thành viên và theo dõi điểm thưởng Beans.
                        </p>
                    </div>

                    <div className="pt-2">
                        <Button asChild className="w-full rounded-xl py-5 font-semibold bg-amber-900 hover:bg-amber-800 text-white">
                            <Link href={`${LOGIN_PATH}?redirect=/shop/profile`}>
                                <LogIn className="w-4 h-4 mr-2" /> Đăng nhập ngay
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Giao diện khi ĐÃ ĐĂNG NHẬP
    const points = profile?.loyaltyPoints ?? profile?.points ?? 0;

    return (
        <div className="max-w-md mx-auto space-y-5 pb-10">
            {/* Thẻ Loyalty Member Card */}
            <div className="bg-gradient-to-br from-stone-900 via-amber-950 to-stone-900 text-stone-100 rounded-3xl p-6 shadow-md border border-amber-800/30 relative overflow-hidden">
                <div className="flex justify-between items-start">
                    <div>
                        <span className="text-[11px] uppercase font-bold tracking-widest text-amber-400">
                            BrewLite Membership
                        </span>
                        <h2 className="text-xl font-bold mt-1 text-white">{profile?.name || "Khách Hàng"}</h2>
                    </div>
                    <Award className="w-8 h-8 text-amber-400 opacity-80" />
                </div>

                <div className="mt-8 mb-4">
                    <span className="text-xs text-stone-400">Điểm tích lũy</span>
                    <div className="text-4xl font-black text-amber-300 mt-0.5">
                        {points} <span className="text-sm font-normal text-stone-300">Beans</span>
                    </div>
                </div>

                <div className="pt-3 border-t border-amber-900/60 flex justify-between items-center text-xs text-stone-400">
                    <span>Hạng: {points >= 100 ? "Thành viên Vàng" : "Thành viên Bạc"}</span>
                    <span>1 Bean = 1.000đ khi đổi voucher</span>
                </div>
            </div>

            {/* Chi tiết tài khoản */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="font-semibold text-sm border-b border-border pb-3">Thông tin tài khoản</h3>

                <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <User className="w-4 h-4 text-foreground/60" />
                        <div>
                            <span className="text-xs text-muted-foreground block">Họ và tên</span>
                            <span className="font-medium text-foreground">{profile?.name || "Chưa đặt tên"}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 text-muted-foreground">
                        <Mail className="w-4 h-4 text-foreground/60" />
                        <div>
                            <span className="text-xs text-muted-foreground block">Email</span>
                            <span className="font-medium text-foreground">{profile?.email || "—"}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 text-muted-foreground">
                        <Phone className="w-4 h-4 text-foreground/60" />
                        <div>
                            <span className="text-xs text-muted-foreground block">Số điện thoại</span>
                            <span className="font-medium text-foreground">{profile?.phone || "Chưa cập nhật"}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 text-muted-foreground">
                        <ShieldCheck className="w-4 h-4 text-foreground/60" />
                        <div>
                            <span className="text-xs text-muted-foreground block">Vai trò</span>
                            <span className="font-mono text-xs uppercase bg-muted px-2 py-0.5 rounded">
                                {profile?.role || "CUSTOMER"}
                            </span>
                        </div>
                    </div>
                </div>

                <Button
                    variant="outline"
                    className="w-full rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 mt-2"
                    onClick={handleLogout}
                >
                    <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
                </Button>
            </div>
        </div>
    );
}