import type { Order, OrderStatus } from './types';

// UI groups shown in sidebar, cards and tabs
export type OrderStatusGroup = 'received' | 'processing' | 'completed' | 'canceled';
export type OrderFilter = OrderStatusGroup | 'all';

export const ORDER_STATUSES: readonly OrderStatus[] = [
    'PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED', 'PAYMENT_FAILED', 'CANCELLED',
] as const;

export const GROUP_TO_STATUSES: Record<OrderStatusGroup, readonly OrderStatus[]> = {
    received: ['PENDING', 'PAID'],
    processing: ['PREPARING', 'READY'],
    completed: ['COMPLETED'],
    canceled: ['CANCELLED', 'PAYMENT_FAILED'],
};

export const STATUS_TO_GROUP: Record<OrderStatus, OrderStatusGroup> = {
    PENDING: 'received',
    PAID: 'received',
    PREPARING: 'processing',
    READY: 'processing',
    COMPLETED: 'completed',
    CANCELLED: 'canceled',
    PAYMENT_FAILED: 'canceled',
};

export const GROUPS: readonly OrderStatusGroup[] = ['received', 'processing', 'completed', 'canceled'];
export const FILTERS: readonly OrderFilter[] = ['all', ...GROUPS];

export function matchesFilter(status: OrderStatus, filter: OrderFilter): boolean {
    return filter === 'all' || STATUS_TO_GROUP[status] === filter;
}

export function countByFilter(orders: Pick<Order, 'status'>[], filter: OrderFilter): number {
    return orders.filter((o) => matchesFilter(o.status, filter)).length;
}

export function filterToPath(filter: OrderFilter): string {
    return `/orders/${filter}`;
}

export function pathToFilter(pathname: string): OrderFilter {
    const last = pathname.replace(/\/+$/, '').split('/').pop();
    return (FILTERS as readonly string[]).includes(last ?? '') && pathname.startsWith('/orders')
        ? (last as OrderFilter)
        : 'all';
}
