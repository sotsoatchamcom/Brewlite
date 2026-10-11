import { ApiProperty } from '@nestjs/swagger';
import { BadRequestException } from '@nestjs/common';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsOptional,
  Matches,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Transform, plainToInstance } from 'class-transformer';

/** "29000" -> 29000. Giá trị lạ giữ nguyên để class-validator báo lỗi bằng message tiếng Việt. */
const toNumber = ({ value }: { value: any }) =>
  typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

/** "true"/"false" (multipart gửi chuỗi) -> boolean. Chuỗi rỗng coi như không gửi. */
const toBoolean = ({ value }: { value: any }) => {
  if (value === '' || value === null || value === undefined) return undefined;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return value;
};

export class ProductSizeDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Tên size phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên size không được để trống' })
  @MaxLength(20, { message: 'Tên size tối đa 20 ký tự' })
  name: string;

  @Transform(toNumber)
  @IsOptional()
  @IsInt({ message: 'Phụ thu của size phải là số nguyên' })
  @Min(0, { message: 'Phụ thu của size không được âm' })
  surcharge?: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Cà phê sữa đá', description: 'Tên đồ uống' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Tên sản phẩm phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  @MaxLength(100, { message: 'Tên sản phẩm tối đa 100 ký tự' })
  @Matches(
    /^[a-zA-Z0-9\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]+$/,
    {
      message:
        'Tên không được chứa ký tự đặc biệt (chỉ cho phép chữ cái, số và khoảng trắng)',
    },
  )
  name: string;

  @ApiProperty({ example: 29000, description: 'Giá bán (VNĐ)' })
  @Transform(toNumber)
  @IsInt({ message: 'Giá bán phải là số nguyên (VNĐ)' })
  @Min(0, { message: 'Giá bán không được âm' })
  price: number;

  @ApiProperty({ example: 80, description: 'Số lượng tồn kho' })
  @Transform(toNumber)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(0, { message: 'Số lượng không được âm' })
  stock: number;

  @ApiProperty({ example: 'Mô tả sản phẩm', required: false })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  @MaxLength(1000, { message: 'Mô tả tối đa 1000 ký tự' })
  description?: string;

  @ApiProperty({ example: 1, description: 'ID danh mục', required: false })
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsOptional()
  @IsInt({ message: 'ID danh mục phải là số nguyên' })
  categoryId?: number;

  @ApiProperty({
    example: true,
    required: false,
    description: 'true = đang bán, false = ẩn',
  })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean({ message: 'Trạng thái phải là true hoặc false' })
  isActive?: boolean;

  @ApiProperty({
    type: 'string',
    required: false,
    description:
      'Danh sách size dạng JSON array.\n' +
      '- Thêm mới: để trống => mặc định S/M/L.\n' +
      '- Cập nhật: không gửi trường này => giữ nguyên; để trống hoặc [] => ẩn toàn bộ size; ' +
      'có giá trị => thay bằng danh sách mới (size không còn trong danh sách sẽ bị ẩn).',
    example: `[
  { "name": "S", "surcharge": 0 },
  { "name": "M", "surcharge": 5000 },
  { "name": "L", "surcharge": 10000 }
]`,
  })
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;

    let raw = value;
    if (typeof raw === 'string') {
      // Chuỗi rỗng => mảng rỗng (khi cập nhật nghĩa là ẩn hết size)
      if (raw.trim() === '') return [];
      try {
        raw = JSON.parse(raw);
      } catch {
        throw new BadRequestException(['Chuỗi JSON sizes không hợp lệ']);
      }
    }
    // Chuyển thành instance để @ValidateNested kiểm tra từng phần tử
    return Array.isArray(raw) ? plainToInstance(ProductSizeDto, raw) : raw;
  })
  @IsOptional()
  @IsArray({ message: 'Sizes phải là một mảng' })
  @ArrayMaxSize(10, { message: 'Tối đa 10 size cho mỗi sản phẩm' })
  @ValidateNested({ each: true })
  sizes?: ProductSizeDto[];

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Ảnh sản phẩm (jpg, png, webp, gif - tối đa 5MB)',
  })
  @IsOptional()
  file?: any;
}
