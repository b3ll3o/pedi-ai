import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsBoolean,
} from 'class-validator';

import { IsSafeUrl } from '../../common/validators/SafeUrl.validator';

export class CreateProductDto {
  @ApiProperty({ description: 'ID da categoria', required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({
    description: 'ID do restaurante (injetado pelo controller a partir do JWT)',
    required: false,
  })
  @IsOptional()
  @IsString()
  restaurantId?: string;

  @ApiProperty({
    description: 'Nome do produto',
    example: 'X-Burger',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Descrição do produto',
    required: false,
    example: 'Hambúrguer artesanal com queijo',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description: 'URL da imagem do produto',
    required: false,
    example: 'https://cdn.exemplo.com/xburger.jpg',
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @IsSafeUrl()
  @MaxLength(2048)
  imageUrl?: string;

  @ApiProperty({ description: 'Preço em reais', example: 25.5, minimum: 0, maximum: 1_000_000 })
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  price!: number;

  @ApiProperty({
    description: 'Rótulos dietéticos (vegetariano, sem glúten, etc.)',
    required: false,
    example: 'vegetariano',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  dietaryLabels?: string;

  @ApiProperty({
    description: 'Ordem de exibição',
    required: false,
    example: 0,
    minimum: 0,
    maximum: 9999,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}

export class UpdateProductDto {
  @ApiProperty({ description: 'Nome do produto', required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiProperty({ description: 'Descrição do produto', required: false, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'URL da imagem', required: false, maxLength: 2048 })
  @IsOptional()
  @IsString()
  @IsSafeUrl()
  @MaxLength(2048)
  imageUrl?: string;

  @ApiProperty({ description: 'Preço em reais', required: false, minimum: 0, maximum: 1_000_000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  price?: number;

  @ApiProperty({ description: 'Rótulos dietéticos', required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  dietaryLabels?: string;

  @ApiProperty({ description: 'Disponibilidade do produto', required: false })
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiProperty({ description: 'Ordem de exibição', required: false, minimum: 0, maximum: 9999 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}
