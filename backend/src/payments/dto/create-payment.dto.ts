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
    description: 'Số tiền thanh toán',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Số tiền thanh toán phải là số' })
  amount?: number;

  @ApiProperty({
    example: 'idem-uuid-9876-5432-10',
    description: 'Idempotency-Key chống thanh toán trùng lặp',
  })
  @IsNotEmpty({ message: 'Idempotency-Key không được để trống' })
  @IsString()
  idempotencyKey: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Bật cờ này bằng true để giả lập lỗi thanh toán',
  })
  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;
}
