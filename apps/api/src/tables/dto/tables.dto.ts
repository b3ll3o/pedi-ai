import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, MinLength, IsBoolean } from 'class-validator';

export class CreateTableDto {
  @ApiProperty({ description: 'Nome/identificador da mesa', example: 'Mesa 1', minLength: 1 })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ description: 'Número da mesa', required: false, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  number?: number;

  @ApiProperty({ description: 'Capacidade (lugares)', required: false, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;

  /** Injetado pelo controller via JWT */
  restaurantId?: string | null;
}

export class UpdateTableDto {
  @ApiProperty({ description: 'Nome/identificador', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Número da mesa', required: false, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  number?: number;

  @ApiProperty({ description: 'Capacidade (lugares)', required: false, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;

  @ApiProperty({ description: 'Mesa ativa/inativa', required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
