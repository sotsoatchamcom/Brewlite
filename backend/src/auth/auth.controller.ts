import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Patch,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { ChangePasswordDto } from '../users/dto/change-password.dto';
@ApiTags('Auth (Xác thực)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản khách hàng (Public)' })
  register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập và nhận JWT Token' })
  signIn(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  // ========================================================
  // ENDPOINT ĐỔI MẬT KHẨU
  // ========================================================
  @Patch('change-password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Khách hàng / Admin đổi mật khẩu' })
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('Vui lòng đăng nhập để thực hiện');
    }
    return this.authService.changePassword(userId, dto);
  }
}