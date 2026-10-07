import {
  applyDecorators,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { imageUploadOptions } from '../common/upload/image-upload.options';
import { ProductsService } from './products.service';

/** Gom các decorator bắt buộc đăng nhập + quyền ADMIN cho một endpoint. */
const AdminOnly = () =>
  applyDecorators(
    ApiBearerAuth(),
    UseGuards(AuthGuard('jwt'), RolesGuard),
    Roles(Role.ADMIN),
    ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' }),
    ApiForbiddenResponse({ description: 'Không có quyền ADMIN' }),
  );

/** Bỏ field `file` khỏi DTO, gắn imageUrl nếu có upload. */
function toInput<T extends { file?: unknown }>(
  dto: T,
  file?: Express.Multer.File,
): Omit<T, 'file'> & { imageUrl?: string } {
  const { file: _ignored, ...data } = dto;
  return file ? { ...data, imageUrl: `/uploads/${file.filename}` } : data;
}

@ApiTags('Products (Thực đơn)')
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ========================================================
  // 1. PUBLIC (khách hàng)
  // ========================================================

  @Get('products')
  @ApiOperation({ summary: 'Danh sách đồ uống đang bán (Public)' })
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query, false);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Chi tiết một đồ uống đang bán (Public)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id, false);
  }

  // ========================================================
  // 2. ADMIN - đọc cả sản phẩm đã ẩn
  // ========================================================

  @Get('admin/products')
  @AdminOnly()
  @ApiOperation({ summary: 'Danh sách đồ uống bao gồm ẩn (Admin)' })
  findAllForAdmin(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query, true);
  }

  @Get('admin/products/:id')
  @AdminOnly()
  @ApiOperation({ summary: 'Chi tiết đồ uống bao gồm đã ẩn (Admin)' })
  findOneForAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id, true);
  }

  // ========================================================
  // 3. ADMIN - ghi
  // ========================================================

  @Post('products')
  @AdminOnly()
  @ApiOperation({ summary: 'Thêm đồ uống mới (Admin)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  create(
    @Body() dto: CreateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.productsService.create(toInput(dto, file));
  }

  @Patch('products/:id')
  @AdminOnly()
  @ApiOperation({ summary: 'Cập nhật đồ uống (Admin)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.productsService.update(id, toInput(dto, file));
  }

  @Delete('products/:id')
  @AdminOnly()
  @HttpCode(204)
  @ApiOperation({ summary: 'Ẩn đồ uống (Admin)' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.productsService.remove(id);
  }

  @Post('products/:id/restore')
  @AdminOnly()
  @HttpCode(200)
  @ApiOperation({ summary: 'Khôi phục đồ uống đã ẩn (Admin)' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.restore(id);
  }
}
