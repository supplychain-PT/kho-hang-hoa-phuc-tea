import { IsString, IsArray, IsNumber, IsOptional, Min, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../../common/constants/enums';

export class OrderItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  storeId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class UpdateOrderStatusDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class ProcessOrderItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Giảm giá theo dòng (VNĐ)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ description: 'Vị trí sắp xếp', default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class ProcessOrderDto {
  @ApiProperty({ type: [ProcessOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessOrderItemDto)
  items: ProcessOrderItemDto[];

  @ApiPropertyOptional({ description: 'Giảm giá tổng đơn (VNĐ)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalDiscount?: number;

  @ApiProperty({ example: false })
  payNow: boolean;

  @ApiPropertyOptional({ example: 'CASH' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class OrderQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  status?: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc nhiều trạng thái, cách nhau dấu phẩy: APPROVED,SHIPPING,COMPLETED' })
  @IsOptional()
  @IsString()
  statusIn?: string;
}
