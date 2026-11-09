import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsBoolean,
  IsOptional,
  MaxLength,
  Matches,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateToppingDto {
  @ApiProperty({ example: 'Trân châu đen', description: 'Tên topping' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Tên topping phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên topping không được để trống' })
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

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Trạng thái bán',
  })
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID danh mục chọn từ Dropdown (giống Product)',
  })
  @Transform(({ value }) =>
      value !== undefined && value !== '' && value !== null
          ? Number(value)
          : undefined,
  )
  @IsOptional()
  categoryId?: number;

  @ApiPropertyOptional({
    type: [Number],
    example: [1, 2],
    description: 'Danh sách ID các danh mục được gán topping này',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(Number) : [Number(value)];
      } catch {
        return value
            .split(',')
            .map((v) => Number(v.trim()))
            .filter((n) => !isNaN(n));
      }
    }
    if (Array.isArray(value)) {
      return value.map(Number).filter((n) => !isNaN(n));
    }
    return value;
  })
  @IsArray({ message: 'categoryIds phải là một mảng ID' })
  @IsOptional()
  categoryIds?: number[];
}