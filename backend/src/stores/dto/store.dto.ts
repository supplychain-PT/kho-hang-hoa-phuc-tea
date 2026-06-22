import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateStoreDto {
  @ApiProperty({ example: 'PHUCTEA128' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'GÒ CÔNG TÂY' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '0947422578' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'user_id_here' })
  @IsString()
  ownerId: string;
}

export class UpdateStoreDto extends PartialType(CreateStoreDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class StoreQueryDto {
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
  ownerId?: string;
}
