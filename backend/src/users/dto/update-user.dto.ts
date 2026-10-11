import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsBoolean } from 'class-validator';

// Phải dùng PartialType toàn bộ để Admin có thể ép đổi password, không dùng OmitType
export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    example: true,
    description: 'Trạng thái hoạt động (true = mở, false = khóa)',
  })
  @IsOptional()
  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean' })
  isActive?: boolean;
}
