import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'MatKhauCu123', description: 'Mật khẩu hiện tại' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu cũ' })
  oldPassword: string;

  @ApiProperty({ example: 'Abc@123456!', description: 'Mật khẩu mới' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt',
    },
  )
  @MaxLength(50, { message: 'Mật khẩu không được vượt quá 50 ký tự' })
  @MinLength(8, { message: 'Mật khẩu phải từ 8 ký tự trở lên' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu mới' })
  newPassword: string;

  @ApiProperty({ example: 'Abc@123456!', description: 'Xác nhận mật khẩu mới' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng xác nhận mật khẩu mới' })
  confirmNewPassword: string;
}
