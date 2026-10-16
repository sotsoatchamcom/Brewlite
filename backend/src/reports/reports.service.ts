import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LOW_STOCK_THRESHOLD } from '../notifications/notifications.service';
import { REPORT_RANGES, ReportRange } from './dto/query-report.dto';

type Granularity = 'day' | 'month';

const DAY = 24 * 60 * 60 * 1000;
const VN_OFFSET = 7 * 60 * 60 * 1000; // Gom nhóm theo ngày/tháng giờ Việt Nam (UTC+7), không phụ thuộc múi giờ máy chủ

/** Đơn đã thanh toán thành công => tính vào doanh thu (đổi ở đây nếu muốn chỉ tính đơn COMPLETED) */
const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.COMPLETED,
];

/** Nhóm trạng thái hiển thị trên màn "Đơn hàng" (khớp tab Received/Processing/Completed/Canceled) */
const STATUS_GROUPS = [
  { key: 'received', name: 'Received', statuses: [OrderStatus.PAID] },
  {
    key: 'processing',
    name: 'Processing',
    statuses: [OrderStatus.PREPARING, OrderStatus.READY],
  },
  { key: 'completed', name: 'Completed', statuses: [OrderStatus.COMPLETED] },
  { key: 'canceled', name: 'Canceled', statuses: [OrderStatus.CANCELLED] },
] as const;

const AWAITING_PAYMENT: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PAYMENT_FAILED,
];

const pad = (n: number) => String(n).padStart(2, '0');
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseRange(input?: string): ReportRange {
    return (REPORT_RANGES as readonly string[]).includes(input ?? '')
      ? (input as ReportRange)
      : '6m';
  }

  /** `shifted` là Date đã cộng VN_OFFSET (đọc bằng getUTC*) */
  private keyOf(shifted: Date, g: Granularity) {
    const y = shifted.getUTCFullYear();
    const m = pad(shifted.getUTCMonth() + 1);
    return g === 'day' ? `${y}-${m}-${pad(shifted.getUTCDate())}` : `${y}-${m}`;
  }

  private async resolveRange(range: ReportRange) {
    const nowShifted = new Date(Date.now() + VN_OFFSET);
    const y = nowShifted.getUTCFullYear();
    const m = nowShifted.getUTCMonth();
    const todayStart = Date.UTC(y, m, nowShifted.getUTCDate());

    let startShifted: number;
    let granularity: Granularity;

    if (range === '7d' || range === '30d') {
      granularity = 'day';
      startShifted = todayStart - ((range === '7d' ? 7 : 30) - 1) * DAY;
    } else {
      granularity = 'month';
      if (range === '6m' || range === '12m') {
        startShifted = Date.UTC(y, m - ((range === '6m' ? 6 : 12) - 1), 1);
      } else {
        const first = await this.prisma.order.findFirst({
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        });
        const f = new Date((first?.createdAt ?? new Date()).getTime() + VN_OFFSET);
        startShifted = Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), 1);
      }
    }

    const buckets: { key: string; label: string }[] = [];
    for (let t = startShifted; t <= nowShifted.getTime(); ) {
      const d = new Date(t);
      buckets.push({
        key: this.keyOf(d, granularity),
        label:
          granularity === 'day'
            ? `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`
            : `${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`,
      });
      t =
        granularity === 'day'
          ? t + DAY
          : Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    }

    return { start: new Date(startShifted - VN_OFFSET), granularity, buckets };
  }

  async summary(rangeInput?: string) {
    const range = this.parseRange(rangeInput);
    const { start, granularity, buckets } = await this.resolveRange(range);
    const inRange = { createdAt: { gte: start } };

    // ---------------- Đơn hàng: KPI, xu hướng, phân bố trạng thái ----------------
    const orders = await this.prisma.order.findMany({
      where: inRange,
      select: {
        createdAt: true,
        status: true,
        finalAmount: true,
        discountAmount: true,
      },
    });

    const trendMap = new Map(
      buckets.map((b) => [b.key, { label: b.label, revenue: 0, orders: 0 }]),
    );
    const statusCount = new Map<OrderStatus, number>();
    let revenue = 0;
    let paidOrders = 0;
    let discountTotal = 0;

    for (const o of orders) {
      statusCount.set(o.status, (statusCount.get(o.status) ?? 0) + 1);
      if (!REVENUE_STATUSES.includes(o.status)) continue;

      revenue += o.finalAmount;
      paidOrders += 1;
      discountTotal += o.discountAmount;

      const bucket = trendMap.get(
        this.keyOf(new Date(o.createdAt.getTime() + VN_OFFSET), granularity),
      );
      if (bucket) {
        bucket.revenue += o.finalAmount;
        bucket.orders += 1;
      }
    }

    const statusDistribution = STATUS_GROUPS.map((g) => ({
      key: g.key,
      name: g.name,
      value: g.statuses.reduce((s, st) => s + (statusCount.get(st) ?? 0), 0),
    }));
    const totalOrders = statusDistribution.reduce((s, g) => s + g.value, 0);
    const completed =
      statusDistribution.find((g) => g.key === 'completed')?.value ?? 0;
    const canceled =
      statusDistribution.find((g) => g.key === 'canceled')?.value ?? 0;
    const awaitingPayment = AWAITING_PAYMENT.reduce(
      (s, st) => s + (statusCount.get(st) ?? 0),
      0,
    );

    // ---------------- Top sản phẩm theo doanh thu ----------------
    const itemRows = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { status: { in: REVENUE_STATUSES }, ...inRange } },
      _sum: { lineTotal: true, qty: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: 5,
    });
    const productNames = await this.prisma.product.findMany({
      where: { id: { in: itemRows.map((r) => r.productId) } },
      select: { id: true, name: true },
    });
    const topProducts = itemRows.map((r) => ({
      id: r.productId,
      name: productNames.find((p) => p.id === r.productId)?.name ?? `#${r.productId}`,
      revenue: r._sum.lineTotal ?? 0,
      quantity: r._sum.qty ?? 0,
    }));

    // ---------------- Top khách hàng ----------------
    const customerRows = await this.prisma.order.groupBy({
      by: ['userId'],
      where: { status: { in: REVENUE_STATUSES }, ...inRange },
      _sum: { finalAmount: true },
      _count: { _all: true },
      orderBy: { _sum: { finalAmount: 'desc' } },
      take: 5,
    });
    const customerUsers = await this.prisma.user.findMany({
      where: { id: { in: customerRows.map((r) => r.userId) } },
      select: { id: true, name: true, email: true },
    });
    const topCustomers = customerRows.map((r) => {
      const u = customerUsers.find((x) => x.id === r.userId);
      return {
        id: r.userId,
        name: u?.name || u?.email || `Khách #${r.userId}`,
        orders: r._count._all,
        spent: r._sum.finalAmount ?? 0,
      };
    });

    // ---------------- Thanh toán ----------------
    const paymentRows = await this.prisma.payment.groupBy({
      by: ['status', 'method'],
      where: inRange,
      _count: { _all: true },
      _sum: { amount: true },
    });
    let paySuccess = 0;
    let payFailed = 0;
    const byMethod = new Map<string, { method: string; count: number; amount: number }>();
    for (const r of paymentRows) {
      if (r.status === PaymentStatus.SUCCESS) {
        paySuccess += r._count._all;
        const cur = byMethod.get(r.method) ?? { method: r.method, count: 0, amount: 0 };
        cur.count += r._count._all;
        cur.amount += r._sum.amount ?? 0;
        byMethod.set(r.method, cur);
      } else {
        payFailed += r._count._all;
      }
    }

    // ---------------- Sản phẩm ----------------
    const [totalProducts, activeProducts, lowStock, outOfStock, lowStockProducts] =
      await Promise.all([
        this.prisma.product.count(),
        this.prisma.product.count({ where: { isActive: true } }),
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

    // ---------------- Người dùng ----------------
    const roleRows = await this.prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
    });
    const roleCount = (role: Role) =>
      roleRows.find((r) => r.role === role)?._count._all ?? 0;
    const newCustomers = await this.prisma.user.count({
      where: { role: Role.CUSTOMER, ...inRange },
    });
    const loyalty = await this.prisma.user.aggregate({
      _sum: { loyaltyPoints: true },
    });

    return {
      range,
      granularity,
      generatedAt: new Date().toISOString(),
      kpis: {
        revenue,
        totalOrders,
        paidOrders,
        awaitingPayment,
        avgOrderValue: paidOrders > 0 ? Math.round(revenue / paidOrders) : 0,
        completionRate: pct(completed, totalOrders),
        cancelRate: pct(canceled, totalOrders),
        discountTotal,
      },
      trend: [...trendMap.values()],
      statusDistribution,
      topProducts,
      topCustomers,
      payments: {
        total: paySuccess + payFailed,
        success: paySuccess,
        failed: payFailed,
        successRate: pct(paySuccess, paySuccess + payFailed),
        byMethod: [...byMethod.values()],
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        inactive: totalProducts - activeProducts,
        lowStock,
        outOfStock,
        lowStockProducts,
      },
      customers: {
        total: roleCount(Role.ADMIN) + roleCount(Role.CUSTOMER),
        admins: roleCount(Role.ADMIN),
        customers: roleCount(Role.CUSTOMER),
        newInRange: newCustomers,
        loyaltyPoints: loyalty._sum.loyaltyPoints ?? 0,
      },
    };
  }
}
