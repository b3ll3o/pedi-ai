import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';

import { IsSafeUrl } from '../../common/validators/SafeUrl.validator';

export class CreateRestaurantDto {
  @ApiProperty({ description: 'Nome do restaurante', example: 'Pizzaria do Zé', minLength: 2 })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Slug único (URL-friendly)',
    required: false,
    example: 'pizzaria-do-ze',
    minLength: 2,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  slug?: string;

  @ApiProperty({ description: 'Descrição do restaurante', required: false, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'Endereço', required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiProperty({ description: 'Telefone de contato', required: false, maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiProperty({ description: 'URL do logo', required: false, maxLength: 2048 })
  @IsOptional()
  @IsString()
  @IsSafeUrl()
  @MaxLength(2048)
  logoUrl?: string;

  /**
   * Auditoria A13: `ownerEmail` removido do DTO. Antes, o cliente podia
   * enviar um email no body e impersonar outro usuário como dono do
   * restaurante recém-criado. O dono é **sempre** derivado do JWT
   * (`req.user.email` + `req.user.id`), nunca do body.
   */
}

export class UpdateRestaurantDto {
  @ApiProperty({
    description: 'Nome do restaurante',
    required: false,
    minLength: 2,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiProperty({ description: 'Slug único', required: false, minLength: 2, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  slug?: string;

  @ApiProperty({ description: 'Descrição', required: false, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'Endereço', required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiProperty({ description: 'Telefone', required: false, maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiProperty({ description: 'URL do logo', required: false, maxLength: 2048 })
  @IsOptional()
  @IsString()
  @IsSafeUrl()
  @MaxLength(2048)
  logoUrl?: string;

  /**
   * Flag `active` só pode ser alterada por dono (ver restaurants.controller).
   * Manager não tem permissão para desativar/abrir o restaurante — evita DoS
   * do tenant inteiro.
   */
  @ApiProperty({
    description: 'Flag de ativo/inativo. Apenas `dono` pode alterar.',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
