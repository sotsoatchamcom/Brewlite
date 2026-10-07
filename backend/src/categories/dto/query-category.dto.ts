import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class QueryCategoryDto {
  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm theo tên danh mục' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Từ khóa tối đa 100 ký tự' })
  search?: string;

  @ApiPropertyOptional({
    type: Number,
    default: 1,
    description: 'Trang hiện tại',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page phải từ 1 trở lên' })
  page: number = 1;

  @ApiPropertyOptional({
    type: Number,
    default: 20,
    maximum: 100,
    description: 'Số danh mục mỗi trang (tối đa 100)',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit phải từ 1 trở lên' })
  @Max(100, { message: 'limit tối đa 100' })
  limit: number = 20;
}
