import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsBoolean,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateToppingDto {
  @ApiProperty({ example: 'Trân châu đen', description: 'Tên topping' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Tên topping phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên topping không được để trống' })
  // Thêm @Matches để bắt buộc phải có chữ cái
  @Matches(
    /^[a-zA-Z0-9\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]+$/,
    {
      message:
        'Tên không được chứa ký tự đặc biệt (chỉ cho phép chữ cái, số và khoảng trắng)',
    },
  )
  @MaxLength(255, { message: 'Tên topping không được vượt quá 255 ký tự' })
  name: string;

  @ApiProperty({ example: 5000, description: 'Giá thêm (VNĐ)' })
  @Transform(({ value }) =>
    value !== undefined && value !== '' ? Number(value) : value,
  )
  @IsInt({ message: 'Giá topping phải là số nguyên' })
  @Min(0, { message: 'Giá không được âm' })
  price: number;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Trạng thái bán',
  })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
