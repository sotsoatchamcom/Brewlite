"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutGrid,
  List,
  Layers,
  Package,
  Ticket,
  Users,
  ShoppingBag,
  BarChart2,
  LogOut,
  Coffee,
  Search,
  Bell,
  User as UserIcon,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  FILTERS,
  countByFilter,
  pathToFilter,
  filterToPath,
  type OrderFilter,
} from "@/lib/orderStatus";

const ORDER_SUBMENU_CONFIG: Record<
    OrderFilter,
    { label: string; dot: string; badge: string }
> = {
  all: {
    label: "All",
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
  },
  received: {
    label: "Received",
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-600 border-blue-200",
  },
  processing: {
    label: "Processing",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-600 border-amber-200",
  },
  completed: {
    label: "Completed",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  canceled: {
    label: "Canceled",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-600 border-red-200",
  },
};

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function DashboardLayout({
                                          children,
                                        }: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  const router = useRouter();

  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  const [ordersOpen, setOrdersOpen] = useState(true);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false); // Trạng thái mở menu góc trên bên phải

  // Lưu trữ danh sách đơn hàng thực tế từ Backend
  const [realOrders, setRealOrders] = useState<any[]>([]);

  // Gọi API lấy đơn hàng đếm số lượng
  const fetchSidebarOrders = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/orders?page=1&limit=100`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || [];
      setRealOrders(list);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu orders cho Sidebar:", err);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSidebarOrders();
      const interval = setInterval(fetchSidebarOrders, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, pathname, fetchSidebarOrders]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/notifications/unread-count`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const payload =
            data && data.count === undefined && data.data && typeof data.data === "object"
                ? data.data
                : data;
        setUnreadNotifs(Number(payload?.count) || 0);
      } catch {
        /* bỏ qua lỗi mạng */
      }
    };
    fetchUnread();
    const timer = setInterval(fetchUnread, 10000);
    return () => clearInterval(timer);
  }, [isAuthenticated, pathname]);

  // Route Guard kiểm tra trạng thái đăng nhập
  useEffect(() => {
    if (mounted && !isLoading) {
      if (!isAuthenticated && pathname !== "/login") {
        router.replace("/login");
      }
    }
  }, [mounted, isLoading, isAuthenticated, pathname, router]);

  if (!mounted || isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
    );
  }

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  const orderCounts = Object.fromEntries(
      FILTERS.map((f) => [f, countByFilter(realOrders as any, f)])
  ) as Record<OrderFilter, number>;

  const isOrdersPage = pathname.startsWith("/orders");
  const activeOrderFilter = isOrdersPage ? pathToFilter(pathname) : null;

  // Hàm xử lý đăng xuất dứt điểm
  const handleLogout = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    try {
      if (logout) {
        await logout();
      }
    } catch (err) {
      console.error("Lỗi đăng xuất:", err);
    }
    if (typeof window !== "undefined") {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    }
  };

  const mainNavItems = [
    { label: "Dashboard", href: "/", icon: LayoutGrid },
    { label: "Categories", href: "/categories", icon: List },
    { label: "Toppings", href: "/toppings", icon: Layers },
    { label: "Products", href: "/products", icon: Package },
    { label: "Coupons", href: "/coupons", icon: Ticket },
    { label: "Users", href: "/users", icon: Users },
  ];

  return (
      <div className="min-h-screen bg-accent/20 flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-8 flex-1">
            <Link href="/" className="flex items-center gap-2.5 w-52 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-foreground text-background flex items-center justify-center shadow-sm">
                <Coffee className="w-4 h-4" />
              </div>
              <span className="font-bold text-base tracking-tight text-foreground">
              BrewLite
            </span>
            </Link>

            <div className="relative max-w-md w-full hidden md:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                  type="text"
                  placeholder="Search orders, products, customers..."
                  className="w-full h-9 pl-10 pr-4 rounded-xl bg-accent/60 border border-transparent focus:border-border focus:bg-card text-sm outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
                href="/notifications"
                className="relative p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifs > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadNotifs > 99 ? "99+" : unreadNotifs}
              </span>
              )}
            </Link>

            {/* User Profile Dropdown Menu */}
            <div className="relative pl-3 border-l border-border">
              <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-accent transition-colors text-left select-none focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 font-bold text-xs shadow-sm">
                  {user?.name ? (
                      user.name.charAt(0).toUpperCase()
                  ) : (
                      <UserIcon className="w-4 h-4" />
                  )}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span>{user?.name || "Quản Trị Viên"}</span>
                    <ChevronDown
                        className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
                            profileOpen ? "rotate-180" : ""
                        }`}
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground max-w-[150px] truncate">
                    {user?.email || "admin@brewlite.com"}
                  </div>
                </div>
              </button>

              {/* Menu thả xuống */}
              {profileOpen && (
                  <>
                    {/* Backdrop trong suốt click ra ngoài để tắt */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setProfileOpen(false)}
                    />

                    <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-2xl shadow-xl py-2 z-50">
                      <div className="px-4 py-2.5 border-b border-border mb-1">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {user?.name || "Quản Trị Viên"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {user?.email || "admin@brewlite.com"}
                        </p>
                        <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary uppercase">
                      {user?.role || "ADMIN"}
                    </span>
                      </div>

                      <Link
                          href="/users"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                      >
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>Quản lý tài khoản</span>
                      </Link>

                      <button
                          type="button"
                          onClick={(e) => {
                            setProfileOpen(false);
                            handleLogout(e);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </>
              )}
            </div>
          </div>
        </header>

        {/* Body: Sidebar + Main Content */}
        <div className="flex flex-1">
          <aside className="w-60 bg-card border-r border-border flex flex-col justify-between shrink-0 select-none sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="p-3.5 space-y-5">
              {/* Nhóm MAIN */}
              <div className="space-y-1">
                <p className="px-3 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5">
                  MAIN
                </p>
                {mainNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                      <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                              isActive
                                  ? "bg-foreground text-background shadow-sm font-semibold"
                                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                  );
                })}
              </div>

              {/* Nhóm ORDERS */}
              <div className="space-y-1.5">
                <p className="px-3 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5">
                  ORDERS
                </p>

                <button
                    type="button"
                    onClick={() => setOrdersOpen((prev) => !prev)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isOrdersPage
                            ? "bg-accent text-foreground font-semibold"
                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-4 h-4 shrink-0" />
                    <span>All Orders</span>
                  </div>
                  {ordersOpen ? (
                      <ChevronUp className="w-4 h-4 opacity-60" />
                  ) : (
                      <ChevronDown className="w-4 h-4 opacity-60" />
                  )}
                </button>

                {ordersOpen && (
                    <div className="ml-4 pl-3 border-l border-border space-y-1 pt-0.5">
                      {FILTERS.map((f) => {
                        const cfg = ORDER_SUBMENU_CONFIG[f];
                        const isSubActive = activeOrderFilter === f;
                        const count = orderCounts[f] ?? 0;

                        return (
                            <Link
                                key={f}
                                href={filterToPath(f)}
                                className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${
                                    isSubActive
                                        ? "bg-foreground text-background font-semibold shadow-sm"
                                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground font-medium"
                                }`}
                            >
                              <div className="flex items-center gap-2.5">
                          <span
                              className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`}
                          />
                                <span>{cfg.label}</span>
                              </div>
                              <span
                                  className={`min-w-[24px] h-6 px-1.5 rounded-full text-xs font-semibold flex items-center justify-center border ${
                                      isSubActive
                                          ? "bg-white/15 text-white border-transparent"
                                          : cfg.badge
                                  }`}
                              >
                          {count}
                        </span>
                            </Link>
                        );
                      })}
                    </div>
                )}
              </div>
            </div>

            <div className="p-3.5 border-t border-border space-y-1">
              <Link
                  href="/reports"
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      pathname === "/reports"
                          ? "bg-foreground text-background shadow-sm font-semibold"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
              >
                <BarChart2 className="w-4 h-4 shrink-0" />
                <span>Reports</span>
              </Link>
              <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>

          <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">{children}</main>
        </div>
      </div>
  );
}