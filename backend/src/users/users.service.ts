import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { QueryUserDto } from './dto/query-user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, role: Role = Role.CUSTOMER) {
    // 1. Kiểm tra trùng Email
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    // 2. Kiểm tra trùng Số điện thoại
    if (createUserDto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: createUserDto.phone },
      });
      if (existingPhone) {
        throw new ConflictException('Số điện thoại này đã được sử dụng');
      }
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );

    const newUser = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        phone: createUserDto.phone,
        gender: createUserDto.gender,
        passwordHash: hashedPassword,
        role: role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        gender: true,
        loyaltyPoints: true,
        role: true,
      },
    });

    return { message: 'Tạo tài khoản thành công', data: newUser };
  }

  // Cập nhật hàm findAll để hỗ trợ phân trang và tìm kiếm
  async findAll(query: QueryUserDto) {
    const { search, role, page, limit } = query;
    const skip = (page - 1) * limit;

    const whereCondition: any = {};

    if (role) {
      whereCondition.role = role;
    }

    if (search) {
      // Tìm kiếm tương đối trên name, email và phone
      whereCondition.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereCondition,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          gender: true,
          loyaltyPoints: true,
          role: true,
          isActive: true,
        },
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.user.count({ where: whereCondition }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        gender: true,
        loyaltyPoints: true,
        role: true,
        isActive: true,
      },
    });

    if (!user)
      throw new NotFoundException(`Không tìm thấy người dùng với ID ${id}`);
    return user;
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    if (
      changePasswordDto.newPassword !== changePasswordDto.confirmNewPassword
    ) {
      throw new BadRequestException('Xác nhận mật khẩu không khớp!');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const isMatch = await bcrypt.compare(
      changePasswordDto.oldPassword,
      user.passwordHash,
    );
    if (!isMatch) throw new BadRequestException('Mật khẩu cũ không chính xác');

    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      saltRounds,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedNewPassword },
    });

    return { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user)
      throw new NotFoundException(`Không tìm thấy người dùng với ID ${id}`);

    if (updateUserDto.phone && updateUserDto.phone !== user.phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: {
          phone: updateUserDto.phone,
          id: { not: id },
        },
      });
      if (existingPhone) {
        throw new ConflictException(
          'Số điện thoại này đã được sử dụng bởi một tài khoản khác',
        );
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        gender: true,
        loyaltyPoints: true,
        role: true,
      },
    });
  }

  async toggleStatus(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user)
      throw new NotFoundException(`Không tìm thấy người dùng với ID ${id}`);

    if (user.role === Role.ADMIN) {
      throw new ConflictException('Không thể khóa tài khoản Admin!');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, name: true, isActive: true },
    });

    return {
      message: updatedUser.isActive
        ? `Đã mở khóa tài khoản ${updatedUser.name}`
        : `Đã khóa tài khoản ${updatedUser.name}`,
    };
  }
}
