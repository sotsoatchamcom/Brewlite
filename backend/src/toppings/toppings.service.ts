import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryToppingDto } from './dto/query-topping.dto';

@Injectable()
export class ToppingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: any) {
    const existing = await this.prisma.topping.findFirst({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Tên topping đã tồn tại!');
    }

    // Gom categoryId hoặc categoryIds vào danh sách ID duy nhất
    let catIds: number[] = [];
    if (dto.categoryId) {
      catIds.push(Number(dto.categoryId));
    }
    if (Array.isArray(dto.categoryIds)) {
      catIds.push(...dto.categoryIds.map(Number));
    }
    catIds = Array.from(new Set(catIds.filter((id) => !isNaN(id) && id > 0)));

    const { categoryId, categoryIds, ...data } = dto;

    return this.prisma.topping.create({
      data: {
        ...data,
        categories:
            catIds.length > 0
                ? { connect: catIds.map((id) => ({ id })) }
                : undefined,
      },
      include: {
        categories: {
          select: { id: true, name: true },
        },
      },
    });
  }

  // Hỗ trợ phân trang, tìm kiếm, lọc theo danh mục và trạng thái ẩn/hiện
  async findAll(query: QueryToppingDto, includeHidden: boolean = false) {
    const { search, categoryId, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const whereCondition: any = {};

    if (!includeHidden) {
      whereCondition.isAvailable = true;
    }

    if (search) {
      whereCondition.name = { contains: search, mode: 'insensitive' };
    }

    if (categoryId) {
      whereCondition.categories = {
        some: { id: Number(categoryId) },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.topping.findMany({
        where: whereCondition,
        skip,
        take: limit,
        include: {
          categories: {
            select: { id: true, name: true },
          },
        },
        orderBy: { id: 'desc' },
      }),
      this.prisma.topping.count({ where: whereCondition }),
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

  async findOne(id: number, includeHidden: boolean = false) {
    const topping = await this.prisma.topping.findUnique({
      where: { id },
      include: {
        categories: {
          select: { id: true, name: true },
        },
      },
    });

    if (!topping || (!topping.isAvailable && !includeHidden)) {
      throw new NotFoundException(
          `Không tìm thấy topping ID ${id} hoặc đã ngừng bán`,
      );
    }
    return topping;
  }

  async update(id: number, dto: any) {
    await this.findOne(id, true);

    if (dto.name) {
      const existing = await this.prisma.topping.findFirst({
        where: { name: dto.name, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Tên topping đã tồn tại!');
      }
    }

    const hasCategoryUpdate =
        dto.categoryId !== undefined || dto.categoryIds !== undefined;

    let catIds: number[] = [];
    if (dto.categoryId) {
      catIds.push(Number(dto.categoryId));
    }
    if (Array.isArray(dto.categoryIds)) {
      catIds.push(...dto.categoryIds.map(Number));
    }
    catIds = Array.from(new Set(catIds.filter((cid) => !isNaN(cid) && cid > 0)));

    const { categoryId, categoryIds, ...data } = dto;

    return this.prisma.topping.update({
      where: { id },
      data: {
        ...data,
        categories: hasCategoryUpdate
            ? { set: catIds.map((cid) => ({ id: cid })) }
            : undefined,
      },
      include: {
        categories: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id, true);

    return this.prisma.topping.update({
      where: { id },
      data: { isAvailable: false },
      include: {
        categories: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async restore(id: number) {
    await this.findOne(id, true);

    return this.prisma.topping.update({
      where: { id },
      data: { isAvailable: true },
      include: {
        categories: {
          select: { id: true, name: true },
        },
      },
    });
  }
}