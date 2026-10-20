import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // =========================================================================
  // 1. DÀNH CHO KHÁCH HÀNG (CUSTOMER)
  // =========================================================================

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Tạo đơn hàng mới (Task 6 & Task 7 - Tự động nhận diện User qua JWT Token)',
  })
  create(@Req() req: any, @Body() createOrderDto: CreateOrderDto) {
    const currentUserId = req.user?.id || req.user?.userId;

    if (!currentUserId) {
      throw new BadRequestException(
        'Không tìm thấy thông tin tài khoản! Vui lòng đăng nhập qua nút Authorize.',
      );
    }

    return this.ordersService.create(currentUserId, createOrderDto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy lịch sử đơn hàng của chính tài khoản đăng nhập (Task 9)',
  })
  findMyOrders(@Req() req: any) {
    const currentUserId = req.user?.id || req.user?.userId;

    if (!currentUserId) {
      throw new BadRequestException('Vui lòng đăng nhập để xem lịch sử đơn!');
    }

    return this.ordersService.findByUserId(currentUserId);
  }

  // =========================================================================
  // 2. DÙNG CHUNG (ADMIN XEM HẾT, KHÁCH HÀNG CHỈ XEM ĐƠN CỦA MÌNH)
  // =========================================================================

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Xem chi tiết đơn hàng theo mã ID (Admin hoặc Chủ đơn hàng)',
  })
  async findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersService.findOne(id);
    const user = req.user;
    const currentUserId = user?.id || user?.userId;

    // Chặn nếu không phải Admin và cũng không phải chủ sở hữu của đơn
    if (user?.role !== Role.ADMIN && order.userId !== currentUserId) {
      throw new ForbiddenException(
        'Bạn không có quyền xem chi tiết đơn hàng của người khác!',
      );
    }

    return order;
  }

  // =========================================================================
  // 3. DÀNH RIÊNG CHO QUẢN TRỊ VIÊN (ADMIN ONLY)
  // =========================================================================

  @Get()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách tất cả đơn hàng có phân trang & lọc',
  })
  findAll(@Query() query: QueryOrderDto) {
    return this.ordersService.findAll(query);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Cập nhật trạng thái đơn hàng (Task 10 - Order State Machine - Chỉ Admin)',
  })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật thông tin đơn hàng (Chỉ Admin)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa đơn hàng (Chỉ Admin)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.remove(id);
  }
}
