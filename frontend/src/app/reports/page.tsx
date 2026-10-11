"use client";

import {
    MOCK_ORDERS,
    MOCK_PRODUCTS,
    MOCK_USERS,
    CHART_REVENUE_6MONTHS,
    CHART_TOP_PRODUCTS,
} from '@/lib/mockData';
import { TrendingUp, ShoppingBag, Users, Package } from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { countByFilter, matchesFilter } from '@/lib/orderStatus';

const PIE_COLORS = {
    received: '#3B82F6',
    processing: '#F59E0B',
    completed: '#10B981',
    canceled: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
    received: 'Received',
    processing: 'Processing',
    completed: 'Completed',
    canceled: 'Canceled',
};

export default function ReportsPage() {
    const orders = MOCK_ORDERS;
    const products = MOCK_PRODUCTS;
    const users = MOCK_USERS;

    const statusCounts = (['received', 'processing', 'completed', 'canceled'] as const).map((s) => ({
        name: STATUS_LABELS[s],
        value: countByFilter(orders, s),
        color: PIE_COLORS[s],
    }));

    const completedCount = countByFilter(orders, 'completed');
    const totalRevenue = orders
        .filter((o) => matchesFilter(o.status, 'completed'))
        .reduce((s, o) => s + (o.total ?? 0), 0);

    const avgOrderValue = completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0;
    const completionRate = orders.length > 0 ? Math.round((completedCount / orders.length) * 100) : 0;

    const getRole = (u: any) => String(u.role ?? 'CUSTOMER').toUpperCase();

    const kpis = [
        {
            label: 'Total Revenue',
            value: `${totalRevenue.toLocaleString('vi-VN')}đ`,
            sub: 'From completed orders',
            icon: TrendingUp,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
        },
        {
            label: 'Total Orders',
            value: orders.length,
            sub: 'All time',
            icon: ShoppingBag,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
        },
        {
            label: 'Avg Order Value',
            value: `${avgOrderValue.toLocaleString('vi-VN')}đ`,
            sub: 'Per completed order',
            icon: Package,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
        },
        {
            label: 'Completion Rate',
            value: `${completionRate}%`,
            sub: 'Orders successfully fulfilled',
            icon: Users,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Sales performance and business insights</p>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((k) => {
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
            <div className="bg-card border border-border rounded-2xl p-5">
                <div className="mb-4">
                    <h2 className="font-semibold text-foreground">Monthly Revenue Trend</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Revenue over the past 6 months</p>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={CHART_REVENUE_6MONTHS}>
                        <CartesianGrid key="cartesiangrid" strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis key="xaxis" dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis
                            key="yaxis"
                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                            key="tooltip"
                            formatter={(v: any) => [`${Number(v).toLocaleString('vi-VN')}đ`, 'Revenue']}
                            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                        />
                        <Area key="area" type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2.5} fill="#4F46E5" fillOpacity={0.08} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Two column charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Orders by status pie */}
                <div className="bg-card border border-border rounded-2xl p-5">
                    <div className="mb-4">
                        <h2 className="font-semibold text-foreground">Orders by Status</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Distribution of all-time orders</p>
                    </div>
                    <ResponsiveContainer width="100%" height={230}>
                        <PieChart>
                            <Pie
                                key="pie"
                                data={statusCounts}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={3}
                                dataKey="value"
                            >
                                {statusCounts.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                key="tooltip"
                                formatter={(v: any, name: any) => [v, name]}
                                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                            />
                            <Legend
                                key="legend"
                                iconType="circle"
                                iconSize={8}
                                formatter={(value) => <span style={{ fontSize: 12, color: '#64748b' }}>{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Top products */}
                <div className="bg-card border border-border rounded-2xl p-5">
                    <div className="mb-4">
                        <h2 className="font-semibold text-foreground">Top Products by Revenue</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Best performing menu items</p>
                    </div>
                    <ResponsiveContainer width="100%" height={230}>
                        <BarChart data={CHART_TOP_PRODUCTS}>
                            <CartesianGrid key="cartesiangrid" strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis key="xaxis" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis
                                key="yaxis"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                key="tooltip"
                                formatter={(v: any) => [`${Number(v).toLocaleString('vi-VN')}đ`, 'Revenue']}
                                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                            />
                            <Bar key="bar" dataKey="revenue" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Summary tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-2xl p-5">
                    <h2 className="font-semibold mb-3">Products Summary</h2>
                    <div className="space-y-2">
                        {[
                            { label: 'Total Products', value: products.length },
                            { label: 'Active', value: products.filter((p) => p.isActive).length },
                            { label: 'Inactive', value: products.filter((p) => !p.isActive).length },
                        ].map((r) => (
                            <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                                <span className="text-sm text-muted-foreground">{r.label}</span>
                                <span className="text-sm font-semibold">{r.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5">
                    <h2 className="font-semibold mb-3">Customer Summary</h2>
                    <div className="space-y-2">
                        {[
                            { label: 'Total Users', value: users.length },
                            { label: 'Admins', value: users.filter((u) => getRole(u) === 'ADMIN').length },
                            { label: 'Customers', value: users.filter((u) => getRole(u) === 'CUSTOMER').length },
                        ].map((r) => (
                            <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                                <span className="text-sm text-muted-foreground">{r.label}</span>
                                <span className="text-sm font-semibold">{r.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}