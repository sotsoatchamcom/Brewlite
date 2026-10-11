import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsOptional,
  IsDate,
  IsBoolean,
  MinLength,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DiscountType } from '@prisma/client';

export class CreateCouponDto {
  @ApiProperty({ example: 'GIAM5K', description: 'Mã giảm giá' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString({ message: 'Mã giảm giá phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mã giảm giá không được để trống' })
  @MinLength(5, {
    message: 'Mã giảm giá quá ngắn (tối thiểu 5 ký tự, VD: GIAM5K, SALE10K)',
  })
  @MaxLength(20, { message: 'Mã giảm giá không được vượt quá 20 ký tự' })
  @Matches(/^[A-Z0-9]+$/, {
    message:
      'Mã giảm giá chỉ được chứa chữ cái in hoa và số (Không chứa dấu cách hay ký tự đặc biệt)',
  })
  code: string;

  @ApiProperty({
    enum: DiscountType,
    description: 'Loại giảm giá (PERCENT hoặc FIXED)',
  })
  @IsEnum(DiscountType, {
    message: 'Loại giảm giá không hợp lệ (Chỉ nhận PERCENT hoặc FIXED)',
  })
  type: DiscountType;

  @ApiProperty({ example: 20000, description: 'Trị giá (VNĐ hoặc %)' })
  @Type(() => Number)
  @IsInt({ message: 'Trị giá giảm phải là số nguyên' })
  @Min(1, { message: 'Trị giá giảm phải lớn hơn 0' })
  @ValidateIf((o) => o.type === DiscountType.PERCENT)
  @Max(100, { message: 'Mức giảm phần trăm không được vượt quá 100%' })
  value: number;

  @ApiProperty({ example: 30000, description: 'Giá trị đơn tối thiểu (VNĐ)' })
  @Type(() => Number)
  @IsInt({ message: 'Giá trị đơn tối thiểu phải là số nguyên' })
  @Min(0, { message: 'Giá trị đơn tối thiểu không được nhỏ hơn 0' })
  minOrderValue: number;

  @ApiPropertyOptional({
    example: 20000,
    description: 'Giảm tối đa (nếu dùng %)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Mức giảm tối đa phải là số nguyên' })
  @Min(0, { message: 'Mức giảm tối đa không được nhỏ hơn 0' })
  maxDiscount?: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Giới hạn số lượt sử dụng',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Giới hạn số lượt sử dụng phải là số nguyên' })
  @Min(0, { message: 'Giới hạn số lượt sử dụng không được nhỏ hơn 0' })
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
  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean' })
  isActive?: boolean;
}
