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
  Prisma,
} from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(createPaymentDto: CreatePaymentDto) {
    const { orderId, idempotencyKey, method, simulateFailure } =
      createPaymentDto;

    // 1. KIỂM TRA IDEMPOTENCY (Task 10 - Yêu cầu 2)
    // Nếu request gửi lại cùng một Idempotency-Key, trả về kết quả cũ đã lưu
    const existingPayment = await this.prisma.payment.findFirst({
      where: { idempotencyKey },
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

    // Chặn nếu đơn hàng đã được thanh toán hoặc đã hoàn tất/hủy
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

    // Theo State Machine: Chỉ nhận thanh toán khi đơn ở PENDING hoặc thử lại từ PAYMENT_FAILED
    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.PAYMENT_FAILED
    ) {
      throw new BadRequestException(
        `Không thể thanh toán: Đơn hàng đang ở trạng thái [${order.status}], chỉ cho phép thanh toán khi PENDING hoặc PAYMENT_FAILED!`,
      );
    }

    // LẤY ĐÚNG SỐ TIỀN THỰC TẾ PHẢI TRẢ (finalAmount sau khi trừ coupon)
    const paymentAmount = createPaymentDto.amount ?? order.finalAmount;

    // Kiểm tra nếu client truyền amount mà nhỏ hơn số tiền đơn hàng yêu cầu
    if (
      createPaymentDto.amount &&
      createPaymentDto.amount < order.finalAmount
    ) {
      throw new BadRequestException(
        `Số tiền thanh toán (${createPaymentDto.amount}đ) không đủ so với tổng cần thanh toán (${order.finalAmount}đ)!`,
      );
    }

    // Sinh mã giao dịch ngẫu nhiên mô phỏng cổng thanh toán
    const transactionId = `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. MOCK PAYMENT SERVICE: NHÁNH GIẢ LẬP THẤT BẠI (Task 8)
    if (simulateFailure) {
      return this.prisma.$transaction(async (tx) => {
        // Lưu lại giao dịch FAILED vào bảng Payment để phục vụ tra cứu
        const failedPayment = await tx.payment.create({
          data: {
            orderId: order.id,
            idempotencyKey,
            amount: paymentAmount,
            method: method as PaymentMethod,
            status: PaymentStatus.FAILED,
            transactionId,
          },
        });

        // Chuyển trạng thái đơn sang PAYMENT_FAILED
        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PAYMENT_FAILED },
        });

        return {
          success: false,
          message: 'Giao dịch thanh toán thất bại từ cổng thanh toán giả lập!',
          orderStatus: OrderStatus.PAYMENT_FAILED,
          data: failedPayment,
        };
      });
    }

    // 4. MOCK PAYMENT SERVICE: NHÁNH THÀNH CÔNG (Prisma Transaction)
    try {
      return await this.prisma.$transaction(async (tx) => {
        // a. Lưu bản ghi Payment với status SUCCESS
        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            idempotencyKey,
            amount: paymentAmount,
            method: method as PaymentMethod,
            status: PaymentStatus.SUCCESS,
            transactionId,
          },
        });

        // b. Tích lũy điểm thưởng loyalty cho khách sau khi đơn PAID (Task 10 - Yêu cầu 4)
        // 10.000 VNĐ = 1 điểm tích lũy dựa trên số tiền thực trả
        const pointsEarned = Math.floor(paymentAmount / 10000);

        if (order.userId && pointsEarned > 0) {
          await tx.user.update({
            where: { id: order.userId },
            data: {
              loyaltyPoints: { increment: pointsEarned },
            },
          });
        }

        // c. Chuyển trạng thái đơn sang PAID và cập nhật lại điểm tích lũy thực tế
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            loyaltyPointsEarned: pointsEarned,
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
      // Bắt lỗi xung đột Idempotency-Key khi có 2 request gửi đồng thời (Task 10 Concurrency)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const racePayment = await this.prisma.payment.findUnique({
          where: { idempotencyKey },
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
