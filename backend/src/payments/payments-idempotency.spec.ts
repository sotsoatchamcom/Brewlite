import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PaymentsService } from './payments.service';
import { OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';

// Mock @nestjs/common để chặn Node nạp file Pure ESM
jest.mock('@nestjs/common', () => ({
    Injectable: () => (target: any) => target,
    NotFoundException: class extends Error {},
    BadRequestException: class extends Error {},
    ConflictException: class extends Error {},
}));

describe('Tiêu chí (b): Idempotency Key - Chống tạo trùng lặp giao dịch', () => {
    let service: PaymentsService;
    let mockPrisma: any;

    const mockOrderId = 100;
    const mockIdempotencyKey = 'unique-uuid-key-12345';
    const mockFinalAmount = 45000;

    beforeEach(() => {
        mockPrisma = {
            payment: {
                findUnique: jest.fn(),
                create: jest.fn(),
            },
            order: {
                findUnique: jest.fn(),
                updateMany: jest.fn(),
            },
            user: {
                update: jest.fn(),
            },
            notification: {
                create: jest.fn(),
            },
            $transaction: jest.fn((cb: any) => cb(mockPrisma)),
        };

        service = new PaymentsService(mockPrisma);
    });

    it('Lần gọi 1: Chưa có key -> Ghi nhận thanh toán mới và trừ tiền/cộng điểm', async () => {
        (mockPrisma.payment.findUnique as any).mockResolvedValue(null);

        (mockPrisma.order.findUnique as any).mockResolvedValue({
            id: mockOrderId,
            status: OrderStatus.PENDING,
            finalAmount: mockFinalAmount,
            userId: 1,
        });

        (mockPrisma.order.updateMany as any).mockResolvedValue({ count: 1 });
        (mockPrisma.payment.create as any).mockResolvedValue({
            id: 1,
            orderId: mockOrderId,
            idempotencyKey: mockIdempotencyKey,
            amount: mockFinalAmount,
            status: PaymentStatus.SUCCESS,
            method: PaymentMethod.WALLET,
        });

        const result: any = await service.create({
            orderId: mockOrderId,
            idempotencyKey: mockIdempotencyKey,
            method: PaymentMethod.WALLET,
            amount: mockFinalAmount,
        });

        expect(result.success).toBe(true);
        expect(result.isDuplicate).toBeUndefined();
        expect(mockPrisma.payment.create).toHaveBeenCalledTimes(1);
        expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
    });

    it('Lần gọi 2 (Cùng key): Nhận diện trùng lặp -> Trả kết quả cũ, KHÔNG tạo record mới, KHÔNG cộng điểm lần 2', async () => {
        const existingPaymentRecord = {
            id: 1,
            orderId: mockOrderId,
            idempotencyKey: mockIdempotencyKey,
            amount: mockFinalAmount,
            status: PaymentStatus.SUCCESS,
            method: PaymentMethod.WALLET,
            order: { status: OrderStatus.PAID },
        };
        (mockPrisma.payment.findUnique as any).mockResolvedValue(existingPaymentRecord);

        const result: any = await service.create({
            orderId: mockOrderId,
            idempotencyKey: mockIdempotencyKey,
            method: PaymentMethod.WALLET,
            amount: mockFinalAmount,
        });

        expect(result.success).toBe(true);
        expect(result.isDuplicate).toBe(true);
        expect(result.message).toContain('Idempotent response');

        expect(mockPrisma.payment.create).not.toHaveBeenCalled();
        expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
});