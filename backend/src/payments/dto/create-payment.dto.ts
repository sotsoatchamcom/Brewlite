import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty({ example: 1, description: 'ID của đơn hàng cần thanh toán' })
  @IsNotEmpty({ message: 'Mã đơn hàng (orderId) không được để trống' })
  @IsNumber({}, { message: 'Mã đơn hàng phải là số' })
  orderId: number;

  @ApiProperty({
    example: 'WALLET',
    description: 'Phương thức thanh toán không tiền mặt',
    enum: PaymentMethod,
  })
  @IsNotEmpty({ message: 'Phương thức thanh toán không được để trống' })
  @IsEnum(PaymentMethod, { message: 'Phương thức thanh toán không hợp lệ' })
  method: PaymentMethod;

  @ApiPropertyOptional({
    example: 65000,
    description:
      'Số tiền thanh toán (bỏ trống sẽ tự động lấy finalAmount của đơn)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Số tiền thanh toán phải là số' })
  amount?: number;

  @ApiPropertyOptional({
    example: 'idem-uuid-9876-5432-10',
    description:
      'Idempotency-Key (Có thể truyền qua Body này hoặc qua HTTP Header)',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Bật true để giả lập lỗi cổng thanh toán',
  })
  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;
}
