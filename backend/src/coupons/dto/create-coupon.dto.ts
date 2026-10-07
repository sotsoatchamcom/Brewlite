import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsEnum,
  IsOptional,
  IsDate,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DiscountType } from '@prisma/client';

export class CreateCouponDto {
  @ApiProperty({ example: 'SUMMER20', description: 'Mã giảm giá' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    enum: DiscountType,
    description: 'Loại giảm giá (PERCENT hoặc FIXED)',
  })
  @IsEnum(DiscountType)
  type: DiscountType;

  @ApiProperty({ example: 20000, description: 'Trị giá (VNĐ hoặc %)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  value: number;

  @ApiProperty({ example: 30000, description: 'Giá trị đơn tối thiểu (VNĐ)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minOrderValue: number;

  @ApiPropertyOptional({
    example: 20000,
    description: 'Giảm tối đa (nếu dùng %)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxDiscount?: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Giới hạn số lượt sử dụng',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiProperty({
    type: 'string',
    example: '2026-10-05T16:11',
    description: 'Ngày giờ bắt đầu áp dụng',
  })
  @Transform(({ value }) => new Date(value))
  @IsDate({ message: 'Thời gian bắt đầu không hợp lệ' })
  startsAt: Date;

  @ApiProperty({
    type: 'string',
    example: '2026-10-30T23:59',
    description: 'Ngày giờ hết hạn',
  })
  @Transform(({ value }) => new Date(value))
  @IsDate({ message: 'Thời gian hết hạn không hợp lệ' })
  expiresAt: Date;

  @ApiPropertyOptional({ default: true, description: 'Trạng thái hoạt động' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}
