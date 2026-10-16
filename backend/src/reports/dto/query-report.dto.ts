import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export const REPORT_RANGES = ['7d', '30d', '6m', '12m', 'all'] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];

export class QueryReportDto {
  @ApiPropertyOptional({
    enum: REPORT_RANGES,
    default: '6m',
    description:
      'Khoảng thời gian: 7d, 30d (theo ngày) | 6m, 12m, all (theo tháng). Mặc định 6m',
  })
  @IsOptional()
  @IsIn(REPORT_RANGES, {
    message: `Khoảng thời gian không hợp lệ, chỉ nhận: ${REPORT_RANGES.join(', ')}`,
  })
  range?: ReportRange = '6m';
}
