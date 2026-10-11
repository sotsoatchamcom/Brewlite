import type { Category, Topping, Product, Coupon, User, Order } from './types';

export const MOCK_CATEGORIES: Category[] = [
    { id: 1, name: 'Coffee', description: 'Espresso-based drinks', color: '#B45309', productCount: 3, createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z', isActive: true },
    { id: 2, name: 'Tea', description: 'Premium loose leaf teas', color: '#059669', productCount: 3, createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z', isActive: true },
    { id: 3, name: 'Smoothies', description: 'Fresh blended fruit smoothies', color: '#7C3AED', productCount: 3, createdAt: '2026-01-12T00:00:00Z', updatedAt: '2026-01-12T00:00:00Z', isActive: true },
];

export const MOCK_TOPPINGS: Topping[] = [
    { id: 1, name: 'Pearl (Boba)', price: 10000, isAvailable: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    { id: 2, name: 'Cheese Foam', price: 15000, isAvailable: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    { id: 3, name: 'Espresso Shot', price: 10000, isAvailable: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
];

export const MOCK_PRODUCTS: Product[] = [
    {
        id: 1, name: 'Caramel Latte', categoryId: 1, price: 35000,
        description: 'Smooth espresso with steamed milk and caramel sauce',
        sizes: [
            { id: 1, name: 'Small', surcharge: 0, isAvailable: true },
            { id: 2, name: 'Medium', surcharge: 10000, isAvailable: true },
            { id: 3, name: 'Large', surcharge: 20000, isAvailable: true }
        ],
        stock: 48, version: 1, isActive: true, createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-01-15T00:00:00Z',
    },
    {
        id: 2, name: 'Classic Milk Tea', categoryId: 2, price: 30000,
        description: 'Traditional milk tea with rich black tea blend',
        sizes: [
            { id: 4, name: 'Small', surcharge: 0, isAvailable: true },
            { id: 5, name: 'Large', surcharge: 10000, isAvailable: true }
        ],
        stock: 60, version: 1, isActive: true, createdAt: '2026-01-20T00:00:00Z', updatedAt: '2026-01-20T00:00:00Z',
    },
];

export const MOCK_COUPONS: Coupon[] = [
    { id: 1, code: 'WELCOME10', type: 'PERCENT', value: 10, minOrderValue: 30000, maxDiscount: 20000, expiresAt: '2027-11-01T00:00:00Z', startsAt: '2026-01-01T00:00:00Z', usageLimit: 100, usedCount: 23, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    { id: 2, code: 'FLAT5K', type: 'FIXED', value: 5000, minOrderValue: 20000, expiresAt: '2027-10-31T00:00:00Z', startsAt: '2026-01-01T00:00:00Z', usedCount: 41, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
];

export const MOCK_USERS: User[] = [
    { id: 1, name: 'Quản Trị Viên', email: 'admin@brewlite.com', role: 'ADMIN', loyaltyPoints: 0, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    { id: 2, name: 'Alice Brown', email: 'alice@email.com', role: 'CUSTOMER', loyaltyPoints: 895, isActive: true, createdAt: '2026-02-10T00:00:00Z', updatedAt: '2026-02-10T00:00:00Z', totalOrders: 12, totalSpent: 895000 },
];

export const MOCK_ORDERS: Order[] = [
    {
        id: 1, userId: 2,
        items: [
            { id: 1, productId: 1, productName: 'Caramel Latte', sizeName: 'Large', sizeSurcharge: 20000, toppings: [{ id: 1, toppingId: 1, toppingName: 'Pearl (Boba)', price: 10000 }], qty: 2, unitPrice: 35000, lineTotal: 130000 }
        ],
        discountAmount: 13000, total: 117000, status: 'COMPLETED', couponId: 1, discountCode: 'WELCOME10', loyaltyPointsEarned: 11, createdAt: '2026-10-01T08:30:00Z', updatedAt: '2026-10-01T09:00:00Z',
    },
    {
        id: 2, userId: 2,
        items: [
            { id: 2, productId: 2, productName: 'Classic Milk Tea', sizeName: 'Small', sizeSurcharge: 0, toppings: [], qty: 1, unitPrice: 30000, lineTotal: 30000 }
        ],
        discountAmount: 0, total: 30000, status: 'PENDING', loyaltyPointsEarned: 0, createdAt: '2026-10-04T09:15:00Z', updatedAt: '2026-10-04T09:45:00Z',
    }
];

export const CHART_REVENUE_7DAYS = [
    { day: 'Sep 28', revenue: 1425000 }, { day: 'Sep 29', revenue: 1987500 }, { day: 'Sep 30', revenue: 1672500 },
    { day: 'Oct 1', revenue: 2238000 }, { day: 'Oct 2', revenue: 1895000 }, { day: 'Oct 3', revenue: 2564000 }, { day: 'Oct 4', revenue: 1782000 },
];

export const CHART_REVENUE_6MONTHS = [
    { month: 'May', revenue: 38400000 }, { month: 'Jun', revenue: 42100000 }, { month: 'Jul', revenue: 56800000 },
    { month: 'Aug', revenue: 49200000 }, { month: 'Sep', revenue: 63400000 }, { month: 'Oct', revenue: 38200000 },
];

export const CHART_TOP_PRODUCTS = [
    { name: 'Classic Milk Tea', revenue: 12400000 }, { name: 'Caramel Latte', revenue: 9800000 },
];