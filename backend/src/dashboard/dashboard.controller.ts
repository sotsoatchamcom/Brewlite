import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary:
      'Tổng quan trong ngày: doanh thu/đơn hôm nay so với hôm qua, hàng đợi cần xử lý, đơn gần đây, tồn kho, thông báo',
  })
  summary(@Query() query: QueryDashboardDto) {
    return this.dashboardService.summary(query.recentOrders);
  }
}
