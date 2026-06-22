import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
;
import { OrdersService } from './orders.service';
import { CreateOrderDto, OrderQueryDto, UpdateOrderStatusDto, ProcessOrderDto } from './dto/order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Thống kê dashboard' })
  getDashboardStats(@CurrentUser() user: any) {
    return this.ordersService.getDashboardStats(user);
  }

  @Get('export')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Xuất danh sách đơn hàng kèm sản phẩm (Admin/Kế toán)' })
  exportOrders(@Query() query: OrderQueryDto, @CurrentUser() user: any) {
    return this.ordersService.exportOrders(query, user);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách đơn hàng' })
  findAll(@Query() query: OrderQueryDto, @CurrentUser() user: any) {
    return this.ordersService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đơn hàng' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.findOne(id, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('STORE_OWNER', 'ADMIN', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'Tạo đơn hàng mới' })
  create(@Body() createOrderDto: CreateOrderDto, @CurrentUser() user: any) {
    return this.ordersService.create(createOrderDto, user);
  }

  @Patch(':id/process')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'Xử lý đơn hàng: chỉnh sửa + duyệt + thanh toán/nợ' })
  processOrder(@Param('id') id: string, @Body() dto: ProcessOrderDto, @CurrentUser() user: any) {
    return this.ordersService.processOrder(id, dto, user);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'Duyệt đơn hàng (DRAFT → APPROVED)' })
  approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.approve(id, user);
  }

  @Patch(':id/ship')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'Bắt đầu giao hàng (APPROVED → SHIPPING)' })
  ship(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.ship(id, user);
  }

  @Patch(':id/complete')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'Hoàn thành đơn hàng (SHIPPING → COMPLETED)' })
  complete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.complete(id, user);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Hủy đơn hàng (chỉ khi DRAFT)' })
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.cancel(id, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Xóa đơn hàng đã duyệt (Admin only)' })
  deleteOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.deleteOrder(id, user);
  }
}
