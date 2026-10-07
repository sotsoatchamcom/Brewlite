import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service'; // Import UsersService
import { CreateUserDto } from '../users/dto/create-user.dto'; // Import DTO
import { Role } from '@prisma/client'; // Import Role Enum

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private usersService: UsersService, // Tiêm UsersService vào để dùng chung logic tạo user
  ) {}

  // Bổ sung hàm đăng ký đáp ứng Task 7
  async register(createUserDto: CreateUserDto) {
    // Khách hàng vãng lai đăng ký qua luồng này luôn bị ép quyền CUSTOMER
    return this.usersService.create(createUserDto, Role.CUSTOMER);
  }

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không chính xác',
      );
    }

    // CHỐT CHẶN: Kiểm tra trạng thái hoạt động (isActive)
    if (!user.isActive) {
      throw new ForbiddenException(
        'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên để biết thêm chi tiết.',
      );
    }

    // So sánh mật khẩu với passwordHash trong cơ sở dữ liệu
    const isPasswordMatching = await bcrypt.compare(pass, user.passwordHash);
    if (!isPasswordMatching) {
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không chính xác',
      );
    }

    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        loyaltyPoints: user.loyaltyPoints,
      },
    };
  }
}
