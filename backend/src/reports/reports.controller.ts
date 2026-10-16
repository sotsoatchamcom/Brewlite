import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { QueryReportDto } from './dto/query-report.dto';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @ApiOperation({
    summary:
      'Báo cáo tổng hợp: KPI, doanh thu theo thời gian, trạng thái đơn, top sản phẩm/khách, thanh toán, tồn kho',
  })
  summary(@Query() query: QueryReportDto) {
    return this.reportsService.summary(query.range);
  }
}
