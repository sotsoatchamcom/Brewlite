import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import {
  OrderStatus,
  DiscountType,
} from '@prisma/client';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
      private prisma: PrismaService,
      private notificationsService: NotificationsService,
  ) {}

  // =========================================================================
  // TASK 10 (Yêu cầu 1): ORDER STATE MACHINE CHUẨN MỤC 9.1
  // =========================================================================
  private readonly allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [
      OrderStatus.PAID,
      OrderStatus.PAYMENT_FAILED,
      OrderStatus.CANCELLED,
    ],
    // Cho phép thanh toán lại chuyển thẳng sang PAID hoặc tự động huỷ sang CANCELLED
    [OrderStatus.PAYMENT_FAILED]: [
      OrderStatus.PENDING,
      OrderStatus.PAID,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    [OrderStatus.PREPARING]: [OrderStatus.READY],
    [OrderStatus.READY]: [OrderStatus.COMPLETED],
    [OrderStatus.COMPLETED]: [],
    [OrderStatus.CANCELLED]: [],
  };

  private assertTransition(current: OrderStatus, next: OrderStatus): void {
    const allowed = this.allowedTransitions[current] || [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
          `Chuyển trạng thái không hợp lệ: Không thể chuyển từ [${current}] sang [${next}]!`,
      );
    }
  }

  // =========================================================================
  // CRON JOB: TỰ ĐỘNG HỦY ĐƠN PENDING & PAYMENT_FAILED QUÁ 15 PHÚT
  // =========================================================================
  @Cron(CronExpression.EVERY_MINUTE)
  async autoCancelExpiredPendingOrders() {
    const EXPIRE_MINUTES = 15;
    const thresholdTime = new Date(Date.now() - EXPIRE_MINUTES * 60 * 1000);

    // 1. Tìm các đơn PENDING hoặc PAYMENT_FAILED tạo trước ngưỡng 15 phút
    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED] },
        createdAt: { lte: thresholdTime },
      },
      select: { id: true },
    });

    if (expiredOrders.length === 0) return;

    this.logger.warn(
        `Phát hiện ${expiredOrders.length} đơn hàng PENDING/PAYMENT_FAILED quá hạn ${EXPIRE_MINUTES} phút. Đang xử lý tự động hủy...`,
    );

    // 2. Chuyển sang CANCELLED (tự động hoàn tồn kho, hoàn coupon và gửi thông báo)
    for (const item of expiredOrders) {
      try {
        await this.update(item.id, { status: OrderStatus.CANCELLED });
        this.logger.log(
            `Đã tự động hủy đơn #${item.id} và hoàn trả tồn kho thành công.`,
        );
      } catch (err: any) {
        this.logger.error(
            `Lỗi khi tự động hủy đơn #${item.id}: ${err.message}`,
        );
      }
    }
  }

  // =========================================================================
  // TASK 6 & TASK 10: TẠO ĐƠN HÀNG, KIỂM TRA TOPPING, TỒN KHO & COUPON
  // =========================================================================
  async create(userId: number, createOrderDto: CreateOrderDto) {
    const { items, couponCode } = createOrderDto;

    return this.prisma.$transaction(async (tx) => {
      // 1. Kiểm tra tài khoản User & Trạng thái hoạt động
      const user = await tx.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException(`Khách hàng #${userId} không tồn tại!`);
      }
      if (!user.isActive) {
        throw new BadRequestException(
            'Tài khoản của bạn đã bị khóa hoặc tạm ngưng hoạt động!',
        );
      }

      let subtotal = 0;
      const orderItemsData: any[] = [];

      // 2. Duyệt qua từng món trong giỏ hàng
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: {
            category: {
              include: {
                toppings: {
                  where: { isAvailable: true },
                },
              },
            },
          },
        });

        if (!product) {
          throw new NotFoundException(
              `Sản phẩm #${item.productId} không tồn tại!`,
          );
        }

        if (!product.isActive) {
          throw new BadRequestException(
              `Sản phẩm "${product.name}" hiện đã ngừng kinh doanh hoặc tạm thời hết phục vụ!`,
          );
        }

        if (product.category && !product.category.isActive) {
          throw new BadRequestException(
              `Danh mục "${product.category.name}" hiện đang tạm ngừng phục vụ!`,
          );
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
              `Sản phẩm "${product.name}" không đủ tồn kho (Còn: ${product.stock}, yêu cầu: ${item.quantity})!`,
          );
        }

        // TASK 10 (Yêu cầu 3): OPTIMISTIC LOCKING VỚI CỘT VERSION VÀ RÀNG BUỘC TỒN KHO
        const updateResult = await tx.product.updateMany({
          where: {
            id: product.id,
            version: product.version,
            stock: { gte: item.quantity },
          },
          data: {
            stock: { decrement: item.quantity },
            version: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          throw new ConflictException(
              `Sản phẩm "${product.name}" vừa có biến động tồn kho do người khác đặt cùng lúc, vui lòng thử lại!`,
          );
        }

        // 3. Tra cứu Size & Phụ thu
        const targetSize = (item.size || 'M').toUpperCase();
        const availableSizes = await tx.productSize.findMany({
          where: { productId: product.id },
        });

        let productSize = availableSizes.find(
            (s) => s.name.toUpperCase() === targetSize && s.isAvailable,
        );

        if (availableSizes.length > 0 && !productSize) {
          throw new BadRequestException(
              `Size "${targetSize}" không khả dụng cho sản phẩm "${product.name}"!`,
          );
        }

        const sizeName = productSize ? productSize.name : targetSize;
        const sizeSurcharge = productSize ? productSize.surcharge : 0;
        const productSizeId = productSize ? productSize.id : null;

        // 4. Xử lý Topping & Kiểm tra tính tương thích theo Danh mục
        let toppingUnitPrice = 0;
        const toppingsCreateData: any[] = [];

        if (item.toppingIds && item.toppingIds.length > 0) {
          const allowedToppings = product.category?.toppings || [];
          const allowedToppingIds = new Set(allowedToppings.map((t) => t.id));

          const hasInvalidTopping = item.toppingIds.some(
              (id) => !allowedToppingIds.has(id),
          );

          if (hasInvalidTopping) {
            throw new BadRequestException(
                `Sản phẩm "${product.name}" thuộc danh mục "${product.category?.name || 'mặc định'}" không hỗ trợ các loại topping đã chọn!`,
            );
          }

          const toppings = await tx.topping.findMany({
            where: {
              id: { in: item.toppingIds },
              isAvailable: true,
            },
          });

          if (toppings.length !== item.toppingIds.length) {
            throw new BadRequestException(
                `Có loại topping không tồn tại hoặc đã ngừng phục vụ!`,
            );
          }

          for (const top of toppings) {
            toppingUnitPrice += top.price;
            toppingsCreateData.push({
              toppingId: top.id,
              toppingName: top.name,
              price: top.price,
              qty: 1,
              lineTotal: top.price,
            });
          }
        }

        const singleCupPrice = product.price + sizeSurcharge + toppingUnitPrice;
        const itemLineTotal = singleCupPrice * item.quantity;
        subtotal += itemLineTotal;

        orderItemsData.push({
          productId: product.id,
          productSizeId: productSizeId,
          productName: product.name,
          unitPrice: product.price,
          sizeName: sizeName,
          sizeSurcharge: sizeSurcharge,
          qty: item.quantity,
          lineTotal: itemLineTotal,
          ...(toppingsCreateData.length > 0
              ? {
                toppings: {
                  create: toppingsCreateData,
                },
              }
              : {}),
        });
      }

      // 5. Xử lý mã giảm giá Coupon
      let discountAmount = 0;
      let couponId: number | null = null;

      if (couponCode) {
        const coupon = await tx.coupon.findUnique({
          where: { code: couponCode },
        });

        if (!coupon || !coupon.isActive) {
          throw new BadRequestException(
              `Mã giảm giá "${couponCode}" không tồn tại hoặc đã bị ngừng kích hoạt!`,
          );
        }

        const now = new Date();
        if (coupon.startsAt > now) {
          throw new BadRequestException(
              `Mã giảm giá "${couponCode}" chưa đến thời gian áp dụng!`,
          );
        }

        if (coupon.expiresAt < now) {
          throw new BadRequestException(
              `Mã giảm giá "${couponCode}" đã hết hạn sử dụng!`,
          );
        }

        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
          throw new BadRequestException(
              `Mã giảm giá "${couponCode}" đã hết lượt sử dụng!`,
          );
        }

        if (subtotal < coupon.minOrderValue) {
          throw new BadRequestException(
              `Đơn hàng cần tối thiểu ${coupon.minOrderValue.toLocaleString('vi-VN')}đ để áp dụng mã này!`,
          );
        }

        couponId = coupon.id;
        if (coupon.type === DiscountType.PERCENT) {
          discountAmount = Math.floor((subtotal * coupon.value) / 100);
          if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
            discountAmount = coupon.maxDiscount;
          }
        } else {
          discountAmount = coupon.value;
        }
        discountAmount = Math.min(discountAmount, subtotal);

        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      const finalAmount = Math.max(0, subtotal - discountAmount);
      const pointsEarned = Math.floor(finalAmount / 10000);

      // 6. Lưu đơn hàng
      const newOrder = await tx.order.create({
        data: {
          userId: userId,
          total: subtotal,
          discountCode: couponCode || null,
          discountAmount: discountAmount,
          finalAmount: finalAmount,
          loyaltyPointsEarned: pointsEarned,
          couponId: couponId,
          status: OrderStatus.PENDING,
          orderItems: {
            create: orderItemsData,
          },
        },
        include: {
          orderItems: {
            include: {
              product: true,
              size: true,
              toppings: true,
            },
          },
          coupon: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // 7. Bắn thông báo Đơn mới cho Admin
      await this.notificationsService.notifyOrderCreated(
          {
            id: newOrder.id,
            userId: newOrder.userId,
            finalAmount: newOrder.finalAmount,
            user: newOrder.user,
          },
          tx,
      );

      // 8. Đồng bộ cảnh báo sắp hết hàng nếu tồn kho xuống thấp
      await this.notificationsService.syncStockAlerts(
          items.map((i) => i.productId),
          tx,
      );

      return {
        success: true,
        message: 'Tạo đơn hàng thành công',
        orderId: newOrder.id,
        status: newOrder.status,
        total: newOrder.total,
        discountAmount: newOrder.discountAmount,
        finalAmount: newOrder.finalAmount,
        loyaltyPointsEarned: newOrder.loyaltyPointsEarned,
        data: newOrder,
      };
    });
  }

  // =========================================================================
  // TASK 9: TRA CỨU ĐƠN HÀNG
  // =========================================================================
  async findAll(query?: QueryOrderDto) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 100;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.status) where.status = query.status;
    if (query?.userId) where.userId = Number(query.userId);

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          orderItems: {
            include: {
              product: true,
              size: true,
              toppings: true,
            },
          },
          payments: true,
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: true,
            size: true,
            toppings: true,
          },
        },
        payments: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${id}`);
    }

    return order;
  }

  async findByUserId(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
      include: {
        orderItems: {
          include: {
            product: true,
            size: true,
            toppings: true,
          },
        },
        payments: true,
      },
    });
  }

  // =========================================================================
  // TASK 10 (Yêu cầu 1): CẬP NHẬT TRẠNG THÁI VÀ HOÀN TỒN KHO / ĐIỀU CHỈNH ĐIỂM
  // =========================================================================
  async update(id: number, updateOrderDto: UpdateOrderDto) {
    const order = await this.findOne(id);

    if (updateOrderDto.status) {
      this.assertTransition(order.status, updateOrderDto.status);

      return this.prisma.$transaction(async (tx) => {
        // 1. NẾU HỦY ĐƠN (CANCELLED)
        if (updateOrderDto.status === OrderStatus.CANCELLED) {
          // 1.1. Hoàn lại tồn kho theo số lượng và tăng version (Optimistic Locking)
          for (const item of order.orderItems) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: { increment: item.qty },
                version: { increment: 1 },
              },
            });
          }

          // 1.2. Hoàn lại 1 lượt dùng Coupon (nếu có áp mã)
          if (order.couponId) {
            await tx.coupon.update({
              where: { id: order.couponId },
              data: {
                usedCount: { decrement: 1 },
              },
            });
          }

          // 1.3. THU HỒI ĐIỂM TÍCH LŨY: Áp dụng cho các đơn đã thanh toán trước khi hủy
          const paidStatuses: OrderStatus[] = [
            OrderStatus.PAID,
            OrderStatus.PREPARING,
            OrderStatus.READY,
          ];
          const wasPaid = paidStatuses.includes(order.status);

          if (wasPaid && order.loyaltyPointsEarned > 0) {
            const customer = await tx.user.findUnique({
              where: { id: order.userId },
              select: { loyaltyPoints: true },
            });

            const currentPoints = customer?.loyaltyPoints || 0;
            const pointsToDeduct = Math.min(
                currentPoints,
                order.loyaltyPointsEarned,
            );

            if (pointsToDeduct > 0) {
              await tx.user.update({
                where: { id: order.userId },
                data: {
                  loyaltyPoints: { decrement: pointsToDeduct },
                },
              });
            }
          }
        }

        // 2. NẾU CHUYỂN SANG PAID -> Cộng điểm tích lũy vào tài khoản User
        if (
            updateOrderDto.status === OrderStatus.PAID &&
            order.status !== OrderStatus.PAID
        ) {
          if (order.loyaltyPointsEarned > 0) {
            await tx.user.update({
              where: { id: order.userId },
              data: {
                loyaltyPoints: { increment: order.loyaltyPointsEarned },
              },
            });
          }
        }

        // 3. TỰ ĐỘNG PHÁT SINH THÔNG BÁO CHO CẢ ADMIN VÀ KHÁCH HÀNG
        await this.notificationsService.notifyOrderStatusChanged(
            {
              id: order.id,
              userId: order.userId,
              finalAmount: order.finalAmount,
              user: order.user,
            },
            updateOrderDto.status,
            tx,
        );

        // 4. Đồng bộ lại cảnh báo tồn kho nếu có hoàn kho (Hủy đơn)
        if (updateOrderDto.status === OrderStatus.CANCELLED) {
          await this.notificationsService.syncStockAlerts(
              order.orderItems.map((item) => item.productId),
              tx,
          );
        }

        // 5. Cập nhật trạng thái đơn
        const updatedOrder = await tx.order.update({
          where: { id },
          data: {
            status: updateOrderDto.status,
            ...(updateOrderDto.status === OrderStatus.CANCELLED
                ? { loyaltyPointsEarned: 0 }
                : {}),
          },
          include: {
            orderItems: {
              include: {
                product: true,
                size: true,
                toppings: true,
              },
            },
          },
        });

        return {
          success: true,
          message: `Đã cập nhật đơn hàng sang trạng thái [${updatedOrder.status}]`,
          data: updatedOrder,
        };
      });
    }

    return {
      success: true,
      data: order,
    };
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.order.delete({ where: { id } });
  }
}