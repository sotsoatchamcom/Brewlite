import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
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

    // 1. KIỂM TRA IDEMPOTENCY (Task 10 - Yêu cầu 2)
    // Tận dụng index @unique bằng findUnique
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

    // 2. TÌM ĐƠN HÀNG VÀ KIỂM TRA STATE MACHINE (Task 10 - Yêu cầu 1)
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

    // 3. MOCK PAYMENT: GIẢ LẬP THẤT BẠI (Task 8)
    if (simulateFailure) {
      return this.prisma.$transaction(async (tx) => {
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

        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PAYMENT_FAILED },
        });

        // Bắn thông báo cảnh báo lỗi thanh toán cho Admin
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
          message: 'Giao dịch thanh toán thất bại từ cổng thanh toán giả lập!',
          orderStatus: OrderStatus.PAYMENT_FAILED,
          data: failedPayment,
        };
      });
    }

    // 4. MOCK PAYMENT: NHÁNH THÀNH CÔNG
    try {
      return await this.prisma.$transaction(async (tx) => {
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

        // Tích điểm Loyalty Points (Task 10 - Yêu cầu 4)
        const pointsEarned = Math.floor(paymentAmount / 10000);

        if (order.userId && pointsEarned > 0) {
          await tx.user.update({
            where: { id: order.userId },
            data: {
              loyaltyPoints: { increment: pointsEarned },
            },
          });
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            loyaltyPointsEarned: pointsEarned,
          },
        });

        // Tạo thông báo đơn mới đã thanh toán cho Admin
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

  findAll() {
    return this.prisma.payment.findMany({
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
    });
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
