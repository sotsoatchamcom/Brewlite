"use client";

import { useState, useEffect } from 'react';
import { Search, ShoppingBag, ChevronDown, RotateCw } from 'lucide-react';
import type { Order, OrderStatus } from '@/lib/types';
import { usePathname, useRouter } from 'next/navigation';
import {
    GROUPS, FILTERS, ORDER_STATUSES, STATUS_TO_GROUP,
    countByFilter, matchesFilter, pathToFilter, filterToPath,
    type OrderFilter, type OrderStatusGroup,
} from '@/lib/orderStatus';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
// 1. Dùng apiFetch có sẵn của dự án để tự động đính kèm Token Admin
import { apiFetch } from '@/lib/api';

const STATUS_CONFIG: Record<OrderFilter, { label: string; color: string; bg: string; border: string; dot: string }> = {
    all: { label: 'All', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', dot: 'bg-slate-400' },
    received: { label: 'Received', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
    processing: { label: 'Processing', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
    completed: { label: 'Completed', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    canceled: { label: 'Canceled', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' },
};

const statusStyle = (status: OrderStatus) => {
    const group = STATUS_TO_GROUP[status] ?? 'received';
    return STATUS_CONFIG[group];
};

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const pathname = usePathname();
    const router = useRouter();

    const statusFilter = pathToFilter(pathname || '/orders/all');
    const setStatusFilter = (f: OrderFilter) => {
        router.push(filterToPath(f));
    };

    const [search, setSearch] = useState('');
    const [detailOrder, setDetailOrder] = useState<Order | null>(null);
    const [openDropdown, setOpenDropdown] = useState<number | string | null>(null);

    // 1. Tải danh sách đơn hàng có token Admin
    const fetchOrders = async () => {
        try {
            setLoading(true);
            const result = await apiFetch<any>('/orders?page=1&limit=100');
            const rawOrders = Array.isArray(result) ? result : (result.data || []);

            const normalizedOrders = rawOrders.map((o: any) => ({
                ...o,
                items: o.orderItems || o.items || [],
                customerName: o.user?.name || (o.userId ? `Khách #${o.userId}` : 'Khách vãng lai'),
                customerEmail: o.user?.email || '',
                total: o.finalAmount ?? o.total ?? 0,
                subtotal: o.total ?? 0,
                discount: o.discountAmount ?? 0,
                couponCode: o.discountCode ?? '',
            }));

            setOrders(normalizedOrders);
        } catch (error: any) {
            console.error('Fetch error:', error);
            toast.error(error.message || 'Không thể tải danh sách đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const getOrderNumber = (o: any) => o.orderNumber ?? `#${o.id}`;
    const getCustomerName = (o: any) => o.customerName || (o.userId ? `Khách #${o.userId}` : 'Khách vãng lai');
    const getCustomerEmail = (o: any) => o.customerEmail || '';
    const getItemName = (i: any) => i.productName ?? i.product?.name ?? `Sản phẩm #${i.productId ?? ''}`;
    const getItemQty = (i: any) => i.qty ?? i.quantity ?? 1;

    const getItemSize = (i: any): string => {
        if (i.sizeName && typeof i.sizeName === 'string') return i.sizeName;
        if (typeof i.size === 'string') return i.size;
        if (i.size && typeof i.size === 'object' && i.size.name) return String(i.size.name);
        return 'M';
    };

    const getItemPrice = (i: any) => {
        if (i.lineTotal && (i.qty || i.quantity)) {
            return Math.round(i.lineTotal / (i.qty || i.quantity));
        }
        return i.unitPrice ?? i.price ?? i.product?.price ?? 0;
    };

    const getItemToppings = (i: any): string[] => {
        if (Array.isArray(i.toppingNames)) return i.toppingNames;
        if (Array.isArray(i.toppings)) {
            return i.toppings
                .map((t: any) => {
                    if (typeof t === 'string') return t;
                    return t.toppingName || t.name || t.topping?.name || '';
                })
                .filter(Boolean);
        }
        return [];
    };

    const counts = Object.fromEntries(
        FILTERS.map((f) => [f, countByFilter(orders, f)])
    ) as Record<OrderFilter, number>;

    const filtered = orders
        .filter((o) => matchesFilter(o.status, statusFilter))
        .filter((o) => {
            const q = search.toLowerCase();
            return (
                getOrderNumber(o).toLowerCase().includes(q) ||
                getCustomerName(o).toLowerCase().includes(q) ||
                getCustomerEmail(o).toLowerCase().includes(q)
            );
        })
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    // 2. Chuyển trạng thái đơn hàng (ĐÃ SỬA: dùng apiFetch mang theo Bearer Token)
    async function changeStatus(orderId: number | string, newStatus: OrderStatus) {
        try {
            await apiFetch(`/orders/${orderId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus }),
            });

            // Cập nhật lại UI ngay lập tức
            setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
            );
            toast.success(`Đơn #${orderId} ➔ ${newStatus}`);
        } catch (error: any) {
            toast.error(error.message || 'Lỗi khi cập nhật trạng thái đơn hàng');
        } finally {
            setOpenDropdown(null);
        }
    }

    function formatTime(iso: string) {
        if (!iso) return '—';
        return String(iso).replace('T', ' ').substring(0, 16);
    }

    const tabs = FILTERS;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Orders</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage and track all customer orders</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchOrders}
                    className="flex items-center gap-2 rounded-xl text-xs font-medium"
                >
                    <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Làm mới
                </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {GROUPS.map((s: OrderStatusGroup) => {
                    const cfg = STATUS_CONFIG[s];
                    return (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`text-left p-4 rounded-2xl border transition-all ${
                                statusFilter === s
                                    ? `${cfg.bg}${cfg.border} shadow-sm`
                                    : 'bg-card border-border hover:bg-accent/40'
                            }`}
                        >
                            <div className={`text-2xl font-bold ${statusFilter === s ? cfg.color : 'text-foreground'}`}>
                                {counts[s]}
                            </div>
                            <div className={`text-xs font-medium mt-0.5 ${statusFilter === s ? cfg.color : 'text-muted-foreground'}`}>
                                {cfg.label}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 w-full">
                <div className="flex flex-1 bg-accent/70 rounded-xl p-1.5 gap-1.5 overflow-x-auto">
                    {tabs.map((s) => {
                        const cfg = STATUS_CONFIG[s];
                        return (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                    statusFilter === s
                                        ? 'bg-card shadow-sm text-foreground font-semibold'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                                <span>{cfg.label}</span>
                                <span
                                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-0.5 ${
                                        statusFilter === s ? `${cfg.bg}${cfg.color}` : 'bg-muted text-muted-foreground'
                                    }`}
                                >
                                    {counts[s]}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="relative w-full lg:w-80 xl:w-96 shrink-0">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search orders by ID, name, email..."
                        className="pl-10 rounded-xl h-11 text-sm w-full"
                    />
                </div>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-visible">
                <table className="w-full text-sm">
                    <thead className="bg-accent/40 border-b border-border">
                    <tr>
                        <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Order</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Customer</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Items</th>
                        <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">Total</th>
                        <th className="text-center text-xs font-medium text-muted-foreground px-5 py-3">Status</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Time</th>
                        <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                    {loading ? (
                        <tr>
                            <td colSpan={7} className="text-center py-12 text-muted-foreground">
                                Đang tải danh sách đơn hàng...
                            </td>
                        </tr>
                    ) : filtered.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="text-center py-12 text-muted-foreground">
                                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                No orders found
                            </td>
                        </tr>
                    ) : (
                        filtered.map((order) => {
                            const cfg = statusStyle(order.status);
                            return (
                                <tr key={order.id} className="hover:bg-accent/30 transition-colors">
                                    <td className="px-5 py-3.5 font-mono text-xs font-semibold">
                                        {getOrderNumber(order)}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="font-medium text-sm">{getCustomerName(order)}</div>
                                        <div className="text-xs text-muted-foreground">{getCustomerEmail(order)}</div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="text-xs text-muted-foreground max-w-[220px] line-clamp-2">
                                            {order.items?.length > 0
                                                ? order.items
                                                    .map((i: any) => `${getItemName(i)} (${getItemSize(i)}) ×${getItemQty(i)}`)
                                                    .join(', ')
                                                : '—'}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-right font-semibold">
                                        {Number(order.total ?? 0).toLocaleString('vi-VN')}đ
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                        <div className="relative inline-block">
                                            <button
                                                onClick={() => setOpenDropdown(openDropdown === order.id ? null : order.id)}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${cfg.bg} ${cfg.color} ${cfg.border} hover:opacity-80`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                                {order.status}
                                                <ChevronDown className="w-3 h-3 opacity-60" />
                                            </button>
                                            {openDropdown === order.id && (
                                                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden min-w-[170px]">
                                                    {ORDER_STATUSES.map((s) => {
                                                        const c = statusStyle(s);
                                                        return (
                                                            <button
                                                                key={s}
                                                                onClick={() => changeStatus(order.id, s)}
                                                                disabled={order.status === s}
                                                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-left transition-colors ${
                                                                    order.status === s
                                                                        ? `${c.bg}${c.color} cursor-default`
                                                                        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                                                                }`}
                                                            >
                                                                <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                                                                {s}
                                                                {order.status === s && <span className="ml-auto text-[10px]">current</span>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                                        {formatTime(order.createdAt)}
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs rounded-lg px-2.5"
                                            onClick={() => setDetailOrder(order)}
                                        >
                                            View
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                    </tbody>
                </table>
            </div>

            <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span>{detailOrder && getOrderNumber(detailOrder)}</span>
                            {detailOrder && (
                                <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                                        statusStyle(detailOrder.status).bg
                                    } ${statusStyle(detailOrder.status).color} ${statusStyle(detailOrder.status).border}`}
                                >
                                    {detailOrder.status}
                                </span>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    {detailOrder && (
                        <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-3 bg-accent/40 rounded-xl p-3">
                                <div>
                                    <p className="text-xs text-muted-foreground">Customer</p>
                                    <p className="font-medium">{getCustomerName(detailOrder)}</p>
                                    <p className="text-xs text-muted-foreground">{getCustomerEmail(detailOrder)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Placed at</p>
                                    <p className="font-medium">{formatTime(detailOrder.createdAt)}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                    Items
                                </p>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {detailOrder.items?.map((item: any, i: number) => {
                                        const qty = getItemQty(item);
                                        const price = getItemPrice(item);
                                        const tNames = getItemToppings(item);
                                        return (
                                            <div key={i} className="flex items-start justify-between gap-2 p-2.5 bg-accent/40 rounded-xl">
                                                <div>
                                                    <p className="font-medium">
                                                        {getItemName(item)}{' '}
                                                        <span className="text-muted-foreground font-normal">({getItemSize(item)})</span>
                                                    </p>
                                                    {tNames.length > 0 && (
                                                        <p className="text-xs text-muted-foreground mt-0.5">+ {tNames.join(', ')}</p>
                                                    )}
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-xs text-muted-foreground">×{qty}</p>
                                                    <p className="font-semibold text-foreground">
                                                        {price.toLocaleString('vi-VN')}đ
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="border-t border-border pt-3 space-y-1.5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>
                                        {Number((detailOrder as any).subtotal ?? detailOrder.total ?? 0).toLocaleString('vi-VN')}đ
                                    </span>
                                </div>
                                {((detailOrder as any).discount ?? 0) > 0 && (
                                    <div className="flex justify-between text-sm text-emerald-600">
                                        <span>
                                            Discount {(detailOrder as any).couponCode && `(${(detailOrder as any).couponCode})`}
                                        </span>
                                        <span>-{Number((detailOrder as any).discount).toLocaleString('vi-VN')}đ</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-base">
                                    <span>Total</span>
                                    <span>{Number(detailOrder.total ?? 0).toLocaleString('vi-VN')}đ</span>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {openDropdown && (
                <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
            )}
        </div>
    );
}