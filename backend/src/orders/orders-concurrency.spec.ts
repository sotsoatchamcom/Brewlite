import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderStatus } from '@prisma/client';

// Mock @nestjs/common để chặn Node nạp file Pure ESM
jest.mock('@nestjs/common', () => {
    class ConflictException extends Error {
        constructor(message = 'Conflict') {
            super(message);
            this.name = 'ConflictException';
        }
    }
    return {
        Injectable: () => (target: any) => target,
        Logger: class { log() {} warn() {} error() {} },
        BadRequestException: class extends Error {},
        ConflictException,
    };
});

jest.mock('@nestjs/schedule', () => ({
    Cron: () => (target: any, key: any, descriptor: any) => descriptor,
    CronExpression: { EVERY_MINUTE: '* * * * *' },
}));

describe('Tiêu chí (c): Concurrency & Optimistic Locking - Chống bán vượt tồn kho (Overselling)', () => {
    let service: OrdersService;
    let mockPrisma: any;
    let mockNotifications: any;

    beforeEach(() => {
        mockPrisma = {
            user: { findUnique: jest.fn() },
            product: {
                findUnique: jest.fn(),
                updateMany: jest.fn(),
            },
            productSize: { findMany: jest.fn() },
            order: { create: jest.fn() },
            $transaction: jest.fn((cb: any) => cb(mockPrisma)),
        };

        mockNotifications = {
            notifyOrderCreated: jest.fn(),
            syncStockAlerts: jest.fn(),
        };

        service = new OrdersService(mockPrisma, mockNotifications);
    });

    it('Kho còn 1 ly, 3 request gửi đồng thời: Chỉ 1 request thành công, 2 request bị chặn với ConflictException', async () => {
        const productId = 10;
        const initialStock = 1;
        const initialVersion = 1;

        (mockPrisma.user.findUnique as any).mockResolvedValue({
            id: 1,
            isActive: true,
        });

        (mockPrisma.product.findUnique as any).mockResolvedValue({
            id: productId,
            name: 'Trà Sữa Oolong',
            price: 35000,
            stock: initialStock,
            version: initialVersion,
            isActive: true,
            category: { isActive: true, toppings: [] },
        });

        (mockPrisma.productSize.findMany as any).mockResolvedValue([]);

        let hasUpdated = false;
        (mockPrisma.product.updateMany as any).mockImplementation((async (args: any) => {
            if (!hasUpdated && args?.where?.version === 1 && args?.where?.stock?.gte >= 1) {
                hasUpdated = true;
                return { count: 1 };
            }
            return { count: 0 };
        }) as any);

        (mockPrisma.order.create as any).mockResolvedValue({
            id: 999,
            status: OrderStatus.PENDING,
            total: 35000,
            finalAmount: 35000,
            orderItems: [],
        });

        const orderPayload = {
            items: [{ productId, quantity: 1, size: 'M' }],
        };

        const req1 = service.create(1, orderPayload as any);
        const req2 = service.create(1, orderPayload as any);
        const req3 = service.create(1, orderPayload as any);

        const results = await Promise.allSettled([req1, req2, req3]);

        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');

        expect(fulfilled.length).toBe(1);
        expect(rejected.length).toBe(2);

        rejected.forEach((rej: any) => {
            expect(rej.reason).toBeInstanceOf(ConflictException);
            expect(rej.reason.message).toContain('biến động tồn kho do người khác đặt cùng lúc');
        });
    });
});