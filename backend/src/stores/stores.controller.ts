import {
  Controller, Get, Post, Body, Patch, Param,
  UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
;
import { StoresService } from './stores.service';
import { CreateStoreDto, UpdateStoreDto, StoreQueryDto } from './dto/store.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Stores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách cửa hàng' })
  findAll(@Query() query: StoreQueryDto, @CurrentUser() user: any) {
    return this.storesService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết cửa hàng' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.storesService.findOne(id, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Tạo cửa hàng mới (Admin)' })
  create(@Body() createStoreDto: CreateStoreDto) {
    return this.storesService.create(createStoreDto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cập nhật cửa hàng (Admin)' })
  update(@Param('id') id: string, @Body() updateStoreDto: UpdateStoreDto) {
    return this.storesService.update(id, updateStoreDto);
  }
}
