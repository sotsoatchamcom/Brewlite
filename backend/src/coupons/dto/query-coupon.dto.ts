import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

export class QueryCouponDto {
  @ApiPropertyOptional({ description: 'Tìm theo mã code' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là một chuỗi' })
  @MaxLength(50, { message: 'Từ khóa tìm kiếm quá dài (tối đa 50 ký tự)' })
  search?: string;

  @ApiPropertyOptional({ type: Number, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'Số trang (page) phải là số nguyên' })
  @Min(1, { message: 'Số trang tối thiểu là 1' })
  page: number = 1;

  @ApiPropertyOptional({ type: Number, default: 20, maximum: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'Giới hạn (limit) phải là số nguyên' })
  @Min(1, { message: 'Giới hạn tối thiểu là 1' })
  @Max(100, { message: 'Giới hạn tối đa là 100 dòng mỗi trang' })
  limit: number = 20;
}
