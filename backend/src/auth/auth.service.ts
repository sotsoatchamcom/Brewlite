import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { ChangePasswordDto } from '../users/dto/change-password.dto';import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
      private prisma: PrismaService,
      private jwtService: JwtService,
      private usersService: UsersService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto, Role.CUSTOMER);
  }

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException(
          'Tài khoản hoặc mật khẩu không chính xác',
      );
    }

    if (!user.isActive) {
      throw new ForbiddenException(
          'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên để biết thêm chi tiết.',
      );
    }

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

  // ========================================================
  // ENDPOINT ĐỔI MẬT KHẨU (Khớp với ChangePasswordDto & passwordHash)
  // ========================================================
  async changePassword(userId: number, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('Xác nhận mật khẩu mới không khớp');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin tài khoản');
    }

    // 1. So khớp mật khẩu cũ với cột passwordHash trong DB
    const isOldPasswordMatch = await bcrypt.compare(
        dto.oldPassword,
        user.passwordHash,
    );
    if (!isOldPasswordMatch) {
      throw new BadRequestException('Mật khẩu cũ không chính xác');
    }

    // 2. Không cho phép đặt trùng mật khẩu cũ
    const isSameAsOld = await bcrypt.compare(
        dto.newPassword,
        user.passwordHash,
    );
    if (isSameAsOld) {
      throw new BadRequestException(
          'Mật khẩu mới không được trùng với mật khẩu hiện tại',
      );
    }

    // 3. Băm mật khẩu mới và cập nhật vào cột passwordHash
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return {
      success: true,
      message: 'Đổi mật khẩu thành công',
    };
  }
}