import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ValidateCouponDto {
  @ApiProperty({
    example: 'WELCOME10',
    description: 'Mã giảm giá khách hàng nhập',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString({ message: 'Mã giảm giá phải là một chuỗi ký tự' })
  @IsNotEmpty({ message: 'Vui lòng nhập mã giảm giá' })
  @MinLength(5, {
    message: 'Mã giảm giá quá ngắn (tối thiểu 5 ký tự)',
  })
  @MaxLength(20, { message: 'Mã giảm giá không được vượt quá 20 ký tự' })
  @Matches(/^[A-Z0-9]+$/, {
    message:
      'Mã giảm giá chỉ được chứa chữ cái in hoa và số (Không chứa dấu cách hay ký tự đặc biệt)',
  })
  code: string;

  @ApiProperty({
    example: 50000,
    description: 'Tổng tiền đơn hàng hiện tại (VNĐ)',
  })
  @Type(() => Number)
  @IsInt({ message: 'Tổng tiền đơn hàng phải là số nguyên' })
  @Min(0, { message: 'Tổng tiền đơn hàng không hợp lệ (phải >= 0)' })
  orderTotal: number;
}
