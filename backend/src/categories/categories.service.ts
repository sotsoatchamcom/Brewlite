import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryCategoryDto } from './dto/query-category.dto'; // Thêm import DTO

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    const existing = await this.prisma.category.findFirst({
      where: { name: data.name },
    });
    if (existing) {
      throw new ConflictException(
        `Danh mục mang tên '${data.name}' đã tồn tại!`,
      );
    }
    return this.prisma.category.create({ data });
  }

  // Hỗ trợ phân trang, tìm kiếm và phân tách quyền Admin / Public qua includeHidden
  async findAll(query: QueryCategoryDto, includeHidden: boolean = false) {
    const { search, page, limit } = query;
    const skip = (page - 1) * limit;

    // Xây dựng bộ lọc query
    const whereCondition: any = {};

    if (!includeHidden) {
      whereCondition.isActive = true; // Public chỉ lấy danh mục đang hoạt động
    }

    if (search) {
      whereCondition.name = { contains: search }; // Tìm gần đúng tên danh mục
    }

    // Chạy song song 2 lệnh: lấy dữ liệu (take/skip) và đếm tổng số bản ghi
    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        where: whereCondition,
        include: {
          _count: { select: { products: true } },
        },
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.category.count({ where: whereCondition }),
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

  // Thêm cờ includeHidden
  async findOne(id: number, includeHidden: boolean = false) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          // Khi khách hàng vào xem chi tiết danh mục, chỉ hiển thị sản phẩm đang bán
          where: includeHidden ? undefined : { isActive: true },
        },
      },
    });

    if (!category || (!category.isActive && !includeHidden)) {
      throw new NotFoundException(
        `Không tìm thấy danh mục ID ${id} hoặc danh mục đã bị ẩn`,
      );
    }
    return category;
  }

  async update(id: number, data: any) {
    await this.findOne(id, true); // Cho phép Admin update cả danh mục bị ẩn

    if (data.name) {
      const existing = await this.prisma.category.findFirst({
        where: {
          name: data.name,
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException(
          `Danh mục mang tên '${data.name}' đã tồn tại!`,
        );
      }
    }

    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  // Xóa mềm (Soft Delete)
  async remove(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID ${id}`);
    }

    if (category._count.products > 0) {
      throw new BadRequestException(
        `Không thể xóa! Danh mục này đang chứa ${category._count.products} sản phẩm. Vui lòng chuyển các sản phẩm sang danh mục khác trước khi xóa.`,
      );
    }

    return this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Tính năng KHÔI PHỤC (Restore)
  async restore(id: number) {
    await this.findOne(id, true); // Đảm bảo danh mục tồn tại

    return this.prisma.category.update({
      where: { id },
      data: { isActive: true },
    });
  }
}
