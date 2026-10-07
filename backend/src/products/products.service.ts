import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { promises as fs } from 'fs';
import { basename, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

type SizeInput = { name: string; surcharge: number };

/** Dữ liệu controller truyền xuống (đã bỏ field `file`, thêm `imageUrl` nếu có upload). */
export type ProductInput = Omit<CreateProductDto, 'file'> & {
  imageUrl?: string;
};

// Mặc định 3 size nếu thêm mới mà không nhập gì (theo chức năng BrewLite)
const DEFAULT_SIZES: SizeInput[] = [
  { name: 'S', surcharge: 0 },
  { name: 'M', surcharge: 5000 },
  { name: 'L', surcharge: 10000 },
];

// Chỉ trả các size đang bật
const ACTIVE_SIZES = {
  where: { isAvailable: true },
  orderBy: { surcharge: Prisma.SortOrder.asc },
  select: { id: true, name: true, surcharge: true },
};

// Khách hàng: id, tên, giá, ảnh, mô tả, tồn kho, danh mục, size (không lộ version/isActive)
const PUBLIC_SELECT = {
  id: true,
  name: true,
  price: true,
  imageUrl: true,
  description: true,
  stock: true,
  category: { select: { id: true, name: true } },
  sizes: ACTIVE_SIZES,
};

// Admin: thêm isActive, version, categoryId
const ADMIN_SELECT = {
  ...PUBLIC_SELECT,
  isActive: true,
  version: true,
  categoryId: true,
};

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // =========================================================
  // Helpers
  // =========================================================

  /**
   * Chuẩn hóa + kiểm tra danh sách size: trim tên, phụ thu >= 0, không trùng tên
   * (không phân biệt hoa thường). Cho phép mảng rỗng.
   */
  private normalizeSizes(raw: unknown): SizeInput[] {
    if (!Array.isArray(raw)) {
      throw new BadRequestException('Danh sách size phải là một mảng');
    }

    const seen = new Set<string>();
    const result: SizeInput[] = [];

    for (const item of raw as any[]) {
      const name = String(item?.name ?? '').trim();
      const surcharge = Number(item?.surcharge ?? 0);

      if (!name) {
        throw new BadRequestException('Tên size không được để trống');
      }
      if (!Number.isInteger(surcharge) || surcharge < 0) {
        throw new BadRequestException(
          `Phụ thu của size "${name}" phải là số nguyên không âm`,
        );
      }

      const key = name.toLowerCase();
      if (seen.has(key)) {
        throw new BadRequestException(`Size "${name}" bị trùng`);
      }
      seen.add(key);
      result.push({ name, surcharge });
    }
    return result;
  }

  private async assertCategoryExists(categoryId?: number) {
    if (categoryId === undefined || categoryId === null) return;
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException(`Danh mục ID ${categoryId} không tồn tại`);
    }
  }

  private async assertNameAvailable(name?: string, excludeId?: number) {
    if (!name) return;
    const existing = await this.prisma.product.findFirst({
      where: {
        name,
        ...(excludeId !== undefined ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Tên sản phẩm đã tồn tại');
  }

  /** Xóa file ảnh cũ trong ./uploads (bỏ qua ảnh mặc định default-*). */
  private async deleteImageFile(imageUrl?: string | null) {
    if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;
    const fileName = basename(imageUrl);
    if (fileName.startsWith('default-')) return;
    try {
      await fs.unlink(join(process.cwd(), 'uploads', fileName));
    } catch {
      // File không còn tồn tại thì bỏ qua
    }
  }

  // =========================================================
  // Đọc
  // =========================================================

  async findAll(query: QueryProductDto, includeHidden = false) {
    const { search, categoryId, page, limit } = query;

    const where: Prisma.ProductWhereInput = {
      ...(search ? { name: { contains: search } } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(includeHidden ? {} : { isActive: true }),
    };

    const [totalRecords, data] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: includeHidden ? ADMIN_SELECT : PUBLIC_SELECT,
        orderBy: { id: 'desc' },
      }),
    ]);

    return {
      data,
      meta: {
        totalRecords,
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        limit,
      },
    };
  }

  async findOne(id: number, includeHidden = false) {
    const product = await this.prisma.product.findFirst({
      where: { id, ...(includeHidden ? {} : { isActive: true }) },
      select: includeHidden ? ADMIN_SELECT : PUBLIC_SELECT,
    });

    if (!product) {
      throw new NotFoundException(
        `Không tìm thấy sản phẩm ID ${id} hoặc đã ngừng bán`,
      );
    }
    return product;
  }

  // =========================================================
  // Thêm
  // =========================================================

  async create(data: ProductInput) {
    const { sizes, ...productData } = data;

    await this.assertNameAvailable(productData.name);
    await this.assertCategoryExists(productData.categoryId);

    // Không gửi hoặc để trống => mặc định S/M/L
    const normalized = sizes === undefined ? [] : this.normalizeSizes(sizes);
    const finalSizes =
      normalized.length > 0 ? normalized : DEFAULT_SIZES.map((s) => ({ ...s }));

    return this.prisma.product.create({
      data: {
        ...productData,
        sizes: { create: finalSizes },
      },
      select: ADMIN_SELECT,
    });
  }

  // =========================================================
  // Sửa
  // =========================================================

  async update(id: number, data: Partial<ProductInput>) {
    const current = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, imageUrl: true },
    });
    if (!current) {
      throw new NotFoundException(`Không tìm thấy sản phẩm ID ${id}`);
    }

    const { sizes, ...productData } = data;

    await this.assertNameAvailable(productData.name, id);
    await this.assertCategoryExists(productData.categoryId);

    // sizes === undefined => giữ nguyên size cũ
    // sizes là mảng rỗng  => ẨN toàn bộ size (isAvailable = false)
    // sizes có phần tử    => đồng bộ theo tên:
    //    - trùng tên với size cũ (kể cả size đang ẩn): cập nhật phụ thu + bật lại
    //    - tên mới: thêm mới
    //    - size cũ không còn trong danh sách: ẨN (không xóa vì đơn cũ còn tham chiếu)
    let sizesOperation: Prisma.ProductUncheckedUpdateInput['sizes'];

    if (sizes !== undefined) {
      const incoming = this.normalizeSizes(sizes);
      const existing = await this.prisma.productSize.findMany({
        where: { productId: id },
      });
      const existingByName = new Map(
        existing.map((s) => [s.name.toLowerCase(), s] as const),
      );

      const keepIds: number[] = [];
      const toUpdate: {
        where: { id: number };
        data: { name: string; surcharge: number; isAvailable: boolean };
      }[] = [];
      const toCreate: SizeInput[] = [];

      for (const size of incoming) {
        const found = existingByName.get(size.name.toLowerCase());
        if (found) {
          keepIds.push(found.id);
          toUpdate.push({
            where: { id: found.id },
            data: {
              name: size.name,
              surcharge: size.surcharge,
              isAvailable: true,
            },
          });
        } else {
          toCreate.push(size);
        }
      }

      sizesOperation = {
        updateMany: {
          where: { id: { notIn: keepIds } },
          data: { isAvailable: false },
        },
        update: toUpdate,
        create: toCreate,
      };
    }

    // Đổi tồn kho thì tăng version để giao dịch đặt hàng đang chạy (optimistic locking, Task 10)
    // phát hiện được và không ghi đè số lượng admin vừa sửa.
    const stockChanged = productData.stock !== undefined;

    // Một lệnh update duy nhất => Prisma chạy trong 1 transaction:
    // lỗi ở bất kỳ bước nào cũng không làm hỏng dữ liệu size cũ.
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        ...(stockChanged ? { version: { increment: 1 } } : {}),
        sizes: sizesOperation,
      },
      select: ADMIN_SELECT,
    });

    // Có ảnh mới => xóa file ảnh cũ
    if (productData.imageUrl && current.imageUrl !== productData.imageUrl) {
      await this.deleteImageFile(current.imageUrl);
    }
    return updated;
  }

  // =========================================================
  // Ẩn / khôi phục (xóa mềm)
  // =========================================================

  async remove(id: number): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm ID ${id}`);
    }
    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async restore(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm ID ${id}`);
    }
    return this.prisma.product.update({
      where: { id },
      data: { isActive: true },
      select: ADMIN_SELECT,
    });
  }
}
