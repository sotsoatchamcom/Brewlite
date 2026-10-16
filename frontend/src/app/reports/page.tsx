"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    TrendingUp, ShoppingBag, Users, Package, RotateCw, AlertTriangle, CreditCard, Crown,
} from "lucide-react";
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Kiểu dữ liệu trả về từ GET /reports/summary
// ---------------------------------------------------------------------------
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type RangeKey = "7d" | "30d" | "6m" | "12m" | "all";

interface ReportSummary {
    range: RangeKey;
    granularity: "day" | "month";
    generatedAt: string;
    kpis: {
        revenue: number;
        totalOrders: number;
        paidOrders: number;
        awaitingPayment: number;
        avgOrderValue: number;
        completionRate: number;
        cancelRate: number;
        discountTotal: number;
    };
    trend: { label: string; revenue: number; orders: number }[];
    statusDistribution: { key: "received" | "processing" | "completed" | "canceled"; name: string; value: number }[];
    topProducts: { id: number; name: string; revenue: number; quantity: number }[];
    topCustomers: { id: number; name: string; orders: number; spent: number }[];
    payments: {
        total: number;
        success: number;
        failed: number;
        successRate: number;
        byMethod: { method: string; count: number; amount: number }[];
    };
    products: {
        total: number;
        active: number;
        inactive: number;
        lowStock: number;
        outOfStock: number;
        lowStockProducts: { id: number; name: string; stock: number }[];
    };
    customers: { total: number; admins: number; customers: number; newInRange: number; loyaltyPoints: number };
}

const RANGES: { value: RangeKey; label: string; text: string }[] = [
    { value: "7d", label: "7 days", text: "the last 7 days" },
    { value: "30d", label: "30 days", text: "the last 30 days" },
    { value: "6m", label: "6 months", text: "the last 6 months" },
    { value: "12m", label: "12 months", text: "the last 12 months" },
    { value: "all", label: "All time", text: "all time" },
];

const PIE_COLORS: Record<string, string> = {
    received: "#3B82F6",
    processing: "#F59E0B",
    completed: "#10B981",
    canceled: "#EF4444",
};

const METHOD_LABELS: Record<string, string> = { WALLET: "Wallet", CARD: "Card" };

const vnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;
const compact = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v);
const truncate = (s: string, n = 16) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const tooltipStyle = { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 };

function TrendTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
        <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs shadow-md">
            <div className="font-semibold text-foreground mb-1">{label}</div>
            <div className="text-muted-foreground">Revenue: <span className="font-semibold text-foreground">{vnd(p.revenue)}</span></div>
            <div className="text-muted-foreground">Paid orders: <span className="font-semibold text-foreground">{p.orders}</span></div>
        </div>
    );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <div className="bg-card border border-border rounded-2xl p-5">
            <div className="mb-4">
                <h2 className="font-semibold text-foreground">{title}</h2>
                {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            {children}
        </div>
    );
}

function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
    return (
        <div className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className={`text-sm font-semibold ${tone ?? ""}`}>{value}</span>
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return <div className="py-10 text-center text-xs text-muted-foreground">{text}</div>;
}

// ---------------------------------------------------------------------------
// Trang
// ---------------------------------------------------------------------------
export default function ReportsPage() {
    const [range, setRange] = useState<RangeKey>("6m");
    const [data, setData] = useState<ReportSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`${BACKEND_URL}/reports/summary?range=${range}`, { cache: "no-store" });
            if (!res.ok) throw new Error(`Máy chủ trả về lỗi ${res.status}`);
            const json = await res.json();
            // Chấp nhận cả dạng bọc { data: {...} } / { result: {...} } nếu backend có interceptor
            const body = json?.kpis ? json : json?.data?.kpis ? json.data : json?.result?.kpis ? json.result : null;
            if (!body) {
                throw new Error(`Phản hồi báo cáo không hợp lệ: ${JSON.stringify(json).slice(0, 160)}`);
            }
            setData(body as ReportSummary);
        } catch (e: any) {
            setError(e?.message || "Không thể tải báo cáo");
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => {
        load();
    }, [load]);

    const rangeText = RANGES.find((r) => r.value === range)?.text ?? "";

    const header = (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Sales performance and business insights</p>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex bg-accent/70 rounded-xl p-1 gap-1">
                    {RANGES.map((r) => (
                        <button
                            key={r.value}
                            onClick={() => setRange(r.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                                range === r.value
                                    ? "bg-card shadow-sm text-foreground font-semibold"
                                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                            }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
                <Button variant="outline" size="sm" onClick={load} className="rounded-xl text-xs gap-2">
                    <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    Làm mới
                </Button>
            </div>
        </div>
    );

    if (!data) {
        return (
            <div className="space-y-6">
                {header}
                <div className="bg-card border border-border rounded-2xl py-20 text-center text-sm text-muted-foreground">
                    {error ? (
                        <div className="space-y-3">
                            <p className="text-red-600">{error}</p>
                            <Button variant="outline" size="sm" onClick={load} className="rounded-xl text-xs">
                                Thử lại
                            </Button>
                        </div>
                    ) : (
                        "Đang tải báo cáo..."
                    )}
                </div>
            </div>
        );
    }

    const { kpis, trend, statusDistribution, topProducts, topCustomers, payments, products, customers } = data;
    const statusTotal = statusDistribution.reduce((s, x) => s + x.value, 0);

    const kpiCards = [
        {
            label: "Total Revenue",
            value: vnd(kpis.revenue),
            sub: `From ${kpis.paidOrders} paid orders`,
            icon: TrendingUp,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
        },
        {
            label: "Total Orders",
            value: kpis.totalOrders,
            sub: kpis.awaitingPayment > 0 ? `+${kpis.awaitingPayment} awaiting payment` : `In ${rangeText}`,
            icon: ShoppingBag,
            color: "text-blue-600",
            bg: "bg-blue-50",
        },
        {
            label: "Avg Order Value",
            value: vnd(kpis.avgOrderValue),
            sub: "Per paid order",
            icon: Package,
            color: "text-violet-600",
            bg: "bg-violet-50",
        },
        {
            label: "Completion Rate",
            value: `${kpis.completionRate}%`,
            sub: `${kpis.cancelRate}% canceled`,
            icon: Users,
            color: "text-amber-600",
            bg: "bg-amber-50",
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

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map((k) => {
                    const Icon = k.icon;
                    return (
                        <div key={k.label} className="bg-card border border-border rounded-2xl p-5">
                            <div className={`w-10 h-10 ${k.bg} rounded-xl flex items-center justify-center mb-3`}>
                                <Icon className={`w-5 h-5 ${k.color}`} />
                            </div>
                            <div className="text-2xl font-bold text-foreground">{k.value}</div>
                            <div className="text-sm font-medium text-foreground mt-0.5">{k.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{k.sub}</div>
                        </div>
                    );
                })}
            </div>

            {/* Revenue trend */}
            <Card
                title={data.granularity === "day" ? "Daily Revenue Trend" : "Monthly Revenue Trend"}
                subtitle={`Revenue from paid orders over ${rangeText}`}
            >
                {kpis.paidOrders === 0 ? (
                    <Empty text="No paid orders in this period" />
                ) : (
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={trend}>
                            <CartesianGrid key="cartesiangrid" strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis key="xaxis" dataKey="label" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} minTickGap={16} />
                            <YAxis key="yaxis" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={compact} />
                            <Tooltip key="tooltip" content={<TrendTooltip />} />
                            <Area key="area" type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2.5} fill="#4F46E5" fillOpacity={0.08} />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </Card>

            {/* Status pie + top products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title="Orders by Status" subtitle={`Distribution of orders in ${rangeText}`}>
                    {statusTotal === 0 ? (
                        <Empty text="No orders in this period" />
                    ) : (
                        <ResponsiveContainer width="100%" height={230}>
                            <PieChart>
                                <Pie key="pie" data={statusDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" nameKey="name">
                                    {statusDistribution.map((e) => (
                                        <Cell key={e.key} fill={PIE_COLORS[e.key]} />
                                    ))}
                                </Pie>
                                <Tooltip key="tooltip" formatter={(v: any, name: any) => [v, name]} contentStyle={tooltipStyle} />
                                <Legend
                                    key="legend"
                                    iconType="circle"
                                    iconSize={8}
                                    formatter={(value) => <span style={{ fontSize: 12, color: "#64748b" }}>{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                <Card title="Top Products by Revenue" subtitle="Best performing menu items">
                    {topProducts.length === 0 ? (
                        <Empty text="No sales in this period" />
                    ) : (
                        <ResponsiveContainer width="100%" height={230}>
                            <BarChart data={topProducts} layout="vertical" margin={{ left: 8, right: 8 }}>
                                <CartesianGrid key="cartesiangrid" strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                                <XAxis key="xaxis" type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={compact} />
                                <YAxis key="yaxis" type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => truncate(String(v))} />
                                <Tooltip
                                    key="tooltip"
                                    formatter={(v: any, _n: any, item: any) => [`${vnd(Number(v))} · ${item?.payload?.quantity ?? 0} cups`, "Revenue"]}
                                    contentStyle={tooltipStyle}
                                />
                                <Bar key="bar" dataKey="revenue" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>
            </div>

            {/* Payments + top customers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title="Payments" subtitle={`Transactions in ${rangeText}`}>
                    {payments.total === 0 ? (
                        <Empty text="No payments in this period" />
                    ) : (
                        <>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                    <CreditCard className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-foreground leading-none">{payments.successRate}%</div>
                                    <div className="text-xs text-muted-foreground mt-1">Payment success rate</div>
                                </div>
                            </div>
                            <Row label="Successful" value={payments.success} tone="text-emerald-600" />
                            <Row label="Failed" value={payments.failed} tone={payments.failed > 0 ? "text-red-600" : ""} />
                            {payments.byMethod.map((m) => (
                                <Row key={m.method} label={`${METHOD_LABELS[m.method] ?? m.method} (${m.count})`} value={vnd(m.amount)} />
                            ))}
                            <Row label="Discounts given" value={vnd(kpis.discountTotal)} />
                        </>
                    )}
                </Card>

                <Card title="Top Customers" subtitle="Highest spenders from paid orders">
                    {topCustomers.length === 0 ? (
                        <Empty text="No customers with paid orders yet" />
                    ) : (
                        <div className="space-y-1">
                            {topCustomers.map((c, i) => (
                                <div key={c.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-amber-50 text-amber-600" : "bg-accent text-muted-foreground"}`}>
                                        {i === 0 ? <Crown className="w-3.5 h-3.5" /> : i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-foreground truncate">{c.name}</div>
                                        <div className="text-xs text-muted-foreground">{c.orders} orders</div>
                                    </div>
                                    <div className="text-sm font-semibold">{vnd(c.spent)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Summary tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title="Products Summary">
                    <Row label="Total Products" value={products.total} />
                    <Row label="Active" value={products.active} />
                    <Row label="Inactive" value={products.inactive} />
                    <Row label="Low stock" value={products.lowStock} tone={products.lowStock > 0 ? "text-amber-600" : ""} />
                    <Row label="Out of stock" value={products.outOfStock} tone={products.outOfStock > 0 ? "text-red-600" : ""} />
                    {products.lowStockProducts.length > 0 && (
                        <div className="mt-4 rounded-xl bg-amber-50/60 border border-amber-100 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Need restocking
                                </span>
                                <Link href="/products" className="text-xs text-amber-700 hover:underline">View products →</Link>
                            </div>
                            {products.lowStockProducts.map((p) => (
                                <div key={p.id} className="flex justify-between text-xs py-0.5">
                                    <span className="text-foreground truncate pr-2">{p.name}</span>
                                    <span className={`font-semibold shrink-0 ${p.stock <= 0 ? "text-red-600" : "text-amber-700"}`}>
                                        {p.stock <= 0 ? "Out of stock" : `${p.stock} left`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card title="Customer Summary">
                    <Row label="Total Users" value={customers.total} />
                    <Row label="Admins" value={customers.admins} />
                    <Row label="Customers" value={customers.customers} />
                    <Row label={`New customers (${RANGES.find((r) => r.value === range)?.label})`} value={customers.newInRange} />
                    <Row label="Loyalty points issued" value={customers.loyaltyPoints.toLocaleString("vi-VN")} />
                </Card>
            </div>
        </div>
    );
}
