import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { NotificationType } from '@prisma/client';

export class QueryNotificationDto {
  @ApiPropertyOptional({
    type: Boolean,
    description: 'true = đã đọc, false = chưa đọc, bỏ trống = tất cả',
  })
  @IsOptional()
  // Đọc từ obj gốc để tránh việc "false" bị ép kiểu thành true khi bật enableImplicitConversion
  @Transform(({ obj }) =>
    obj.isRead === 'true' || obj.isRead === true
      ? true
      : obj.isRead === 'false' || obj.isRead === false
        ? false
        : undefined,
  )
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({
    enum: NotificationType,
    description: 'Lọc theo loại thông báo',
  })
  @IsOptional()
  @IsEnum(NotificationType, { message: 'Loại thông báo không hợp lệ' })
  type?: NotificationType;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID khách hàng (chỉ dùng cho các route /notifications/me)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
