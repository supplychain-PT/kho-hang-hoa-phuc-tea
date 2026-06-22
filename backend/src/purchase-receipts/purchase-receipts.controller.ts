import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PurchaseReceiptsService } from './purchase-receipts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Purchase Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchase-receipts')
export class PurchaseReceiptsController {
  constructor(private readonly service: PurchaseReceiptsService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'WAREHOUSE_STAFF')
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.create(dto, user);
  }

  @Patch(':id/complete')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'WAREHOUSE_STAFF')
  complete(@Param('id') id: string) {
    return this.service.complete(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
