import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service'; // Kiểm tra đúng đường dẫn PrismaService của bạn

@ApiTags('Health (Kiểm tra hệ thống)')
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kiểm tra trạng thái vận hành của API và cơ sở dữ liệu' })
  @ApiResponse({ status: 200, description: 'Hệ thống vận hành bình thường (200 OK)' })
  @ApiResponse({ status: 503, description: 'CSDL mất kết nối (503 Service Unavailable)' })
  async checkHealth() {
    try {
      // Gửi truy vấn thăm dò thực tế vào PostgreSQL
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected',
        version: '1.0.0',
      };
    } catch {
      // Khi postgres bị stop, lệnh queryRaw sẽ ném lỗi và nhảy vào đây
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'disconnected',
        version: '1.0.0',
      });
    }
  }
}
