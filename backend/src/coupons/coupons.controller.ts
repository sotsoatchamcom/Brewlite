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
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { QueryCouponDto } from './dto/query-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
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
import { NoFilesInterceptor } from '@nestjs/platform-express';

@ApiTags('Coupons (Mã giảm giá)')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  // ========================================================
  // 1. PUBLIC API (Khách hàng)
  // ========================================================

  @Get('active')
  @ApiOperation({ summary: 'Danh sách mã giảm giá đang hoạt động (Public)' })
  findAllActive(@Query() query: QueryCouponDto) {
    return this.couponsService.findAll(query, false);
  }

  @Post('validate')
  @ApiOperation({
    summary: 'Kiểm tra mã giảm giá và tính tiền giảm (Public - Task 10)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(NoFilesInterceptor())
  validateCoupon(@Body() validateCouponDto: ValidateCouponDto) {
    return this.couponsService.validateCoupon(
      validateCouponDto.code,
      validateCouponDto.orderTotal,
    );
  }

  // ========================================================
  // 2. ADMIN API
  // ========================================================

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Tạo mã giảm giá mới (Admin)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(NoFilesInterceptor())
  create(@Body() createCouponDto: CreateCouponDto) {
    return this.couponsService.create(createCouponDto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Lấy tất cả mã giảm giá kể cả bị ẩn (Admin)' })
  findAll(@Query() query: QueryCouponDto) {
    return this.couponsService.findAll(query, true);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết mã giảm giá (Admin)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.couponsService.findOne(id, true);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật mã giảm giá (Admin)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(NoFilesInterceptor())
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCouponDto: UpdateCouponDto,
  ) {
    return this.couponsService.update(id, updateCouponDto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Khóa / Ẩn mã giảm giá (Admin)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.couponsService.remove(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/restore')
  @ApiOperation({ summary: 'Khôi phục mã giảm giá (Admin)' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.couponsService.restore(id);
  }
}
