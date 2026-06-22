import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
;
import { PaymentsService } from './payments.service';
import { RecordPaymentDto, PaymentQueryDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'ACCOUNTANT')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thanh toán' })
  findAll(@Query() query: PaymentQueryDto) {
    return this.paymentsService.findAll(query);
  }

  @Get('debts')
  @ApiOperation({ summary: 'Danh sách công nợ chưa thanh toán' })
  getDebts(@Query() query: PaymentQueryDto) {
    return this.paymentsService.getDebts(query);
  }

  @Get('debts/by-owner')
  @ApiOperation({ summary: 'Công nợ theo chủ cửa hàng' })
  getDebtByOwner() {
    return this.paymentsService.getDebtByOwner();
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Thông tin thanh toán của đơn hàng' })
  getByOrderId(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentByOrderId(orderId);
  }

  @Post('order/:orderId/pay')
  @ApiOperation({ summary: 'Ghi nhận thanh toán' })
  recordPayment(@Param('orderId') orderId: string, @Body() dto: RecordPaymentDto) {
    return this.paymentsService.recordPayment(orderId, dto);
  }
}
