import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query, // Thêm Query
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto'; // Import DTO
import { imageUploadOptions } from '../common/upload/image-upload.options'; // Import cấu hình upload chung
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Categories (Danh mục)')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Thêm danh mục mới (Admin)' })
  @ApiConsumes('multipart/form-data')
  // Sử dụng imageUploadOptions từ common
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  create(
    @Body() createCategoryDto: CreateCategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const { file: _, ...categoryData } = createCategoryDto as any;
    if (file) {
      categoryData.imageUrl = `/uploads/${file.filename}`;
    }
    return this.categoriesService.create(categoryData);
  }

  // ========================================================
  // NHÓM API GET DÀNH CHO KHÁCH HÀNG (PUBLIC)
  // ========================================================
  @Get()
  @ApiOperation({ summary: 'Lấy tất cả danh mục đang hoạt động (Public)' })
  findAll(@Query() query: QueryCategoryDto) {
    return this.categoriesService.findAll(query, false);
  }

  // ========================================================
  // NHÓM API GET DÀNH CHO ADMIN
  // Lưu ý: Đặt route có chữ tĩnh ('admin/all') lên trước route ':id'
  // ========================================================
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/all')
  @ApiOperation({ summary: 'Lấy tất cả danh mục kể cả bị ẩn (Chỉ Admin)' })
  findAllForAdmin(@Query() query: QueryCategoryDto) {
    return this.categoriesService.findAll(query, true);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/:id')
  @ApiOperation({ summary: 'Xem chi tiết danh mục kể cả bị ẩn (Chỉ Admin)' })
  findOneForAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id, true);
  }

  // ========================================================
  // CÁC ROUTE ĐỘNG CÒN LẠI (DÀNH CHO ID)
  // ========================================================
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một danh mục (Public)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id, false); // Trả về lỗi 404 nếu bị ẩn
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật danh mục (Admin)' })
  @ApiConsumes('multipart/form-data')
  // Sử dụng imageUploadOptions từ common
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const { file: _, ...categoryData } = updateCategoryDto as any;
    if (file) {
      categoryData.imageUrl = `/uploads/${file.filename}`;
    }
    return this.categoriesService.update(id, categoryData);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Xóa danh mục / Ẩn danh mục (Admin)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/restore')
  @ApiOperation({ summary: 'Khôi phục danh mục đã ẩn (Admin)' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.restore(id);
  }
}
