import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
;
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'ACCOUNTANT')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Tổng quan hệ thống' })
  getOverview() {
    return this.reportsService.getOverview();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Báo cáo doanh thu' })
  getRevenue(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.reportsService.getRevenue(dateFrom, dateTo);
  }

  @Get('top-stores')
  @ApiOperation({ summary: 'Top cửa hàng đặt hàng nhiều nhất' })
  getTopStores() {
    return this.reportsService.getTopStores();
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Top sản phẩm bán chạy' })
  getTopProducts() {
    return this.reportsService.getTopProducts();
  }
}
