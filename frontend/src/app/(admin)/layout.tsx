// src/app/(admin)/layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function AdminLayout({
                                        children,
                                    }: Readonly<{
    children: React.ReactNode;
}>) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            // 1. Chưa đăng nhập -> Đá về trang đăng nhập
            if (!isAuthenticated) {
                router.replace("/login");
                return;
            }

            // 2. Đã đăng nhập nhưng KHÔNG PHẢI ADMIN (là CUSTOMER) -> Đá về trang mua hàng /shop
            if ((user as any)?.role !== "ADMIN") {
                router.replace("/shop");
            }
        }
    }, [user, isAuthenticated, isLoading, router]);

    // Trong khi kiểm tra token hoặc khi user không phải ADMIN:
    // Hiển thị màn hình chờ thay vì render DashboardLayout để chống lộ giao diện
    if (isLoading || !isAuthenticated || (user as any)?.role !== "ADMIN") {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FAF7F2]">
                <Loader2 className="w-8 h-8 animate-spin text-[#B45F2B] mb-2" />
                <p className="text-xs text-[#6B5E52] font-semibold">
                    Đang kiểm tra quyền quản trị hệ thống...
                </p>
            </div>
        );
    }

    // Đúng tài khoản ADMIN thì mới hiển thị giao diện DashboardLayout
    return <DashboardLayout>{children}</DashboardLayout>;
}