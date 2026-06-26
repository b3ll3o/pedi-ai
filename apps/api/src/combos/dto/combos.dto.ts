import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';

export class ComboItemDto {
  @ApiProperty({ description: 'ID do produto que compõe o combo' })
  @IsString()
  productId!: string;

  @ApiProperty({ description: 'Quantidade do produto no combo', example: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CreateComboDto {
  /**
   * `restaurantId` é IGNORADO se autenticado — controller injeta o do JWT.
   */
  @ApiProperty({
    description: 'ID do restaurante (injetado do JWT se autenticado)',
    required: false,
  })
  @IsOptional()
  @IsString()
  restaurantId?: string;

  @ApiProperty({
    description: 'Nome do combo',
    example: 'Combo Família',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Descrição do combo', required: false, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiProperty({ description: 'Preço do combo em reais', example: 49.9, minimum: 0 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ description: 'Combo ativo/visível', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiProperty({ description: 'Produtos que compõem o combo', type: () => [ComboItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  items!: ComboItemDto[];
}

export class UpdateComboDto {
  @ApiProperty({ description: 'Nome do combo', required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiProperty({ description: 'Descrição do combo', required: false, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiProperty({ description: 'Preço do combo', required: false, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ description: 'Combo ativo/visível', required: false })
  @IsOptional()
  @IsBoolean()
  available?: boolean;
}
