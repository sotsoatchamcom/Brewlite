"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Coffee, LayoutDashboard, LogIn, LogOut, ShoppingBag } from "lucide-react";
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

export default function ShopHeader({ rightSlot }: { rightSlot?: ReactNode }) {
    const { totalQty, hydrated, clearCart } = useCart();
    const { user, isAuthenticated, isLoading, logout } = useAuth();

    const handleLogout = () => {
        logout();
        clearCart();
        releaseCartOwner();
    };

    const displayName = user?.name || user?.email || "Tài khoản";
    const isAdmin = (user as any)?.role === "ADMIN";

    return (
        <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
            <Link href="/shop" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-xl bg-foreground text-background flex items-center justify-center shadow-sm transition-transform group-hover:scale-105">
                    <Coffee className="w-4 h-4" />
                </div>
                <span className="font-bold text-base tracking-tight text-foreground">BrewLite</span>
            </Link>

            <div className="flex items-center gap-2">
                {rightSlot}

                <Button asChild variant="outline" className="rounded-xl gap-2" aria-label={`Giỏ hàng, ${totalQty} ly`}>
                    <Link href="/shop/cart">
                        <ShoppingBag className="w-4 h-4" />
                        <span className="hidden sm:inline">Giỏ hàng</span>
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
                            <Button variant="ghost" className="rounded-xl gap-2 px-2 hover:bg-accent" aria-label="Menu tài khoản">
                                <span className="w-7 h-7 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">
                                    {displayName.charAt(0).toUpperCase()}
                                </span>
                                <span className="max-w-32 truncate text-sm font-medium hidden sm:inline">{displayName}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl w-52">
                            <DropdownMenuLabel className="font-normal">
                                <p className="text-sm font-semibold truncate">{displayName}</p>
                                {user?.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            {/* Phím tắt truy cập nhanh cho Quản trị viên */}
                            {isAdmin && (
                                <DropdownMenuItem asChild className="gap-2 cursor-pointer font-medium">
                                    <Link href="/orders">
                                        <LayoutDashboard className="w-4 h-4 text-primary" /> Trang Quản Trị
                                    </Link>
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                                <Link href="/shop/cart">
                                    <ShoppingBag className="w-4 h-4" /> Giỏ hàng ({totalQty})
                                </Link>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
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