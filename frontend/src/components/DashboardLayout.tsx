"use client";

import React, { useState, useEffect } from "react";
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
  Clock,
  AlertTriangle,
  CheckCheck,
} from "lucide-react";
import { MOCK_ORDERS, MOCK_PRODUCTS, MOCK_USERS } from "@/lib/mockData";
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

export default function DashboardLayout({
                                          children,
                                        }: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  const router = useRouter();

  // Lấy dữ liệu đăng nhập từ AuthContext
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  const [ordersOpen, setOrdersOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);

  // 1. Tránh lỗi Hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Logic kiểm tra quyền truy cập (Route Guard)
  useEffect(() => {
    if (mounted && !isLoading) {
      if (!isAuthenticated && pathname !== "/login") {
        router.replace("/login");
      } else if (isAuthenticated && pathname === "/login") {
        router.replace("/");
      }
    }
  }, [mounted, isLoading, isAuthenticated, pathname, router]);

  // 3. Màn hình chờ trong lúc kiểm tra token
  if (!mounted || isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
    );
  }

  // 4. Nếu ở trang Login thì hiển thị Form Login
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // 5. Nếu chưa đăng nhập thì chặn không render giao diện Dashboard
  if (!isAuthenticated) {
    return null;
  }

  // Đếm số lượng đơn hàng cho từng mục trong All Orders
  const orderCounts = Object.fromEntries(
      FILTERS.map((f) => [f, countByFilter(MOCK_ORDERS as any, f)])
  ) as Record<OrderFilter, number>;

  const isOrdersPage = pathname.startsWith("/orders");
  const activeOrderFilter = isOrdersPage ? pathToFilter(pathname) : null;

  // Xử lý thông báo (Notifications)
  const getCustomerName = (userId: any) => {
    const u = MOCK_USERS.find((x) => x.id === userId);
    return (u as any)?.name ?? (u as any)?.fullName ?? `User #${userId}`;
  };

  const pendingOrderNotifs = (MOCK_ORDERS as any[])
      .filter(
          (o) =>
              String(o.status).toUpperCase() === "PENDING" ||
              String(o.status).toUpperCase() === "RECEIVED" ||
              String(o.status).toUpperCase() === "PROCESSING"
      )
      .map((o) => ({
        id: `order-${o.id}`,
        type: "order" as const,
        title: `Order #${o.id} needs attention`,
        desc: `${getCustomerName(o.userId)} · ${Number(o.total ?? 0).toLocaleString("vi-VN")}đ`,
        time: String(o.createdAt ?? "").replace("T", " ").substring(0, 16),
        href: "/orders/received",
      }));

  const lowStockNotifs = (MOCK_PRODUCTS as any[])
      .filter((p) => (p.stock ?? 0) <= 10)
      .map((p) => ({
        id: `stock-${p.id}`,
        type: "stock" as const,
        title: p.stock === 0 ? `Out of stock: ${p.name}` : `Low stock: ${p.name}`,
        desc: `Only ${p.stock} items remaining in inventory`,
        time: "Inventory alert",
        href: "/products",
      }));

  const notifications = [...pendingOrderNotifs, ...lowStockNotifs];
  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  function markAllAsRead() {
    setReadIds(notifications.map((n) => n.id));
  }

  function handleNotifClick(id: string, href: string) {
    if (!readIds.includes(id)) {
      setReadIds((prev) => [...prev, id]);
    }
    setNotifOpen(false);
    router.push(href);
  }

  // Xử lý nút Đăng xuất
  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
    router.replace("/login");
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

          {/* Khu vực Thông báo (Dropdown) & Tài khoản Admin */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                  onClick={() => setNotifOpen((prev) => !prev)}
                  className="relative p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
                )}
              </button>

              {/* Bảng xổ xuống khi bấm vào chuông thông báo */}
              {notifOpen && (
                  <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setNotifOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-accent/30">
                        <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        Notifications
                      </span>
                          {unreadCount > 0 && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-50 text-red-600 border border-red-200">
                          {unreadCount} new
                        </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              Mark all read
                            </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-border">
                        {notifications.length === 0 ? (
                            <div className="py-10 text-center text-muted-foreground text-xs">
                              No notifications right now
                            </div>
                        ) : (
                            notifications.map((n) => {
                              const isUnread = !readIds.includes(n.id);
                              return (
                                  <button
                                      key={n.id}
                                      onClick={() => handleNotifClick(n.id, n.href)}
                                      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-accent/50 transition-colors ${
                                          isUnread ? "bg-primary/[0.03]" : "opacity-70"
                                      }`}
                                  >
                                    <div
                                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                            n.type === "order"
                                                ? "bg-blue-50 text-blue-600"
                                                : "bg-amber-50 text-amber-600"
                                        }`}
                                    >
                                      {n.type === "order" ? (
                                          <Clock className="w-4 h-4" />
                                      ) : (
                                          <AlertTriangle className="w-4 h-4" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-semibold text-foreground truncate">
                                          {n.title}
                                        </p>
                                        {isUnread && (
                                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                                        {n.desc}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                                        {n.time}
                                      </p>
                                    </div>
                                  </button>
                              );
                            })
                        )}
                      </div>

                      <div className="p-2.5 border-t border-border bg-accent/20 text-center">
                        <Link
                            href="/orders/all"
                            onClick={() => setNotifOpen(false)}
                            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          View all orders →
                        </Link>
                      </div>
                    </div>
                  </>
              )}
            </div>

            <div className="flex items-center gap-2.5 pl-3 border-l border-border">
              <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <div className="text-xs font-semibold text-foreground">
                  {user?.name || "Admin"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {user?.email || "admin@brewlite.com"}
                </div>
              </div>
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

                {/* Nút bấm đóng/mở All Orders */}
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

                {/* 5 mục con của All Orders */}
                {ordersOpen && (
                    <div className="ml-4 pl-3 border-l border-border space-y-1 pt-0.5">
                      {FILTERS.map((f) => {
                        const cfg = ORDER_SUBMENU_CONFIG[f];
                        const isSubActive = activeOrderFilter === f;
                        const count = orderCounts[f];

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

            {/* Chân Sidebar: Reports & Sign Out */}
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

          {/* Nội dung chính của từng trang */}
          <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">{children}</main>
        </div>
      </div>
  );
}