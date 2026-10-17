import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryDashboardDto {
  @ApiPropertyOptional({
    example: 8,
    default: 8,
    description: 'Số đơn hàng gần đây trả về (1-20)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số đơn gần đây phải là số nguyên' })
  @Min(1)
  @Max(20)
  recentOrders?: number = 8;
}
