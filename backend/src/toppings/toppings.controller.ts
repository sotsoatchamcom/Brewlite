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
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ToppingsService } from './toppings.service';
import { CreateToppingDto } from './dto/create-topping.dto';
import { UpdateToppingDto } from './dto/update-topping.dto';
import { QueryToppingDto } from './dto/query-topping.dto';
import { imageUploadOptions } from '../common/upload/image-upload.options';
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

@ApiTags('Toppings (Món thêm)')
@Controller('toppings')
export class ToppingsController {
  constructor(private readonly toppingsService: ToppingsService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Thêm Topping (Admin)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  create(
    @Body() createToppingDto: CreateToppingDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const { file: _, ...toppingData } = createToppingDto as any;
    if (file) {
      toppingData.imageUrl = `/uploads/${file.filename}`;
    }
    return this.toppingsService.create(toppingData);
  }

  // ========================================================
  // 1. NHÓM API DÀNH CHO KHÁCH HÀNG (PUBLIC) - LẤY DANH SÁCH
  // ========================================================

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách Topping đang bán (Public)' })
  findAll(@Query() query: QueryToppingDto) {
    // Khách hàng tuyệt đối không thể xem topping đã ẩn
    return this.toppingsService.findAll(query, false);
  }

  // ========================================================
  // 2. NHÓM API DÀNH RIÊNG CHO ADMIN (Phải đặt trước các route :id)
  // ========================================================

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/all')
  @ApiOperation({ summary: 'Lấy tất cả Topping bao gồm ẩn (Chỉ Admin)' })
  findAllForAdmin(@Query() query: QueryToppingDto) {
    // Bật chế độ xem toàn bộ cho Admin
    return this.toppingsService.findAll(query, true);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/:id')
  @ApiOperation({ summary: 'Xem chi tiết Topping bao gồm ẩn (Chỉ Admin)' })
  findOneForAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.toppingsService.findOne(id, true);
  }

  // ========================================================
  // 3. CÁC ROUTE CÓ THAM SỐ ĐỘNG DÀNH CHO CHI TIẾT / CẬP NHẬT / XÓA
  // ========================================================

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một Topping (Public)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.toppingsService.findOne(id, false);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật Topping (Admin)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateToppingDto: UpdateToppingDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const { file: _, ...toppingData } = updateToppingDto as any;
    if (file) {
      toppingData.imageUrl = `/uploads/${file.filename}`;
    }
    return this.toppingsService.update(id, toppingData);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Xóa Topping (Admin)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.toppingsService.remove(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/restore')
  @ApiOperation({ summary: 'Khôi phục Topping đã ẩn (Admin)' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.toppingsService.restore(id);
  }
}
