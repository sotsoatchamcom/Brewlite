import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderStatus } from '@prisma/client';

// Mock @nestjs/common để chặn Node nạp file Pure ESM
jest.mock('@nestjs/common', () => {
    class BadRequestException extends Error {
        constructor(message = 'Bad Request') {
            super(message);
            this.name = 'BadRequestException';
        }
    }
    return {
        Injectable: () => (target: any) => target,
        Logger: class { log() {} warn() {} error() {} },
        BadRequestException,
        NotFoundException: class extends Error {},
        ConflictException: class extends Error {},
    };
});

jest.mock('@nestjs/schedule', () => ({
    Cron: () => (target: any, key: any, descriptor: any) => descriptor,
    CronExpression: { EVERY_MINUTE: '* * * * *' },
}));

describe('Tiêu chí (a): Order State Machine Transition Guard', () => {
    let service: OrdersService;
    let mockPrisma: any;
    let mockNotifications: any;

    beforeEach(() => {
        mockPrisma = {
            order: {
                findUnique: jest.fn(),
                update: jest.fn(),
            },
            product: { update: jest.fn() },
            coupon: { update: jest.fn() },
            user: { findUnique: jest.fn(), update: jest.fn() },
            $transaction: jest.fn((cb: any) => cb(mockPrisma)),
        };

        mockNotifications = {
            notifyOrderStatusChanged: jest.fn(),
            syncStockAlerts: jest.fn(),
        };

        service = new OrdersService(mockPrisma, mockNotifications);
    });

    describe('1. Chặn các bước chuyển trạng thái không hợp lệ', () => {
        const invalidTransitions = [
            { from: OrderStatus.COMPLETED, to: OrderStatus.PENDING, desc: 'Đã hoàn tất không thể quay lại chờ duyệt' },
            { from: OrderStatus.COMPLETED, to: OrderStatus.PAID, desc: 'Đã hoàn tất không thể quay lại đã thanh toán' },
            { from: OrderStatus.CANCELLED, to: OrderStatus.PAID, desc: 'Đã hủy không thể chuyển sang đã thanh toán' },
            { from: OrderStatus.CANCELLED, to: OrderStatus.PREPARING, desc: 'Đã hủy không thể chuyển sang pha chế' },
            { from: OrderStatus.PENDING, to: OrderStatus.COMPLETED, desc: 'Chưa thanh toán/pha chế không thể nhảy cóc sang hoàn tất' },
            { from: OrderStatus.PENDING, to: OrderStatus.READY, desc: 'Chưa pha chế không thể nhảy cóc sang mời nhận nước' },
            { from: OrderStatus.PAID, to: OrderStatus.READY, desc: 'Đã thanh toán phải qua PREPARING mới tới READY' },
        ];

        invalidTransitions.forEach(({ from, to, desc }) => {
            it(`Phải chặn: [${from} -> ${to}] (${desc})`, async () => {
                (jest.spyOn(service, 'findOne') as any).mockResolvedValue({
                    id: 1,
                    status: from,
                    orderItems: [],
                });

                await expect(service.update(1, { status: to })).rejects.toThrow(BadRequestException);
            });
        });
    });

    describe('2. Cho phép các bước chuyển trạng thái hợp lệ', () => {
        const validTransitions = [
            { from: OrderStatus.PENDING, to: OrderStatus.PAID },
            { from: OrderStatus.PENDING, to: OrderStatus.PAYMENT_FAILED },
            { from: OrderStatus.PENDING, to: OrderStatus.CANCELLED },
            { from: OrderStatus.PAYMENT_FAILED, to: OrderStatus.PAID },
            { from: OrderStatus.PAYMENT_FAILED, to: OrderStatus.CANCELLED },
            { from: OrderStatus.PAID, to: OrderStatus.PREPARING },
            { from: OrderStatus.PREPARING, to: OrderStatus.READY },
            { from: OrderStatus.READY, to: OrderStatus.COMPLETED },
        ];

        validTransitions.forEach(({ from, to }) => {
            it(`Cho phép: [${from} -> ${to}]`, async () => {
                (jest.spyOn(service, 'findOne') as any).mockResolvedValue({
                    id: 1,
                    status: from,
                    orderItems: [],
                });

                (mockPrisma.order.update as any).mockResolvedValue({
                    id: 1,
                    status: to,
                    orderItems: [],
                });

                const result = await service.update(1, { status: to });
                expect(result.data.status).toBe(to);
            });
        });
    });
});