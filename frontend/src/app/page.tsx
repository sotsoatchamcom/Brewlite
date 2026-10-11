"use client";

import {
    MOCK_ORDERS,
    MOCK_PRODUCTS,
    MOCK_USERS,
    MOCK_CATEGORIES,
    CHART_REVENUE_7DAYS,
    CHART_TOP_PRODUCTS
} from '@/lib/mockData';
import {
    DollarSign, ShoppingBag, Package, Users, TrendingUp, Clock,
    CheckCircle2, XCircle,
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer,
} from 'recharts';

import { STATUS_TO_GROUP, countByFilter, matchesFilter } from '@/lib/orderStatus';

const statusConfig = {
    received: { label: 'Received', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    processing: { label: 'Processing', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    completed: { label: 'Completed', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    canceled: { label: 'Canceled', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
} as const;

export default function DashboardPage() {
    // Tạm thời lấy dữ liệu trực tiếp từ mockData thay vì Context
    const orders = MOCK_ORDERS;
    const products = MOCK_PRODUCTS;
    const users = MOCK_USERS;
    const categories = MOCK_CATEGORIES;

    const totalRevenue = orders.filter((o) => matchesFilter(o.status, 'completed')).reduce((s, o) => s + o.total, 0);
    const activeOrders = countByFilter(orders, 'received') + countByFilter(orders, 'processing');
    const completedOrders = countByFilter(orders, 'completed');
    const canceledOrders = countByFilter(orders, 'canceled');

    const recentOrders = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

    const statCards = [
        { label: 'Total Revenue', value: `${totalRevenue.toLocaleString('vi-VN')}đ`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', change: '+12.5%' },
        { label: 'Active Orders', value: activeOrders, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', change: '+3 today' },
        { label: 'Total Products', value: products.length, icon: Package, color: 'text-violet-600', bg: 'bg-violet-50', change: `${categories.length} categories` },
        { label: 'Total Customers', value: users.filter((u) => u.role === 'CUSTOMER').length, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50', change: '+2 this week' },
        { label: 'Completed Orders', value: completedOrders, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', change: `${Math.round((completedOrders / (orders.length || 1)) * 100)}% rate` },
        { label: 'Canceled Orders', value: canceledOrders, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', change: `${Math.round((canceledOrders / (orders.length || 1)) * 100)}% rate` },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Overview of your coffee shop performance</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow">
                            <div className={`w-9 h-9 ${card.bg} rounded-xl flex items-center justify-center mb-3`}>
                                <Icon className={`w-4.5 h-4.5 ${card.color}`} style={{ width: 18, height: 18 }} />
                            </div>
                            <div className="text-2xl font-bold text-foreground">{card.value}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{card.label}</div>
                            <div className={`text-xs font-medium mt-1 ${card.color}`}>{card.change}</div>
                        </div>
                    );
                })}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Revenue chart */}
                <div className="xl:col-span-2 bg-card border border-border rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="font-semibold text-foreground">Revenue (Last 7 Days)</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">Daily revenue from completed orders</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                            <TrendingUp className="w-4 h-4" />
                            +8.2%
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={CHART_REVENUE_7DAYS}>
                            <CartesianGrid key="cartesiangrid" strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis key="xaxis" dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis key="yaxis" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000)}k`} />
                            <Tooltip key="tooltip"
                                     formatter={(value: any) => [`${Number(value).toLocaleString('vi-VN')}đ`, 'Revenue']}
                                     contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                            />
                            <Area key="area" type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2} fill="#4F46E5" fillOpacity={0.08} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Top products */}
                <div className="bg-card border border-border rounded-2xl p-5">
                    <div className="mb-4">
                        <h2 className="font-semibold text-foreground">Top Products</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">By revenue this month</p>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={CHART_TOP_PRODUCTS} layout="vertical">
                            <CartesianGrid key="cartesiangrid" strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                            <XAxis key="xaxis" type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000)}k`} />
                            <YAxis key="yaxis" type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={90} />
                            <Tooltip key="tooltip"
                                     formatter={(value: any) => [`${Number(value).toLocaleString('vi-VN')}đ`, 'Revenue']}
                                     contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                            />
                            <Bar key="bar" dataKey="revenue" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent orders */}
            <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="font-semibold text-foreground">Recent Orders</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Latest 6 orders across all statuses</p>
                    </div>
                    <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b border-border">
                            <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4">Order ID</th>
                            <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4">User ID</th>
                            <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4">Items</th>
                            <th className="text-right text-xs font-medium text-muted-foreground pb-3 pr-4">Total</th>
                            <th className="text-left text-xs font-medium text-muted-foreground pb-3">Status</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                        {recentOrders.map((order) => {
                            const cfg = statusConfig[STATUS_TO_GROUP[order.status]];
                            return (
                                <tr key={order.id} className="hover:bg-accent/40 transition-colors">
                                    <td className="py-3 pr-4 font-mono text-xs font-medium">#{order.id}</td>
                                    <td className="py-3 pr-4 font-medium">User {order.userId}</td>
                                    <td className="py-3 pr-4 text-muted-foreground text-xs">
                                        {order.items.map((i) => `${i.productName} ×${i.qty}`).join(', ')}
                                    </td>
                                    <td className="py-3 pr-4 text-right font-semibold">{order.total.toLocaleString('vi-VN')}đ</td>
                                    <td className="py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
                                            {cfg.label}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}