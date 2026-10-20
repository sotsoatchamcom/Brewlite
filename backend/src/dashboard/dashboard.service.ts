import { Injectable } from '@nestjs/common';
import { NotificationAudience, OrderStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LOW_STOCK_THRESHOLD } from '../notifications/notifications.service';

const DAY = 24 * 60 * 60 * 1000;
const VN_OFFSET = 7 * 60 * 60 * 1000; // Gom nhóm theo ngày giờ Việt Nam (UTC+7)

/** Đơn đã thanh toán thành công => tính vào doanh thu */
const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.COMPLETED,
];

/** Đơn cần nhân viên xử lý */
const IN_PROGRESS: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PREPARING,
  OrderStatus.READY,
];

/**
 * Nhóm trạng thái khớp các tab ở sidebar (All = tổng 4 nhóm).
 * Đổi ở đây nếu lib/orderStatus của bạn nhóm khác.
 */
const STATUS_GROUPS = [
  { key: 'received', name: 'Received', statuses: [OrderStatus.PENDING, OrderStatus.PAID] },
  { key: 'processing', name: 'Processing', statuses: [OrderStatus.PREPARING, OrderStatus.READY] },
  { key: 'completed', name: 'Completed', statuses: [OrderStatus.COMPLETED] },
  { key: 'canceled', name: 'Canceled', statuses: [OrderStatus.CANCELLED, OrderStatus.PAYMENT_FAILED] },
] as const;

const pad = (n: number) => String(n).padStart(2, '0');

/** % thay đổi so với kỳ trước; null = kỳ trước bằng 0 nhưng kỳ này có dữ liệu ("mới") */
const change = (cur: number, prev: number): number | null =>
  prev === 0 ? (cur > 0 ? null : 0) : Math.round(((cur - prev) / prev) * 100);

const ORDER_ROW_SELECT = {
  id: true,
  status: true,
  finalAmount: true,
  createdAt: true,
  user: { select: { name: true, email: true } },
  orderItems: { select: { productName: true, qty: true } },
} as const;

type OrderRow = {
  id: number;
  status: OrderStatus;
  finalAmount: number;
  createdAt: Date;
  user: { name: string | null; email: string } | null;
  orderItems: { productName: string; qty: number }[];
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private mapOrder(o: OrderRow) {
    const itemsCount = o.orderItems.reduce((s, i) => s + i.qty, 0);
    const first = o.orderItems[0];
    return {
      id: o.id,
      status: o.status,
      total: o.finalAmount,
      createdAt: o.createdAt,
      customer: o.user?.name || o.user?.email || 'Khách',
      itemsCount,
      summary: first
        ? `${first.productName}${o.orderItems.length > 1 ? ` +${o.orderItems.length - 1} món` : ''}`
        : '',
    };
  }

  async summary(recentLimit = 8) {
    // ---------- Mốc thời gian (giờ Việt Nam) ----------
    const nowShifted = new Date(Date.now() + VN_OFFSET);
    const todayShifted = Date.UTC(
      nowShifted.getUTCFullYear(),
      nowShifted.getUTCMonth(),
      nowShifted.getUTCDate(),
    );
    const todayStart = new Date(todayShifted - VN_OFFSET);
    const weekStart = new Date(todayShifted - 6 * DAY - VN_OFFSET);

    const dayKey = (shiftedMs: number) => {
      const d = new Date(shiftedMs);
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    };

    // 7 ngày gần nhất (cũ -> mới), ngày cuối là hôm nay
    const days = Array.from({ length: 7 }, (_, i) => {
      const ms = todayShifted - (6 - i) * DAY;
      const d = new Date(ms);
      return {
        key: dayKey(ms),
        label: `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`,
        revenue: 0,
        orders: 0,
        paidOrders: 0,
      };
    });
    const dayMap = new Map(days.map((d) => [d.key, d]));

    // ---------- Đơn 7 ngày: xu hướng + so sánh hôm nay/hôm qua ----------
    const weekOrders = await this.prisma.order.findMany({
      where: { createdAt: { gte: weekStart } },
      select: { createdAt: true, status: true, finalAmount: true },
    });
    for (const o of weekOrders) {
      const bucket = dayMap.get(dayKey(o.createdAt.getTime() + VN_OFFSET));
      if (!bucket) continue;
      bucket.orders += 1;
      if (REVENUE_STATUSES.includes(o.status)) {
        bucket.revenue += o.finalAmount;
        bucket.paidOrders += 1;
      }
    }
    const today = days[6];
    const yesterday = days[5];

    // ---------- Phân bố trạng thái (toàn bộ) ----------
    const statusRows = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const count = (st: OrderStatus) =>
      statusRows.find((r) => r.status === st)?._count._all ?? 0;

    const statusDistribution = STATUS_GROUPS.map((g) => ({
      key: g.key,
      name: g.name,
      value: g.statuses.reduce((s, st) => s + count(st), 0),
    }));
    const totalOrders = statusDistribution.reduce((s, g) => s + g.value, 0);

    const pipeline = {
      awaitingPayment: count(OrderStatus.PENDING),
      paymentFailed: count(OrderStatus.PAYMENT_FAILED),
      paid: count(OrderStatus.PAID),
      preparing: count(OrderStatus.PREPARING),
      ready: count(OrderStatus.READY),
      inProgress: IN_PROGRESS.reduce((s, st) => s + count(st), 0),
    };

    // ---------- Hàng đợi cần xử lý + đơn gần đây ----------
    const queueRows = await this.prisma.order.findMany({
      where: { status: { in: IN_PROGRESS } },
      orderBy: { createdAt: 'asc' },
      take: 6,
      select: ORDER_ROW_SELECT,
    });
    const recentRows = await this.prisma.order.findMany({
      orderBy: { id: 'desc' },
      take: recentLimit,
      select: ORDER_ROW_SELECT,
    });

    // ---------- Top sản phẩm 7 ngày ----------
    const itemRows = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { status: { in: REVENUE_STATUSES }, createdAt: { gte: weekStart } } },
      _sum: { lineTotal: true, qty: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: 5,
    });
    const names = await this.prisma.product.findMany({
      where: { id: { in: itemRows.map((r) => r.productId) } },
      select: { id: true, name: true },
    });
    const topProducts = itemRows.map((r) => ({
      id: r.productId,
      name: names.find((p) => p.id === r.productId)?.name ?? `#${r.productId}`,
      revenue: r._sum.lineTotal ?? 0,
      quantity: r._sum.qty ?? 0,
    }));

    // ---------- Tồn kho ----------
    const [lowStock, outOfStock, lowStockProducts] = await Promise.all([
      this.prisma.product.count({
        where: { isActive: true, stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } },
      }),
      this.prisma.product.count({ where: { isActive: true, stock: { lte: 0 } } }),
      this.prisma.product.findMany({
        where: { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD } },
        orderBy: [{ stock: 'asc' }, { id: 'asc' }],
        take: 5,
        select: { id: true, name: true, stock: true },
      }),
    ]);

    // ---------- Khách hàng + thông báo ----------
    const [totalCustomers, newCustomersToday, unread, latest] = await Promise.all([
      this.prisma.user.count({ where: { role: Role.CUSTOMER } }),
      this.prisma.user.count({
        where: { role: Role.CUSTOMER, createdAt: { gte: todayStart } },
      }),
      this.prisma.notification.count({
        where: { audience: NotificationAudience.ADMIN, isRead: false },
      }),
      this.prisma.notification.findMany({
        where: { audience: NotificationAudience.ADMIN },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 5,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          href: true,
          isRead: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      today: {
        revenue: today.revenue,
        orders: today.orders,
        paidOrders: today.paidOrders,
        avgOrderValue: today.paidOrders ? Math.round(today.revenue / today.paidOrders) : 0,
        newCustomers: newCustomersToday,
        revenueChange: change(today.revenue, yesterday.revenue),
        ordersChange: change(today.orders, yesterday.orders),
      },
      week: {
        revenue: days.reduce((s, d) => s + d.revenue, 0),
        orders: days.reduce((s, d) => s + d.orders, 0),
      },
      trend: days.map(({ label, revenue, orders }) => ({ label, revenue, orders })),
      totalOrders,
      statusDistribution,
      pipeline,
      queue: queueRows.map((o) => this.mapOrder(o)),
      recentOrders: recentRows.map((o) => this.mapOrder(o)),
      topProducts,
      stock: { lowStock, outOfStock, lowStockProducts },
      customers: { total: totalCustomers, newToday: newCustomersToday },
      notifications: { unread, latest },
    };
  }
}
