import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto'; // Import DTO từ Users

@ApiTags('Auth (Xác thực)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ========================================================
  // ENDPOINT ĐĂNG KÝ (Hoàn thành Task 7)
  // ========================================================
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản khách hàng (Public)' })
  register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  // ========================================================
  // ENDPOINT ĐĂNG NHẬP
  // ========================================================
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập và nhận JWT Token' })
  signIn(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }
}
