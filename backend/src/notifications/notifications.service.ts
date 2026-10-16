import { Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationAudience,
  NotificationType,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryNotificationDto } from './dto/query-notification.dto';

/** Tồn kho <= ngưỡng này sẽ bắn cảnh báo "Sắp hết hàng" */
export const LOW_STOCK_THRESHOLD = 10;

/** Thông tin tối thiểu của đơn hàng để tạo thông báo */
export interface OrderRef {
  id: number;
  userId: number;
  finalAmount: number;
  user?: { name: string | null; email: string } | null;
}

const money = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Dùng transaction client nếu được truyền vào để thông báo cùng commit/rollback với nghiệp vụ */
  private db(tx?: Prisma.TransactionClient): Prisma.TransactionClient {
    return tx ?? this.prisma;
  }

  /** userId có giá trị => thông báo của khách; ngược lại => thông báo của Admin */
  private scope(userId?: number): Prisma.NotificationWhereInput {
    return userId
      ? { audience: NotificationAudience.CUSTOMER, userId }
      : { audience: NotificationAudience.ADMIN };
  }

  // =========================================================================
  // PHÁT SINH THÔNG BÁO (được gọi từ OrdersService / ProductsService...)
  // =========================================================================

  /** Có đơn mới => báo cho Admin */
  async notifyOrderCreated(order: OrderRef, tx?: Prisma.TransactionClient) {
    const who = order.user?.name || order.user?.email || `Khách #${order.userId}`;
    await this.db(tx).notification.create({
      data: {
        audience: NotificationAudience.ADMIN,
        type: NotificationType.ORDER_NEW,
        title: `Đơn mới #${order.id}`,
        message: `${who} · ${money(order.finalAmount)}`,
        href: '/orders/all',
        orderId: order.id,
      },
    });
  }

  /** Đổi trạng thái đơn => báo cho Admin (các mốc cần chú ý) và cho khách hàng */
  async notifyOrderStatusChanged(
    order: OrderRef,
    next: OrderStatus,
    tx?: Prisma.TransactionClient,
  ) {
    const who = order.user?.name || order.user?.email || `Khách #${order.userId}`;
    const rows: Prisma.NotificationCreateManyInput[] = [];

    // --- Admin: chỉ báo các mốc phát sinh từ phía khách / hệ thống thanh toán ---
    if (next === OrderStatus.PAID) {
      rows.push({
        audience: NotificationAudience.ADMIN,
        type: NotificationType.ORDER_UPDATE,
        title: `Đơn #${order.id} đã thanh toán`,
        message: `${who} · ${money(order.finalAmount)} · cần chuẩn bị`,
        href: '/orders/all',
        orderId: order.id,
      });
    } else if (next === OrderStatus.PAYMENT_FAILED) {
      rows.push({
        audience: NotificationAudience.ADMIN,
        type: NotificationType.PAYMENT_FAILED,
        title: `Thanh toán thất bại: đơn #${order.id}`,
        message: `${who} · ${money(order.finalAmount)}`,
        href: '/orders/all',
        orderId: order.id,
      });
    } else if (next === OrderStatus.CANCELLED) {
      rows.push({
        audience: NotificationAudience.ADMIN,
        type: NotificationType.ORDER_CANCELLED,
        title: `Đơn #${order.id} đã bị huỷ`,
        message: `${who} · ${money(order.finalAmount)}`,
        href: '/orders/all',
        orderId: order.id,
      });
    }

    // --- Khách hàng: báo mọi mốc trạng thái ---
    const customerCopy: Partial<
      Record<OrderStatus, { type: NotificationType; title: string; message: string }>
    > = {
      [OrderStatus.PAID]: {
        type: NotificationType.ORDER_UPDATE,
        title: 'Thanh toán thành công',
        message: 'Quán đã nhận đơn và sẽ sớm chuẩn bị đồ uống cho bạn.',
      },
      [OrderStatus.PAYMENT_FAILED]: {
        type: NotificationType.PAYMENT_FAILED,
        title: 'Thanh toán thất bại',
        message: 'Vui lòng thử thanh toán lại hoặc chọn phương thức khác.',
      },
      [OrderStatus.PREPARING]: {
        type: NotificationType.ORDER_UPDATE,
        title: 'Đang pha chế',
        message: 'Barista đang chuẩn bị đồ uống của bạn.',
      },
      [OrderStatus.READY]: {
        type: NotificationType.ORDER_UPDATE,
        title: 'Đồ uống đã sẵn sàng',
        message: 'Mời bạn đến quầy nhận đồ uống.',
      },
      [OrderStatus.COMPLETED]: {
        type: NotificationType.ORDER_UPDATE,
        title: 'Đơn hàng hoàn tất',
        message: 'Cảm ơn bạn đã ủng hộ BrewLite!',
      },
      [OrderStatus.CANCELLED]: {
        type: NotificationType.ORDER_CANCELLED,
        title: 'Đơn hàng đã bị huỷ',
        message: 'Đơn hàng đã được huỷ, nếu đã thanh toán vui lòng liên hệ quán.',
      },
    };
    const copy = customerCopy[next];
    if (copy) {
      rows.push({
        audience: NotificationAudience.CUSTOMER,
        userId: order.userId,
        type: copy.type,
        title: `Đơn #${order.id}: ${copy.title}`,
        message: copy.message,
        href: null,
        orderId: order.id,
      });
    }

    if (rows.length) {
      await this.db(tx).notification.createMany({ data: rows });
    }
  }

  /**
   * Đồng bộ cảnh báo tồn kho của 1 sản phẩm (mỗi sản phẩm tối đa 1 cảnh báo, khoá bằng dedupeKey):
   * - sản phẩm đã ẩn, hoặc stock > ngưỡng => xoá cảnh báo cũ (đã nhập thêm / hoàn kho do huỷ đơn / ngừng bán)
   * - stock <= ngưỡng => tạo mới hoặc cập nhật số lượng; chuyển từ "sắp hết" sang "hết hàng" thì báo lại (chưa đọc)
   */
  async syncStockAlert(productId: number, tx?: Prisma.TransactionClient) {
    const db = this.db(tx);
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, stock: true, isActive: true },
    });
    if (!product) return;

    const dedupeKey = `STOCK:${product.id}`;

    if (!product.isActive || product.stock > LOW_STOCK_THRESHOLD) {
      await db.notification.deleteMany({ where: { dedupeKey } });
      return;
    }

    const isOut = product.stock <= 0;
    const content = {
      type: isOut ? NotificationType.OUT_OF_STOCK : NotificationType.LOW_STOCK,
      title: isOut ? `Hết hàng: ${product.name}` : `Sắp hết hàng: ${product.name}`,
      message: isOut
        ? 'Sản phẩm đã hết hàng, cần nhập thêm'
        : `Chỉ còn ${product.stock} sản phẩm trong kho`,
      href: '/products',
      productId: product.id,
    };

    const existing = await db.notification.findUnique({ where: { dedupeKey } });
    if (!existing) {
      await db.notification.create({
        data: { ...content, audience: NotificationAudience.ADMIN, dedupeKey },
      });
      return;
    }

    await db.notification.update({
      where: { dedupeKey },
      data: {
        ...content,
        ...(existing.type !== content.type
          ? { isRead: false, readAt: null, createdAt: new Date() }
          : {}),
      },
    });
  }

  async syncStockAlerts(productIds: number[], tx?: Prisma.TransactionClient) {
    for (const id of new Set(productIds)) {
      await this.syncStockAlert(id, tx);
    }
  }

  // =========================================================================
  // TRUY VẤN / THAO TÁC (Admin: không truyền userId — Khách: truyền userId)
  // =========================================================================

  async findAll(query: QueryNotificationDto = {}, userId?: number) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const where: Prisma.NotificationWhereInput = {
      ...this.scope(userId),
      ...(query.isRead !== undefined ? { isRead: query.isRead } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.notification.count({ where }),
      this.unreadCount(userId),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        unreadCount,
      },
    };
  }

  async unreadCount(userId?: number): Promise<number> {
    return this.prisma.notification.count({
      where: { ...this.scope(userId), isRead: false },
    });
  }

  private async getOwned(id: number, userId?: number) {
    const found = await this.prisma.notification.findFirst({
      where: { id, ...this.scope(userId) },
    });
    if (!found) throw new NotFoundException(`Không tìm thấy thông báo #${id}`);
    return found;
  }

  async markAsRead(id: number, userId?: number) {
    const found = await this.getOwned(id, userId);
    if (found.isRead) return found;
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId?: number) {
    const { count } = await this.prisma.notification.updateMany({
      where: { ...this.scope(userId), isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true, updated: count };
  }

  async remove(id: number, userId?: number) {
    await this.getOwned(id, userId);
    await this.prisma.notification.delete({ where: { id } });
    return { success: true };
  }

  async clearRead(userId?: number) {
    const { count } = await this.prisma.notification.deleteMany({
      where: { ...this.scope(userId), isRead: true },
    });
    return { success: true, deleted: count };
  }
}
