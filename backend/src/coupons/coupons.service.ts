import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { QueryCouponDto } from './dto/query-coupon.dto';
import { DiscountType } from '@prisma/client';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    if (dto.startsAt >= dto.expiresAt) {
      throw new BadRequestException(
        'Thời gian kết thúc phải sau thời gian bắt đầu',
      );
    }
    if (dto.type === DiscountType.PERCENT && dto.value > 100) {
      throw new BadRequestException(
        'Mức giảm theo phần trăm không được vượt quá 100%',
      );
    }

    const existing = await this.prisma.coupon.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Mã '${dto.code}' đã tồn tại!`);
    }

    return this.prisma.coupon.create({ data: dto });
  }

  async findAll(query: QueryCouponDto, includeHidden: boolean = false) {
    const { search, page, limit } = query;
    const skip = (page - 1) * limit;
    const whereCondition: any = {};

    if (!includeHidden) {
      whereCondition.isActive = true;
      whereCondition.expiresAt = { gt: new Date() };
    }

    if (search) {
      whereCondition.code = { contains: search };
    }

    const [data, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count({ where: whereCondition }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number, includeHidden: boolean = false) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon || (!coupon.isActive && !includeHidden)) {
      throw new NotFoundException(`Không tìm thấy mã giảm giá ID ${id}`);
    }
    return coupon;
  }

  async update(id: number, dto: UpdateCouponDto) {
    const coupon = await this.findOne(id, true);

    if (dto.code && dto.code !== coupon.code) {
      const existing = await this.prisma.coupon.findUnique({
        where: { code: dto.code },
      });
      if (existing) throw new ConflictException(`Mã '${dto.code}' đã tồn tại!`);
    }

    const checkStarts = dto.startsAt || coupon.startsAt;
    const checkExpires = dto.expiresAt || coupon.expiresAt;
    if (checkStarts >= checkExpires) {
      throw new BadRequestException(
        'Thời gian kết thúc phải sau thời gian bắt đầu',
      );
    }

    return this.prisma.coupon.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id, true);
    return this.prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async restore(id: number) {
    await this.findOne(id, true);
    return this.prisma.coupon.update({
      where: { id },
      data: { isActive: true },
    });
  }

  /**
   * ĐÁP ỨNG TASK 10 BREWLITE: XỬ LÝ KHUYẾN MÃI
   */
  async validateCoupon(code: string, orderTotal: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      throw new BadRequestException(
        'Mã giảm giá không tồn tại hoặc đã bị khóa',
      );
    }

    const now = new Date();
    if (now < coupon.startsAt) {
      throw new BadRequestException(
        'Mã giảm giá này chưa đến thời gian sử dụng',
      );
    }
    if (now > coupon.expiresAt) {
      throw new BadRequestException('Mã giảm giá này đã hết hạn');
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
    }
    if (orderTotal < coupon.minOrderValue) {
      throw new BadRequestException(
        `Đơn hàng phải từ ${coupon.minOrderValue}đ để áp dụng mã này`,
      );
    }

    let discountAmount = 0;
    if (coupon.type === DiscountType.PERCENT) {
      discountAmount = Math.floor((orderTotal * coupon.value) / 100);
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else {
      discountAmount = coupon.value;
    }

    // Tiền giảm không bao giờ lớn hơn tổng giá trị đơn hàng
    discountAmount = Math.min(discountAmount, orderTotal);

    return {
      isValid: true,
      couponId: coupon.id,
      code: coupon.code,
      discountAmount,
    };
  }
}
