import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { OrderStatus, DiscountType } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  // =========================================================================
  // TASK 10 (Yêu cầu 1): ORDER STATE MACHINE
  // =========================================================================
  private readonly allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [
      OrderStatus.PAID,
      OrderStatus.PAYMENT_FAILED,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.PAYMENT_FAILED]: [OrderStatus.PENDING, OrderStatus.CANCELLED],
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
  // TASK 6 & TASK 10: TẠO ĐƠN HÀNG, TỒN KHO, TOPPINGS & COUPON
  // =========================================================================
  async create(createOrderDto: CreateOrderDto) {
    const { items, userId, couponCode } = createOrderDto;

    if (!userId) {
      throw new BadRequestException('Mã khách hàng (userId) là bắt buộc!');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Kiểm tra User có tồn tại không để tránh lỗi Foreign Key
      const user = await tx.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException(`Khách hàng #${userId} không tồn tại!`);
      }

      let subtotal = 0;
      const orderItemsData: any[] = [];

      // 2. Duyệt qua từng món trong giỏ hàng
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(
            `Sản phẩm #${item.productId} không tồn tại!`,
          );
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Sản phẩm "${product.name}" không đủ tồn kho (Còn: ${product.stock}, yêu cầu: ${item.quantity})!`,
          );
        }

        // Trừ tồn kho sản phẩm trong transaction
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: item.quantity } },
        });

        // 3. Tra cứu Size & phụ thu từ ProductSize
        const targetSize = (item.size || 'M').toUpperCase();
        const productSize = await tx.productSize.findFirst({
          where: {
            productId: product.id,
            name: targetSize,
            isAvailable: true,
          },
        });

        const sizeName = productSize ? productSize.name : targetSize;
        const sizeSurcharge = productSize ? productSize.surcharge : 0;
        const productSizeId = productSize ? productSize.id : null;

        // 4. Xử lý Topping nếu có
        let toppingUnitPrice = 0;
        const toppingsCreateData: any[] = [];

        if (item.toppingIds && item.toppingIds.length > 0) {
          const toppings = await tx.topping.findMany({
            where: {
              id: { in: item.toppingIds },
              isAvailable: true,
            },
          });

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

        // Đơn giá 1 ly = Giá gốc sản phẩm + Phụ thu size + Tổng tiền topping
        const singleCupPrice = product.price + sizeSurcharge + toppingUnitPrice;
        const itemLineTotal = singleCupPrice * item.quantity;
        subtotal += itemLineTotal;

        // Map chính xác các cột của bảng OrderItem
        orderItemsData.push({
          productId: product.id,
          productSizeId: productSizeId,
          productName: product.name,
          unitPrice: product.price,
          sizeName: sizeName,
          sizeSurcharge: sizeSurcharge,
          qty: item.quantity, // Đã map đúng qty
          lineTotal: itemLineTotal, // Đã bổ sung lineTotal
          ...(toppingsCreateData.length > 0
            ? {
                toppings: {
                  create: toppingsCreateData,
                },
              }
            : {}),
        });
      }

      // 5. Xử lý mã giảm giá Coupon theo đúng enum DiscountType
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

        // Nếu hợp lệ toàn bộ điều kiện:
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

      return {
        success: true,
        message: 'Tạo đơn hàng thành công',
        orderId: newOrder.id,
        status: newOrder.status,
        total: newOrder.total,
        discountAmount: newOrder.discountAmount,
        finalAmount: newOrder.finalAmount,
        data: newOrder,
      };
    });
  }

  // =========================================================================
  // TASK 9: TRA CỨU ĐƠN HÀNG
  // =========================================================================
  async findAll(query?: QueryOrderDto) {
    const page = query?.page || 1;
    const limit = query?.limit || 100;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.status) where.status = query.status;
    if (query?.userId) where.userId = query.userId;

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
  // TASK 10 (Yêu cầu 1): CẬP NHẬT TRẠNG THÁI
  // =========================================================================
  async update(id: number, updateOrderDto: UpdateOrderDto) {
    const order = await this.findOne(id);

    if (updateOrderDto.status) {
      this.assertTransition(order.status, updateOrderDto.status);

      // Nếu hủy đơn, hoàn lại tồn kho theo cột qty
      if (updateOrderDto.status === OrderStatus.CANCELLED) {
        await this.prisma.$transaction(async (tx) => {
          for (const item of order.orderItems) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  increment: item.qty,
                },
              },
            });
          }
        });
      }
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status: updateOrderDto.status || order.status,
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
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.order.delete({ where: { id } });
  }
}
