import {
  PrismaClient,
  Role,
  DiscountType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';
import type { Prisma, Coupon } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// ---------------------------------------------------------
// Tiện ích: số giả ngẫu nhiên có seed cố định => mỗi lần nạp dữ liệu giống nhau
// ---------------------------------------------------------
let state = 42;
const rand = () => {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
};
const randInt = (min: number, max: number) =>
  min + Math.floor(rand() * (max - min + 1));
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Các trạng thái đã thanh toán thành công (đã trừ tồn kho, đã cộng điểm)
const PAID_GROUP: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.COMPLETED,
];

// Đơn tạo cách hiện tại bao nhiêu giờ (min, max) tùy trạng thái, cho dữ liệu trông thực tế
const AGE_HOURS: Record<OrderStatus, [number, number]> = {
  [OrderStatus.COMPLETED]: [72, 336],
  [OrderStatus.CANCELLED]: [24, 240],
  [OrderStatus.PAID]: [0.2, 8],
  [OrderStatus.PREPARING]: [0.2, 2],
  [OrderStatus.READY]: [0.1, 1],
  [OrderStatus.PENDING]: [0.05, 1],
  [OrderStatus.PAYMENT_FAILED]: [0.1, 3],
};

// Phân bố khớp màn "Đơn hàng" của admin:
// Tiếp nhận 27 | Đang xử lí 4 | Hoàn thành 9 | Đã huỷ 3  => Tất cả 43
// + 1 đơn PENDING và 1 đơn PAYMENT_FAILED (chưa thanh toán, không hiện ở các tab)
const STATUS_PLAN: OrderStatus[] = [
  ...Array(27).fill(OrderStatus.PAID),
  ...Array(2).fill(OrderStatus.PREPARING),
  ...Array(2).fill(OrderStatus.READY),
  ...Array(9).fill(OrderStatus.COMPLETED),
  ...Array(3).fill(OrderStatus.CANCELLED),
  OrderStatus.PENDING,
  OrderStatus.PAYMENT_FAILED,
];

function calcDiscount(coupon: Coupon, subtotal: number): number {
  const raw =
    coupon.type === DiscountType.PERCENT
      ? Math.floor((subtotal * coupon.value) / 100)
      : coupon.value;
  const capped = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
  return Math.min(capped, subtotal);
}

async function main() {
  const saltRounds = 10;

  console.log('Đang dọn dẹp dữ liệu cũ...');
  // Xóa theo thứ tự bảng con -> bảng cha để không vi phạm khóa ngoại
  await prisma.orderItemTopping.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.productSize.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.topping.deleteMany();
  await prisma.user.deleteMany();

  // 1. Tài khoản: 1 Admin + 4 khách hàng demo
  const adminHash = await bcrypt.hash('Admin@2026', saltRounds);
  const customerHash = await bcrypt.hash('Customer@2026', saltRounds);

  await prisma.user.create({
    data: {
      email: 'admin@brewlite.com',
      passwordHash: adminHash,
      name: 'Quản Trị Viên',
      role: Role.ADMIN,
    },
  });

  const customerData = [
    {
      email: 'customer@brewlite.com',
      name: 'Khách Hàng Demo',
      phone: '0900000001',
      gender: 'Nam',
    },
    {
      email: 'lan@brewlite.com',
      name: 'Nguyễn Thị Lan',
      phone: '0900000002',
      gender: 'Nữ',
    },
    {
      email: 'minh@brewlite.com',
      name: 'Trần Văn Minh',
      phone: '0900000003',
      gender: 'Nam',
    },
    {
      email: 'huong@brewlite.com',
      name: 'Lê Thu Hương',
      phone: '0900000004',
      gender: 'Nữ',
    },
  ];
  const customers = [];
  for (const c of customerData) {
    customers.push(
      await prisma.user.create({
        data: { ...c, passwordHash: customerHash, role: Role.CUSTOMER },
      }),
    );
  }
  console.log('Đã tạo Admin và 4 khách hàng demo');

  // 2. Danh mục
  const categoryCoffee = await prisma.category.create({
    data: {
      name: 'Cà Phê',
      description: 'Cà phê',
      imageUrl: '/uploads/default-cat-coffee.jpg',
    },
  });
  const categoryMilkTea = await prisma.category.create({
    data: {
      name: 'Trà Sữa Pha Máy',
      description: 'Trà sữa',
      imageUrl: '/uploads/default-cat-milktea.jpg',
    },
  });
  const categoryFruitTea = await prisma.category.create({
    data: {
      name: 'Trà Trái Cây',
      description: 'Trà trái cây',
      imageUrl: '/uploads/default-cat-fruittea.jpg',
    },
  });

  // 3. Topping (ĐÃ BỔ SUNG IMAGE URL)
  await prisma.topping.createMany({
    data: [
      {
        name: 'Trân châu trắng',
        price: 10000,
        imageUrl: '/uploads/default-topping.jpg',
      },
      {
        name: 'Kem Macchiato',
        price: 15000,
        imageUrl: '/uploads/default-topping.jpg',
      },
      {
        name: 'Thạch đào',
        price: 10000,
        imageUrl: '/uploads/default-topping.jpg',
      },
      {
        name: 'Trân châu đen',
        price: 5000,
        imageUrl: '/uploads/default-topping.jpg',
      },
      {
        name: 'Thạch trái cây',
        price: 10000,
        imageUrl: '/uploads/default-topping.jpg',
      },
    ],
  });

  // 4. Mã khuyến mãi (phục vụ Task 10), gồm cả mã dùng để test trường hợp không hợp lệ
  const now = new Date();
  const yesterday = new Date(now.getTime() - DAY);
  const nextYear = new Date(now);
  nextYear.setFullYear(now.getFullYear() + 1);

  await prisma.coupon.createMany({
    data: [
      {
        code: 'WELCOME10',
        type: DiscountType.PERCENT,
        value: 10,
        minOrderValue: 30000,
        maxDiscount: 20000,
        usageLimit: 100,
        startsAt: yesterday,
        expiresAt: nextYear,
      },
      {
        code: 'GIAM5K',
        type: DiscountType.FIXED,
        value: 5000,
        minOrderValue: 20000,
        startsAt: yesterday,
        expiresAt: nextYear,
      },
      {
        // Mã đã hết hạn: test "mã không hợp lệ"
        code: 'EXPIRED10',
        type: DiscountType.PERCENT,
        value: 10,
        minOrderValue: 0,
        startsAt: new Date(now.getTime() - 30 * DAY),
        expiresAt: new Date(now.getTime() - 7 * DAY),
      },
      {
        // Mã đã hết lượt dùng: test "mã không hợp lệ"
        code: 'HETLUOT',
        type: DiscountType.FIXED,
        value: 10000,
        minOrderValue: 0,
        usageLimit: 1,
        usedCount: 1,
        startsAt: yesterday,
        expiresAt: nextYear,
      },
    ],
  });
  console.log('Đã tạo topping và mã khuyến mãi');

  // 5. Size
  const standardSizes = [
    { name: 'S', surcharge: 0 },
    { name: 'M', surcharge: 5000 },
    { name: 'L', surcharge: 10000 },
  ];

  const teaSizes = [
    { name: 'M', surcharge: 0 },
    { name: 'L', surcharge: 10000 },
  ];

  // 6. Menu 18 món
  const coffeeProducts = [
    { name: 'Coffee Đen', price: 15000 },
    { name: 'Coffee Sữa', price: 20000 },
    { name: 'Bạc Xỉu', price: 25000 },
    { name: 'Cacao', price: 25000 },
    { name: 'Coffee Hạnh Nhân', price: 25000 },
    { name: 'Coffee Kem Muối', price: 25000 },
  ];

  for (const item of coffeeProducts) {
    await prisma.product.create({
      data: {
        name: item.name,
        price: item.price,
        stock: 100,
        categoryId: categoryCoffee.id,
        imageUrl: '/uploads/default-product.jpg',
        description: `Sản phẩm ${item.name} được pha chế từ những nguyên liệu chọn lọc nhất, mang lại hương vị đậm đà khó quên.`,
        sizes: { create: standardSizes },
      },
    });
  }

  const milkTeaProducts = [
    { name: 'Trà Xanh Sữa Thái', price: 20000 },
    { name: 'Trà Sữa Đông Dương', price: 30000 },
    { name: 'Trà Sữa Ô Long', price: 25000 },
    { name: 'Trà Sữa Hạnh Nhân', price: 30000 },
    { name: 'Trà Sữa Nguyên Lá', price: 25000 },
    { name: 'Trà Sữa Ô Long Kem Trứng', price: 30000 },
  ];

  for (const item of milkTeaProducts) {
    await prisma.product.create({
      data: {
        name: item.name,
        price: item.price,
        stock: 100,
        categoryId: categoryMilkTea.id,
        imageUrl: '/uploads/default-product.jpg',
        description: `Ly ${item.name} thơm ngon đậm đà.`,
        sizes: { create: standardSizes },
      },
    });
  }

  const fruitTeaProducts = [
    { name: 'Trà Đào', price: 30000 },
    { name: 'Trà Dâu', price: 30000 },
    { name: 'Trà Sả Đào', price: 30000 },
    { name: 'Trà Lài Vải', price: 30000 },
    { name: 'Trà Ổi Hồng', price: 30000 },
    { name: 'Trà Đào Chanh', price: 30000 },
  ];

  for (const item of fruitTeaProducts) {
    await prisma.product.create({
      data: {
        name: item.name,
        price: item.price,
        stock: 100,
        categoryId: categoryFruitTea.id,
        imageUrl: '/uploads/default-product.jpg',
        description: `Ly ${item.name} tươi mát lạnh, giải nhiệt ngày hè.`,
        sizes: { create: teaSizes },
      },
    });
  }
  console.log('Đã tạo menu 18 món');

  // 7. Đơn hàng mẫu (đủ trạng thái để xem màn "Đơn hàng" của admin)
  const products = await prisma.product.findMany({
    include: { sizes: { where: { isAvailable: true } } },
    orderBy: { id: 'asc' },
  });
  const toppings = await prisma.topping.findMany({
    where: { isAvailable: true },
  });
  const welcome = await prisma.coupon.findUniqueOrThrow({
    where: { code: 'WELCOME10' },
  });
  const giam5k = await prisma.coupon.findUniqueOrThrow({
    where: { code: 'GIAM5K' },
  });

  // Sắp xếp theo thời gian tạo để đơn cũ có id nhỏ hơn đơn mới
  const orderSpecs = STATUS_PLAN.map((status) => {
    const [minH, maxH] = AGE_HOURS[status];
    const hoursAgo = minH + rand() * (maxH - minH);
    return { status, createdAt: new Date(Date.now() - hoursAgo * HOUR) };
  }).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const stockUsed = new Map<number, number>(); // productId -> số ly đã bán
  const couponUsed = new Map<number, number>(); // couponId -> số lần dùng
  const pointsEarned = new Map<number, number>(); // userId -> điểm tích lũy

  let index = 0;
  for (const spec of orderSpecs) {
    index++;
    const customer = pick(customers);

    // --- Các món trong đơn ---
    const items: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = [];
    let subtotal = 0;
    const itemCount = randInt(1, 3);

    for (let i = 0; i < itemCount; i++) {
      const product = pick(products);
      const size = pick(product.sizes);
      const chosenToppings = shuffle(toppings).slice(0, randInt(0, 2));
      const qty = randInt(1, 2);
      const toppingTotal = chosenToppings.reduce((sum, t) => sum + t.price, 0);
      const lineTotal = (product.price + size.surcharge + toppingTotal) * qty;
      subtotal += lineTotal;

      items.push({
        productId: product.id,
        productSizeId: size.id,
        productName: product.name,
        unitPrice: product.price,
        sizeName: size.name,
        sizeSurcharge: size.surcharge,
        qty,
        lineTotal,
        toppings: {
          create: chosenToppings.map((t) => ({
            toppingId: t.id,
            toppingName: t.name,
            price: t.price,
          })),
        },
      });

      if (PAID_GROUP.includes(spec.status)) {
        stockUsed.set(product.id, (stockUsed.get(product.id) ?? 0) + qty);
      }
    }

    // --- Mã giảm giá: khoảng 1/4 số đơn có áp mã ---
    let coupon: Coupon | undefined;
    let discount = 0;
    if (index % 4 === 0) {
      const candidate = index % 8 === 0 ? welcome : giam5k;
      if (subtotal >= candidate.minOrderValue) {
        coupon = candidate;
        discount = calcDiscount(candidate, subtotal);
      }
    }
    const total = Math.max(0, subtotal - discount);

    // --- Điểm thưởng: 1 điểm / 10.000đ, chỉ cộng khi đơn đã thanh toán ---
    const isPaid = PAID_GROUP.includes(spec.status);
    const points = isPaid ? Math.floor(total / 10000) : 0;

    const order = await prisma.order.create({
      data: {
        userId: customer.id,
        couponId: coupon?.id,
        status: spec.status,
        total,
        discountCode: coupon?.code,
        discountAmount: discount,
        loyaltyPointsEarned: points,
        createdAt: spec.createdAt,
        updatedAt: new Date(
          Math.min(
            Date.now(),
            spec.createdAt.getTime() + randInt(2, 30) * 60000,
          ),
        ),
        orderItems: { create: items },
      },
    });

    if (isPaid) {
      pointsEarned.set(
        customer.id,
        (pointsEarned.get(customer.id) ?? 0) + points,
      );
      if (coupon)
        couponUsed.set(coupon.id, (couponUsed.get(coupon.id) ?? 0) + 1);
    }

    // --- Thanh toán ---
    const method = index % 2 === 0 ? PaymentMethod.WALLET : PaymentMethod.CARD;
    const payAt = new Date(spec.createdAt.getTime() + 60000);

    // Một vài đơn thanh toán lỗi lần đầu rồi thử lại thành công (minh họa quan hệ 1-N)
    if (spec.status === OrderStatus.PAID && index % 9 === 0) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          idempotencyKey: `seed-${randomUUID()}`,
          amount: total,
          method,
          status: PaymentStatus.FAILED,
          createdAt: spec.createdAt,
        },
      });
    }
    if (isPaid) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          idempotencyKey: `seed-${randomUUID()}`,
          amount: total,
          method,
          status: PaymentStatus.SUCCESS,
          createdAt: payAt,
        },
      });
    } else if (spec.status === OrderStatus.PAYMENT_FAILED) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          idempotencyKey: `seed-${randomUUID()}`,
          amount: total,
          method,
          status: PaymentStatus.FAILED,
          createdAt: payAt,
        },
      });
    }
    // PENDING và CANCELLED (huỷ trước khi thanh toán): chưa có thanh toán thành công
  }

  // --- Đồng bộ lại tồn kho, lượt dùng mã và điểm thưởng theo các đơn đã tạo ---
  for (const [productId, qty] of stockUsed) {
    await prisma.product.update({
      where: { id: productId },
      data: { stock: { decrement: qty }, version: { increment: 1 } },
    });
  }
  for (const [couponId, count] of couponUsed) {
    await prisma.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: count } },
    });
  }
  for (const [userId, points] of pointsEarned) {
    await prisma.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { increment: points } },
    });
  }

  const summary = await prisma.order.groupBy({
    by: ['status'],
    _count: true,
  });
  console.log(
    'Đơn hàng mẫu theo trạng thái:',
    summary.map((s) => `${s.status}=${s._count}`).join(', '),
  );

  console.log('Nạp toàn bộ dữ liệu thành công!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
