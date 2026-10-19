"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Coffee, LogIn, LogOut, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { LOGIN_PATH } from "@/lib/shop";

export default function ShopHeader({ rightSlot }: { rightSlot?: ReactNode }) {
    const { totalQty, hydrated } = useCart();
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const displayName = user?.name || user?.email || "Tài khoản";

    return (
        <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between sticky top-0 z-30">
            <Link href="/shop" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-foreground text-background flex items-center justify-center shadow-sm">
                    <Coffee className="w-4 h-4" />
                </div>
                <span className="font-bold text-base tracking-tight text-foreground">BrewLite</span>
            </Link>

            <div className="flex items-center gap-2">
                {/* Người 2: chuông thông báo (chỉ nên hiện khi isAuthenticated) */}
                {rightSlot}

                <Button asChild variant="outline" className="rounded-xl gap-2" aria-label={`Giỏ hàng, ${totalQty} ly`}>
                    <Link href="/shop/cart">
                        <ShoppingBag className="w-4 h-4" />
                        Giỏ hàng
                        {hydrated && totalQty > 0 && (
                            <span className="min-w-5 h-5 px-1.5 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">
                                {totalQty}
                            </span>
                        )}
                    </Link>
                </Button>

                {isLoading ? (
                    <Skeleton className="h-9 w-28 rounded-xl" />
                ) : isAuthenticated ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="rounded-xl gap-2 px-2" aria-label="Menu tài khoản">
                                <span className="w-7 h-7 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">
                                    {displayName.charAt(0).toUpperCase()}
                                </span>
                                <span className="max-w-32 truncate text-sm font-medium hidden sm:inline">{displayName}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuLabel className="font-normal">
                                <p className="text-sm font-semibold truncate">{displayName}</p>
                                {user?.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
                            </DropdownMenuLabel>
                            {/* mục "Tài khoản" và "Đơn hàng của tôi" */}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={logout} className="gap-2 cursor-pointer">
                                <LogOut className="w-4 h-4" /> Đăng xuất
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <Button asChild className="rounded-xl gap-2">
                        <Link href={LOGIN_PATH}><LogIn className="w-4 h-4" /> Đăng nhập</Link>
                    </Button>
                )}
            </div>
        </header>
    );
}
