import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { QueryNotificationDto } from './dto/query-notification.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ------------------------- ADMIN -------------------------

  @Get()
  @ApiOperation({ summary: 'Danh sách thông báo của Admin (phân trang, lọc đã đọc/loại)' })
  findAll(@Query() query: QueryNotificationDto) {
    return this.notificationsService.findAll(query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Số thông báo chưa đọc của Admin' })
  async unreadCount() {
    return { count: await this.notificationsService.unreadCount() };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo Admin là đã đọc' })
  markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }

  @Delete('clear-read')
  @ApiOperation({ summary: 'Xoá toàn bộ thông báo Admin đã đọc' })
  clearRead() {
    return this.notificationsService.clearRead();
  }

  // ------------------------- KHÁCH HÀNG -------------------------
  // Khai báo TRƯỚC các route có :id để "me" không bị hiểu nhầm thành id

  @Get('me')
  @ApiOperation({ summary: 'Danh sách thông báo của khách hàng (?userId=)' })
  findMine(@Query() query: QueryNotificationDto) {
    if (!query.userId) throw new BadRequestException('userId là bắt buộc');
    return this.notificationsService.findAll(query, query.userId);
  }

  @Get('me/unread-count')
  @ApiOperation({ summary: 'Số thông báo chưa đọc của khách hàng' })
  async myUnreadCount(@Query('userId', ParseIntPipe) userId: number) {
    return { count: await this.notificationsService.unreadCount(userId) };
  }

  @Patch('me/read-all')
  @ApiOperation({ summary: 'Khách hàng đánh dấu tất cả là đã đọc' })
  markAllMineAsRead(@Query('userId', ParseIntPipe) userId: number) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch('me/:id/read')
  @ApiOperation({ summary: 'Khách hàng đánh dấu 1 thông báo là đã đọc' })
  markMineAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  // ------------------------- ADMIN (theo :id) -------------------------

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu 1 thông báo Admin là đã đọc' })
  markAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.markAsRead(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá 1 thông báo Admin' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.remove(id);
  }
}
