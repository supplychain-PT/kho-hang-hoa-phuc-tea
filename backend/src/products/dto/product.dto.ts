import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'NVL010227' })
  @IsString()
  code: string;

  @ApiProperty({ example: '[Combo] 300 Xô Trà Trái Cây' })
  @IsString()
  name: string;

  @ApiProperty({ example: 1590000 })
  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @ApiProperty({ example: 1160000 })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiPropertyOptional({ example: 26 })
  @IsOptional()
  @IsNumber()
  stock?: number = 0;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  minStock?: number = 0;

  @ApiProperty({ example: 'Thùng' })
  @IsString()
  unit: string;

  @ApiProperty({ example: 'category_id_here' })
  @IsString()
  categoryId: string;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ProductQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number = 50;

  @ApiPropertyOptional()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'NGUYÊN LIỆU' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'NL' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number = 0;
}
