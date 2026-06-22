import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
;
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto, CreateCategoryDto } from './dto/product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Danh sách nhóm hàng' })
  findAllCategories() {
    return this.productsService.findAllCategories();
  }

  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Tạo nhóm hàng mới' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.productsService.createCategory(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách sản phẩm' })
  findAll(@Query() query: ProductQueryDto, @CurrentUser() user: any) {
    return this.productsService.findAll(query, user);
  }

  @Get(':id/stock-movements')
  @ApiOperation({ summary: 'Lịch sử xuất nhập kho của sản phẩm' })
  getStockMovements(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.getStockMovements(id, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết sản phẩm' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.findOne(id, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Tạo sản phẩm mới (Admin)' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cập nhật sản phẩm (Admin)' })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Xóa sản phẩm (Admin)' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
