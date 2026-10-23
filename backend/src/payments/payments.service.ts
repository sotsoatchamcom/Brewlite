import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  NotificationType,
  NotificationAudience,
  Prisma,
} from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(createPaymentDto: CreatePaymentDto) {
    const { orderId, idempotencyKey, method, simulateFailure } =
      createPaymentDto;

    // 1. KIỂM TRA IDEMPOTENCY TRƯỚC (Task 10 - Yêu cầu 2)
    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey: idempotencyKey! },
      include: { order: true },
    });

    if (existingPayment) {
      return {
        success: existingPayment.status === PaymentStatus.SUCCESS,
        message:
          existingPayment.status === PaymentStatus.SUCCESS
            ? 'Thanh toán đã được xử lý thành công trước đó (Idempotent response)'
            : 'Giao dịch này đã từng thất bại trước đó (Idempotent response)',
        isDuplicate: true,
        orderStatus: existingPayment.order?.status,
        data: existingPayment,
      };
    }

    // 2. TÌM ĐƠN HÀNG VÀ KIỂM TRA SƠ BỘ (Task 10 - Yêu cầu 1)
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}`);
    }

    if (order.status === OrderStatus.PAID) {
      throw new ConflictException(
        'Đơn hàng này đã được thanh toán thành công!',
      );
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Không thể thanh toán cho đơn hàng đã bị hủy!',
      );
    }
    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'Không thể thanh toán cho đơn hàng đã hoàn tất!',
      );
    }

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.PAYMENT_FAILED
    ) {
      throw new BadRequestException(
        `Không thể thanh toán: Đơn hàng đang ở trạng thái [${order.status}], chỉ cho phép thanh toán khi PENDING hoặc PAYMENT_FAILED!`,
      );
    }

    const paymentAmount = order.finalAmount;
    if (
      createPaymentDto.amount &&
      createPaymentDto.amount < order.finalAmount
    ) {
      throw new BadRequestException(
        `Số tiền thanh toán (${createPaymentDto.amount}đ) không đủ so với tổng cần thanh toán (${order.finalAmount}đ)!`,
      );
    }

    const transactionId = `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. MOCK PAYMENT: GIẢ LẬP THẤT BẠI (Task 8 - Có bọc catch P2002)
    if (simulateFailure) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const updateOrder = await tx.order.updateMany({
            where: {
              id: orderId,
              status: { in: [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED] },
            },
            data: { status: OrderStatus.PAYMENT_FAILED },
          });

          if (updateOrder.count === 0) {
            throw new ConflictException(
              'Trạng thái đơn hàng đã thay đổi bởi một giao dịch khác!',
            );
          }

          const failedPayment = await tx.payment.create({
            data: {
              orderId: order.id,
              idempotencyKey: idempotencyKey!,
              amount: paymentAmount,
              method: method as PaymentMethod,
              status: PaymentStatus.FAILED,
              transactionId,
            },
          });

          await tx.notification.create({
            data: {
              audience: NotificationAudience.ADMIN,
              type: NotificationType.PAYMENT_FAILED,
              title: `Thanh toán thất bại cho đơn #${order.id}`,
              message: `Khách hàng thanh toán không thành công qua ${method} số tiền ${paymentAmount.toLocaleString('vi-VN')}đ`,
              orderId: order.id,
            },
          });

          return {
            success: false,
            message:
              'Giao dịch thanh toán thất bại từ cổng thanh toán giả lập!',
            orderStatus: OrderStatus.PAYMENT_FAILED,
            data: failedPayment,
          };
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          const racePayment = await this.prisma.payment.findUnique({
            where: { idempotencyKey: idempotencyKey! },
          });
          return {
            success: false,
            message: 'Giao dịch thất bại (Idempotent concurrent response)',
            isDuplicate: true,
            data: racePayment,
          };
        }
        throw error;
      }
    }

    // 4. MOCK PAYMENT: NHÁNH THÀNH CÔNG (Khóa nguyên tử atomic update)
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Khóa lạc quan chống Race Condition giữa 2 key khác nhau
        const pointsEarned = Math.floor(paymentAmount / 10000);

        const updateOrderResult = await tx.order.updateMany({
          where: {
            id: order.id,
            status: { in: [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED] },
          },
          data: {
            status: OrderStatus.PAID,
            loyaltyPointsEarned: pointsEarned,
          },
        });

        if (updateOrderResult.count === 0) {
          throw new ConflictException(
            'Đơn hàng này vừa được thanh toán thành công bởi một tiến trình khác!',
          );
        }

        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            idempotencyKey: idempotencyKey!,
            amount: paymentAmount,
            method: method as PaymentMethod,
            status: PaymentStatus.SUCCESS,
            transactionId,
          },
        });

        if (order.userId && pointsEarned > 0) {
          await tx.user.update({
            where: { id: order.userId },
            data: {
              loyaltyPoints: { increment: pointsEarned },
            },
          });
        }

        await tx.notification.create({
          data: {
            audience: NotificationAudience.ADMIN,
            type: NotificationType.ORDER_UPDATE,
            title: `Đơn hàng #${order.id} đã thanh toán thành công`,
            message: `Nhận ${paymentAmount.toLocaleString('vi-VN')}đ qua ${method}. Mời Barista bắt đầu pha chế!`,
            orderId: order.id,
          },
        });

        return {
          success: true,
          message: 'Thanh toán thành công qua cổng thanh toán không tiền mặt',
          orderStatus: OrderStatus.PAID,
          data: payment,
          loyaltyPointsEarned: pointsEarned,
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const racePayment = await this.prisma.payment.findUnique({
          where: { idempotencyKey: idempotencyKey! },
        });
        return {
          success: racePayment?.status === PaymentStatus.SUCCESS,
          message: 'Thanh toán đã được xử lý (Idempotent concurrent response)',
          isDuplicate: true,
          data: racePayment,
        };
      }
      throw error;
    }
  }

  // Tích hợp phân trang và lọc chuẩn theo QueryPaymentDto
  async findAll(query?: QueryPaymentDto) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {
      ...(query?.method ? { method: query.method } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              total: true,
              finalAmount: true,
              status: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
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
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            orderItems: true,
            user: true,
          },
        },
      },
    });
    if (!payment) {
      throw new NotFoundException(`Không tìm thấy giao dịch thanh toán #${id}`);
    }
    return payment;
  }

  findByOrderId(orderId: number) {
    return this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { id: 'desc' },
    });
  }
}
