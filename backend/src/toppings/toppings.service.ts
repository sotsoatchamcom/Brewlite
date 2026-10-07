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

    return this.prisma.topping.create({ data: dto });
  }

  // Hỗ trợ phân trang, tìm kiếm và lọc trạng thái ẩn/hiện
  async findAll(query: QueryToppingDto, includeHidden: boolean = false) {
    const { search, page, limit } = query;
    const skip = (page - 1) * limit;

    const whereCondition: any = {};

    if (!includeHidden) {
      whereCondition.isAvailable = true;
    }

    if (search) {
      whereCondition.name = { contains: search };
    }

    const [data, total] = await Promise.all([
      this.prisma.topping.findMany({
        where: whereCondition,
        skip,
        take: limit,
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

    return this.prisma.topping.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id, true);

    return this.prisma.topping.update({
      where: { id },
      data: { isAvailable: false },
    });
  }

  async restore(id: number) {
    await this.findOne(id, true);
    return this.prisma.topping.update({
      where: { id },
      data: { isAvailable: true },
    });
  }
}
