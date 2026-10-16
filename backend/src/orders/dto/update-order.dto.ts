import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderDto {
  @ApiPropertyOptional({
    enum: OrderStatus,
    description: 'Trạng thái mới của đơn hàng cần cập nhật',
  })
  @IsOptional()
  @IsEnum(OrderStatus, { message: 'Trạng thái chuyển đổi không hợp lệ' })
  status?: OrderStatus;
}
