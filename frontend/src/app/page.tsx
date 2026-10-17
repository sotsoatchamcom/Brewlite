"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    DollarSign, ShoppingBag, ChefHat, CheckCircle2, XCircle, AlertTriangle,
    TrendingUp, TrendingDown, RotateCw, ArrowRight, Bell, Users,
} from "lucide-react";
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Dữ liệu lấy từ GET /dashboard/summary (không còn dùng mockData)
// ---------------------------------------------------------------------------
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const POLL_MS = 15_000;

type OrderStatus = "PENDING" | "PAID" | "PREPARING" | "READY" | "COMPLETED" | "PAYMENT_FAILED" | "CANCELLED";
type StatusGroupKey = "received" | "processing" | "completed" | "canceled";

interface OrderRow {
    id: number;
    status: OrderStatus;
    total: number;
    createdAt: string;
    customer: string;
    itemsCount: number;
    summary: string;
}

interface DashboardSummary {
    generatedAt: string;
    today: {
        revenue: number;
        orders: number;
        paidOrders: number;
        avgOrderValue: number;
        newCustomers: number;
        revenueChange: number | null;
        ordersChange: number | null;
    };
    week: { revenue: number; orders: number };
    trend: { label: string; revenue: number; orders: number }[];
    totalOrders: number;
    statusDistribution: { key: StatusGroupKey; name: string; value: number }[];
    pipeline: {
        awaitingPayment: number;
        paymentFailed: number;
        paid: number;
        preparing: number;
        ready: number;
        inProgress: number;
    };
    queue: OrderRow[];
    recentOrders: OrderRow[];
    topProducts: { id: number; name: string; revenue: number; quantity: number }[];
    stock: { lowStock: number; outOfStock: number; lowStockProducts: { id: number; name: string; stock: number }[] };
    customers: { total: number; newToday: number };
    notifications: {
        unread: number;
        latest: { id: number; type: string; title: string; message: string; href: string | null; isRead: boolean; createdAt: string }[];
    };
}

const STATUS_BADGE: Record<OrderStatus, { label: string; cls: string }> = {
    PENDING: { label: "Pending payment", cls: "bg-slate-100 text-slate-600 border-slate-200" },
    PAID: { label: "Received", cls: "bg-blue-50 text-blue-600 border-blue-200" },
    PREPARING: { label: "Preparing", cls: "bg-amber-50 text-amber-600 border-amber-200" },
    READY: { label: "Ready", cls: "bg-violet-50 text-violet-600 border-violet-200" },
    COMPLETED: { label: "Completed", cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    PAYMENT_FAILED: { label: "Payment failed", cls: "bg-red-50 text-red-600 border-red-200" },
    CANCELLED: { label: "Canceled", cls: "bg-red-50 text-red-600 border-red-200" },
};

const PIE_COLORS: Record<string, string> = {
    received: "#3B82F6",
    processing: "#F59E0B",
    completed: "#10B981",
    canceled: "#EF4444",
};

const NOTI_DOT: Record<string, string> = {
    ORDER_NEW: "bg-blue-500",
    ORDER_CREATED: "bg-blue-500",
    ORDER_PAID: "bg-emerald-500",
    ORDER_UPDATE: "bg-emerald-500",
    PAYMENT_FAILED: "bg-red-500",
    ORDER_CANCELLED: "bg-slate-400",
    LOW_STOCK: "bg-amber-500",
    OUT_OF_STOCK: "bg-red-500",
};

const TOOLTIP_STYLE = { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 };

const vnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;
const compact = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v);

function timeAgo(iso: string): string {
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (!Number.isFinite(min)) return "";
    if (min < 1) return "Vừa xong";
    if (min < 60) return `${min} phút trước`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} giờ trước`;
    const d = Math.floor(h / 24);
    return d < 7 ? `${d} ngày trước` : new Date(iso).toLocaleDateString("vi-VN");
}

function Card({
    title, subtitle, action, children,
}: { title: string; subtitle?: string; action?: { href: string; label: string }; children: React.ReactNode }) {
    return (
        <div className="bg-card border border-border rounded-2xl p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h2 className="font-semibold text-foreground">{title}</h2>
                    {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
                </div>
                {action && (
                    <Link href={action.href} className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0">
                        {action.label} <ArrowRight className="w-3 h-3" />
                    </Link>
                )}
            </div>
            {children}
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return <div className="py-8 text-center text-xs text-muted-foreground">{text}</div>;
}

function Delta({ value }: { value: number | null }) {
    if (value === null) return <span className="text-emerald-600 font-medium">New today</span>;
    if (value === 0) return <span className="text-muted-foreground">Same as yesterday</span>;
    const up = value > 0;
    const Icon = up ? TrendingUp : TrendingDown;
    return (
        <span className={`inline-flex items-center gap-1 font-medium ${up ? "text-emerald-600" : "text-red-600"}`}>
            <Icon className="w-3 h-3" />
            {up ? "+" : ""}{value}% vs yesterday
        </span>
    );
}

function StatusBadge({ status }: { status: OrderStatus }) {
    const b = STATUS_BADGE[status] ?? STATUS_BADGE.PENDING;
    return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${b.cls}`}>{b.label}</span>;
}

function OrderList({ rows, empty }: { rows: OrderRow[]; empty: string }) {
    if (rows.length === 0) return <Empty text={empty} />;
    return (
        <div className="divide-y divide-border">
            {rows.map((o) => (
                <Link key={o.id} href="/orders/all" className="flex items-center gap-3 py-2.5 hover:bg-accent/40 -mx-2 px-2 rounded-lg transition-colors">
                    <div className="w-10 text-xs font-bold text-muted-foreground">#{o.id}</div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{o.customer}</div>
                        <div className="text-xs text-muted-foreground truncate">
                            {o.itemsCount} cups{o.summary ? ` · ${o.summary}` : ""} · {timeAgo(o.createdAt)}
                        </div>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                        <div className="text-sm font-semibold">{vnd(o.total)}</div>
                        <StatusBadge status={o.status} />
                    </div>
                </Link>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Trang
// ---------------------------------------------------------------------------
export default function DashboardPage() {
    const [data, setData] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await fetch(`${BACKEND_URL}/dashboard/summary`, { cache: "no-store" });
            if (!res.ok) throw new Error(`Máy chủ trả về lỗi ${res.status}`);
            const json = await res.json();
            // Chấp nhận cả dạng bọc { data: {...} } nếu backend có interceptor
            const body = json?.today ? json : json?.data?.today ? json.data : null;
            if (!body) throw new Error(`Phản hồi dashboard không hợp lệ: ${JSON.stringify(json).slice(0, 160)}`);
            setData(body as DashboardSummary);
            setError(null);
        } catch (e: any) {
            setError(e?.message || "Không thể tải dashboard");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const timer = setInterval(() => {
            if (!document.hidden) load(true);
        }, POLL_MS);
        return () => clearInterval(timer);
    }, [load]);

    const todayText = new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

    const header = (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-0.5 capitalize">{todayText}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => load()} className="rounded-xl text-xs gap-2">
                <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Làm mới
            </Button>
        </div>
    );

    if (!data) {
        return (
            <div className="space-y-6">
                {header}
                <div className="bg-card border border-border rounded-2xl py-20 text-center text-sm text-muted-foreground">
                    {error ? (
                        <div className="space-y-3">
                            <p className="text-red-600 px-4">{error}</p>
                            <Button variant="outline" size="sm" onClick={() => load()} className="rounded-xl text-xs">
                                Thử lại
                            </Button>
                        </div>
                    ) : (
                        "Đang tải dashboard..."
                    )}
                </div>
            </div>
        );
    }

    const { today, pipeline, stock } = data;
    const stockAlerts = stock.lowStock + stock.outOfStock;
    const groupValue = (k: StatusGroupKey) => data.statusDistribution.find((g) => g.key === k)?.value ?? 0;
    const completedOrders = groupValue("completed");
    const canceledOrders = groupValue("canceled");
    const rate = (n: number) => (data.totalOrders ? Math.round((n / data.totalOrders) * 100) : 0);
    const statusTotal = data.statusDistribution.reduce((s, x) => s + x.value, 0);
    const hasTrend = data.trend.some((d) => d.revenue > 0);

    // 6 thẻ số liệu (giữ kiểu thẻ của trang cũ, số liệu thật)
    const statCards = [
        {
            label: "Today's Revenue",
            value: vnd(today.revenue),
            sub: <Delta value={today.revenueChange} />,
            icon: DollarSign,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
        },
        {
            label: "Today's Orders",
            value: today.orders,
            sub: <Delta value={today.ordersChange} />,
            icon: ShoppingBag,
            color: "text-blue-600",
            bg: "bg-blue-50",
        },
        {
            label: "In Progress",
            value: pipeline.inProgress,
            sub: <span className="text-muted-foreground">{pipeline.paid} new · {pipeline.preparing} prep · {pipeline.ready} ready</span>,
            icon: ChefHat,
            color: "text-amber-600",
            bg: "bg-amber-50",
        },
        {
            label: "Completed Orders",
            value: completedOrders,
            sub: <span className="text-emerald-600 font-medium">{rate(completedOrders)}% rate</span>,
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
        },
        {
            label: "Canceled Orders",
            value: canceledOrders,
            sub: <span className="text-red-600 font-medium">{rate(canceledOrders)}% rate</span>,
            icon: XCircle,
            color: "text-red-600",
            bg: "bg-red-50",
        },
        {
            label: "Stock Alerts",
            value: stockAlerts,
            sub: <span className="text-muted-foreground">{stock.outOfStock} out · {stock.lowStock} low</span>,
            icon: AlertTriangle,
            color: stockAlerts > 0 ? "text-red-600" : "text-slate-500",
            bg: stockAlerts > 0 ? "bg-red-50" : "bg-slate-100",
        },
    ];

    return (
        <div className={`space-y-6 transition-opacity ${loading ? "opacity-70" : ""}`}>
            {header}

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs px-4 py-2.5">
                    {error} — đang hiển thị dữ liệu lần tải trước.
                </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow">
                            <div className={`w-9 h-9 ${card.bg} rounded-xl flex items-center justify-center mb-3`}>
                                <Icon className={`w-4 h-4 ${card.color}`} style={{ width: 18, height: 18 }} />
                            </div>
                            <div className="text-2xl font-bold text-foreground">{card.value}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{card.label}</div>
                            <div className="text-xs mt-1">{card.sub}</div>
                        </div>
                    );
                })}
            </div>

            {/* Pipeline */}
            <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground mr-1">Order pipeline</span>
                {[
                    { label: "Awaiting payment", n: pipeline.awaitingPayment, cls: "bg-slate-100 text-slate-700" },
                    { label: "Received", n: pipeline.paid, cls: "bg-blue-50 text-blue-700" },
                    { label: "Preparing", n: pipeline.preparing, cls: "bg-amber-50 text-amber-700" },
                    { label: "Ready for pickup", n: pipeline.ready, cls: "bg-violet-50 text-violet-700" },
                ].map((p, i, arr) => (
                    <span key={p.label} className="flex items-center gap-2">
                        <Link href="/orders/all" className={`px-3 py-1.5 rounded-xl text-xs font-medium ${p.cls}`}>
                            {p.label}: <span className="font-bold">{p.n}</span>
                        </Link>
                        {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground/50" />}
                    </span>
                ))}
                {pipeline.paymentFailed > 0 && (
                    <span className="ml-auto px-3 py-1.5 rounded-xl text-xs font-medium bg-red-50 text-red-700">
                        Payment failed: <span className="font-bold">{pipeline.paymentFailed}</span>
                    </span>
                )}
            </div>

            {/* Revenue trend + status */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2">
                    <Card
                        title="Revenue (Last 7 Days)"
                        subtitle={`${vnd(data.week.revenue)} from ${data.week.orders} orders this week`}
                        action={{ href: "/reports", label: "Full report" }}
                    >
                        {!hasTrend ? (
                            <Empty text="No paid orders in the last 7 days" />
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={data.trend}>
                                    <CartesianGrid key="cartesiangrid" strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis key="xaxis" dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                    <YAxis key="yaxis" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={compact} />
                                    <Tooltip
                                        key="tooltip"
                                        formatter={(v: any, _n: any, item: any) => [`${vnd(Number(v))} · ${item?.payload?.orders ?? 0} orders`, "Revenue"]}
                                        contentStyle={TOOLTIP_STYLE}
                                    />
                                    <Area key="area" type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2} fill="#4F46E5" fillOpacity={0.08} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </div>

                <Card title="Orders by Status" subtitle={`${data.totalOrders} orders in total`}>
                    {statusTotal === 0 ? (
                        <Empty text="No orders yet" />
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie key="pie" data={data.statusDistribution} cx="50%" cy="46%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value" nameKey="name">
                                    {data.statusDistribution.map((e) => (
                                        <Cell key={e.key} fill={PIE_COLORS[e.key]} />
                                    ))}
                                </Pie>
                                <Tooltip key="tooltip" formatter={(v: any, name: any) => [v, name]} contentStyle={TOOLTIP_STYLE} />
                                <Legend key="legend" iconType="circle" iconSize={8} formatter={(value: any) => <span style={{ fontSize: 12, color: "#64748b" }}>{value}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </Card>
            </div>

            {/* Top products (bar) + needs attention + stock */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Card title="Top Products" subtitle="By revenue, last 7 days">
                    {data.topProducts.length === 0 ? (
                        <Empty text="No sales this week" />
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={data.topProducts} layout="vertical">
                                <CartesianGrid key="cartesiangrid" strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                                <XAxis key="xaxis" type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={compact} />
                                <YAxis key="yaxis" type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={100} />
                                <Tooltip
                                    key="tooltip"
                                    formatter={(v: any, _n: any, item: any) => [`${vnd(Number(v))} · ${item?.payload?.quantity ?? 0} cups`, "Revenue"]}
                                    contentStyle={TOOLTIP_STYLE}
                                />
                                <Bar key="bar" dataKey="revenue" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                <Card title="Needs Attention" subtitle="Paid orders waiting to be made or picked up (oldest first)" action={{ href: "/orders/all", label: "All orders" }}>
                    <OrderList rows={data.queue} empty="All caught up — no orders waiting" />
                </Card>

                <Card title="Stock Alerts" subtitle={`${stock.outOfStock} out of stock · ${stock.lowStock} running low`} action={{ href: "/products", label: "Products" }}>
                    {stock.lowStockProducts.length === 0 ? (
                        <Empty text="All products are well stocked" />
                    ) : (
                        <div className="divide-y divide-border">
                            {stock.lowStockProducts.map((p) => (
                                <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                                    <span className="text-foreground truncate pr-2">{p.name}</span>
                                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${p.stock <= 0 ? "bg-red-50 text-red-600 border-red-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                                        {p.stock <= 0 ? "Out of stock" : `${p.stock} left`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Recent orders (table) + notifications */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2">
                    <Card title="Recent Orders" subtitle="Latest orders of any status" action={{ href: "/orders/all", label: "View all" }}>
                        {data.recentOrders.length === 0 ? (
                            <Empty text="No orders yet" />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4">Order</th>
                                            <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4">Customer</th>
                                            <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4">Items</th>
                                            <th className="text-right text-xs font-medium text-muted-foreground pb-3 pr-4">Total</th>
                                            <th className="text-left text-xs font-medium text-muted-foreground pb-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {data.recentOrders.map((o) => (
                                            <tr key={o.id} className="hover:bg-accent/40 transition-colors">
                                                <td className="py-3 pr-4 font-mono text-xs font-medium">#{o.id}</td>
                                                <td className="py-3 pr-4 font-medium">{o.customer}</td>
                                                <td className="py-3 pr-4 text-muted-foreground text-xs">
                                                    {o.itemsCount} cups{o.summary ? ` · ${o.summary}` : ""}
                                                </td>
                                                <td className="py-3 pr-4 text-right font-semibold">{vnd(o.total)}</td>
                                                <td className="py-3"><StatusBadge status={o.status} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>

                <Card
                    title="Latest Notifications"
                    subtitle={data.notifications.unread > 0 ? `${data.notifications.unread} unread` : "You're all caught up"}
                    action={{ href: "/notifications", label: "View all" }}
                >
                    {data.notifications.latest.length === 0 ? (
                        <Empty text="No notifications yet" />
                    ) : (
                        <div className="divide-y divide-border">
                            {data.notifications.latest.map((n) => (
                                <Link key={n.id} href={n.href || "/notifications"} className={`flex items-start gap-2.5 py-2.5 hover:bg-accent/40 -mx-2 px-2 rounded-lg transition-colors ${n.isRead ? "opacity-70" : ""}`}>
                                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${NOTI_DOT[n.type] ?? "bg-slate-400"}`} />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-semibold text-foreground truncate">{n.title}</div>
                                        <div className="text-xs text-muted-foreground truncate">{n.message}</div>
                                        <div className="text-[10px] text-muted-foreground/70 mt-0.5">{timeAgo(n.createdAt)}</div>
                                    </div>
                                    {!n.isRead && <Bell className="w-3 h-3 text-blue-600 mt-1 shrink-0" />}
                                </Link>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Customers strip */}
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 text-sm">
                <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
                    <Users className="w-4 h-4 text-violet-600" />
                </div>
                <span className="text-foreground font-semibold">{data.customers.total} customers</span>
                <span className="text-muted-foreground">· {data.customers.newToday} new today · average order today {vnd(today.avgOrderValue)}</span>
                <Link href="/users" className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1">
                    Users <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
        </div>
    );
}
