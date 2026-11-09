import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryToppingDto {
  @ApiPropertyOptional({ description: 'Tìm kiếm tên Topping' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc topping theo ID danh mục' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({
    type: Number,
    default: 1,
    description: 'Trang hiện tại',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    type: Number,
    default: 50,
    maximum: 100,
    description: 'Số lượng mỗi trang',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;
}