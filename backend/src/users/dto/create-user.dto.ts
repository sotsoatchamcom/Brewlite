import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsIn,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'khachhang@gmail.com',
    description: 'Email đăng nhập',
  })
  @MaxLength(255, { message: 'Email không được vượt quá 255 ký tự' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({
    example: 'Abc@1234',
    description: 'Mật khẩu bảo mật cao',
  })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt',
    },
  )
  @MaxLength(50, { message: 'Mật khẩu không được vượt quá 50 ký tự' })
  @MinLength(8, { message: 'Mật khẩu phải từ 8 ký tự trở lên' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;

  @ApiProperty({
    example: 'Nguyễn Văn A',
    description: 'Họ và tên',
    required: false,
  })
  @MaxLength(100, { message: 'Họ và tên không được vượt quá 100 ký tự' })
  @Matches(/^[\p{L}\s]+$/u, {
    message:
      'Họ và tên chỉ được chứa chữ cái và khoảng trắng, không chứa số hay ký tự đặc biệt',
  })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: '0901234567',
    required: false,
    description: 'Số điện thoại VN',
  })
  @IsOptional()
  @Matches(/^(84|0[35789])[0-9]{8}$/, {
    message:
      'Số điện thoại không hợp lệ (Phải là số điện thoại Việt Nam 10 số, không chứa chữ cái, kí tự đặc biệt)',
  })
  phone?: string;

  @ApiProperty({
    example: 'Nam',
    required: false,
    description: 'Giới tính (Nam, Nữ)',
  })
  @IsOptional()
  @IsString()
  @IsIn(['Nam', 'Nữ', 'Khác'], {
    message: 'Giới tính phải là Nam hoặc Nữ',
  })
  gender?: string;
}
