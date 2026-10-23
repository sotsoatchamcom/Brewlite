import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  Query,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({
    summary:
      'Xử lý thanh toán không tiền mặt (Mock Gateway, Idempotent, State Machine)',
  })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description:
      'Idempotency Key (Có thể gửi qua HTTP Header hoặc bên trong Body)',
  })
  create(
    @Body() createPaymentDto: CreatePaymentDto,
    @Headers('idempotency-key') headerKey?: string,
  ) {
    const key = createPaymentDto.idempotencyKey || headerKey;
    if (!key) {
      throw new BadRequestException(
        'Bắt buộc phải cung cấp Idempotency-Key qua HTTP Header hoặc Body!',
      );
    }
    createPaymentDto.idempotencyKey = key;
    return this.paymentsService.create(createPaymentDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách giao dịch thanh toán (có phân trang & lọc)',
  })
  findAll(@Query() query: QueryPaymentDto) {
    return this.paymentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết giao dịch thanh toán theo ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.findOne(id);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Tra cứu lịch sử thanh toán theo mã đơn hàng' })
  findByOrderId(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentsService.findByOrderId(orderId);
  }
}
