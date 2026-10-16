import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @ApiProperty({ example: 1, description: 'ID sản phẩm' })
  @IsNotEmpty({ message: 'Mã sản phẩm không được để trống' })
  @IsInt({ message: 'Mã sản phẩm phải là số nguyên' })
  productId: number;

  @ApiPropertyOptional({ example: 'M', description: 'Size đồ uống (S, M, L)' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiProperty({ example: 2, description: 'Số lượng đặt mua', minimum: 1 })
  @IsNotEmpty({ message: 'Số lượng không được để trống' })
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng mua tối thiểu là 1' })
  quantity: number;

  @ApiPropertyOptional({
    example: [1, 2],
    description: 'Danh sách ID topping kèm theo',
  })
  @IsOptional()
  @IsArray({ message: 'Topping IDs phải là một mảng' })
  @IsInt({ each: true, message: 'Mỗi topping ID phải là số nguyên' })
  toppingIds?: number[];
}

export class CreateOrderDto {
  @ApiPropertyOptional({ example: 1, description: 'ID khách hàng' })
  @IsOptional()
  @IsInt({ message: 'Mã khách hàng phải là số nguyên' })
  userId?: number;

  @ApiPropertyOptional({
    example: 'SUMMER20',
    description: 'Mã giảm giá/khuyến mãi',
  })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiProperty({
    type: [CreateOrderItemDto],
    description: 'Danh sách sản phẩm trong giỏ hàng',
  })
  @IsArray({ message: 'Giỏ hàng phải là một danh sách sản phẩm' })
  @ArrayMinSize(1, { message: 'Giỏ hàng phải có ít nhất 1 sản phẩm' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
