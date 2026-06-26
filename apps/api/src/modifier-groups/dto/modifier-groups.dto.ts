import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateModifierGroupDto {
  @ApiProperty({
    description: 'ID do restaurante (injetado do JWT se autenticado)',
    required: false,
  })
  @IsOptional()
  @IsString()
  restaurantId?: string;

  @ApiProperty({
    description: 'Nome do grupo',
    example: 'Adicionais',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Grupo obrigatório', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiProperty({ description: 'Mínimo de seleções', required: false, minimum: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minSelections?: number;

  @ApiProperty({ description: 'Máximo de seleções', required: false, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxSelections?: number;
}

export class UpdateModifierGroupDto {
  @ApiProperty({ description: 'Nome do grupo', required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiProperty({ description: 'Grupo obrigatório', required: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiProperty({ description: 'Mínimo de seleções', required: false, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minSelections?: number;

  @ApiProperty({ description: 'Máximo de seleções', required: false, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxSelections?: number;
}

export class AddModifierValueDto {
  @ApiProperty({ description: 'Nome da opção', example: 'Bacon', minLength: 1, maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Ajuste de preço (positivo ou negativo)',
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  priceAdjustment?: number;
}

export class UpdateModifierValueDto {
  @ApiProperty({ description: 'Nome da opção', required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiProperty({ description: 'Ajuste de preço', required: false })
  @IsOptional()
  @IsNumber()
  priceAdjustment?: number;

  @ApiProperty({ description: 'Opção ativa/visível', required: false })
  @IsOptional()
  @IsBoolean()
  available?: boolean;
}
