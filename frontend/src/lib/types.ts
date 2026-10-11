export type UserRole = 'ADMIN' | 'CUSTOMER';
export type OrderStatus =
    | 'PENDING'
    | 'PAID'
    | 'PREPARING'
    | 'READY'
    | 'COMPLETED'
    | 'PAYMENT_FAILED'
    | 'CANCELLED';
export type DiscountType = 'PERCENT' | 'FIXED';
export type PaymentMethod = 'WALLET' | 'CARD';
export type PaymentStatus = 'SUCCESS' | 'FAILED';

export interface Category {
    id: number;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    // Dành cho hiển thị UI (Dữ liệu tính toán từ backend)
    productCount?: number;
    color?: string; // Giữ lại cho Figma render nếu cần
}

export interface Topping {
    id: number;
    name: string;
    price: number;
    imageUrl?: string | null;
    isAvailable: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ProductSize {
    id: number;
    name: string;
    surcharge: number;
    isAvailable: boolean;
}

export interface Product {
    id: number;
    name: string;
    price: number;
    description?: string | null;
    categoryId?: number | null;
    category?: Category; // Quan hệ
    sizes: ProductSize[];
    imageUrl?: string | null;
    stock: number;
    version: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Coupon {
    id: number;
    code: string;
    type: DiscountType;
    value: number;
    minOrderValue: number;
    maxDiscount?: number | null;
    usageLimit?: number | null;
    usedCount: number;
    startsAt: string;
    expiresAt: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface User {
    id: number;
    email: string;
    name?: string | null;
    phone?: string | null;
    gender?: string | null;
    role: UserRole;
    loyaltyPoints: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    // Dành cho UI Dashboard
    totalOrders?: number;
    totalSpent?: number;
}

export interface OrderItemTopping {
    id: number;
    toppingId: number;
    toppingName: string;
    price: number;
}

export interface OrderItem {
    id: number;
    productId: number;
    productSizeId?: number | null;
    productName: string;
    unitPrice: number;
    sizeName?: string | null;
    sizeSurcharge: number;
    qty: number;
    lineTotal: number;
    toppings: OrderItemTopping[];
}

export interface Order {
    id: number;
    userId: number;
    user?: User; // Quan hệ
    couponId?: number | null;
    status: OrderStatus;
    total: number;
    discountCode?: string | null;
    discountAmount: number;
    loyaltyPointsEarned: number;
    items: OrderItem[]; // Prisma gọi là orderItems
    createdAt: string;
    updatedAt: string;
}

export interface AuthUser {
    id: number;
    name?: string | null;
    email: string;
    role: UserRole;
}