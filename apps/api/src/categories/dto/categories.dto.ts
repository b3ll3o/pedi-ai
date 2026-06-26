import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max, MinLength, MaxLength } from 'class-validator';

import { IsSafeUrl } from '../../common/validators/SafeUrl.validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Nome da categoria',
    example: 'Bebidas',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Descrição da categoria', required: false, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'URL da imagem da categoria', required: false, maxLength: 2048 })
  @IsOptional()
  @IsString()
  @IsSafeUrl()
  @MaxLength(2048)
  imageUrl?: string;

  @ApiProperty({ description: 'Ordem de exibição', required: false, minimum: 0, maximum: 9999 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  /**
   * restaurantId é injetado pelo controller a partir do JWT.
   */
  restaurantId?: string;
}

export class UpdateCategoryDto {
  @ApiProperty({ description: 'Nome da categoria', required: false, minLength: 1, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiProperty({ description: 'Descrição da categoria', required: false, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'URL da imagem da categoria', required: false, maxLength: 2048 })
  @IsOptional()
  @IsString()
  @IsSafeUrl()
  @MaxLength(2048)
  imageUrl?: string;

  @ApiProperty({ description: 'Ordem de exibição', required: false, minimum: 0, maximum: 9999 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}
