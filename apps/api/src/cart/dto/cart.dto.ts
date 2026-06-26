import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CartItemModifierDto {
  @ApiProperty({
    description: 'ID do grupo de modificadores (do cardápio)',
    example: 'mg-grupo-pao',
  })
  @IsString()
  group_id!: string;

  @ApiProperty({
    description: 'ID do valor do modificador selecionado',
    example: 'mv-pao-brioche',
  })
  @IsString()
  value_id!: string;
}

export class CartItemDto {
  @ApiProperty({
    description: 'ID único do item no carrinho (cliente)',
    example: 'item-uuid-1',
  })
  @IsString()
  id!: string;

  @ApiProperty({
    description: 'ID do produto (referência ao banco)',
    example: 'prod-burger-artesanal',
  })
  @IsString()
  productId!: string;

  @ApiProperty({
    description: 'Nome do produto no momento da adição (apenas para mensagens de erro)',
    example: 'Burger Artesanal',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Quantidade desejada',
    example: 2,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({
    description: 'Preço unitário capturado pelo cliente (em centavos) — validado contra o servidor',
    example: 2990,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPrice!: number;

  @ApiProperty({
    description: 'Modificadores aplicados a este item',
    type: () => CartItemModifierDto,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemModifierDto)
  modifiers?: CartItemModifierDto[];
}

export class ValidateCartDto {
  @ApiProperty({
    description: 'Itens do carrinho a serem validados',
    type: () => CartItemDto,
    isArray: true,
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[];

  @ApiProperty({
    description:
      'ID do restaurante. **OBS:** o servidor IGNORA este campo e usa o restaurantId do JWT quando disponível; aceita apenas quando o requisitante é cliente sem vínculo e sem tableId. O cliente pode usar tableId (com QR Code) e omitir este campo — o servidor deriva o restaurantId da mesa.',
    example: 'rest-uuid',
    required: false,
  })
  @IsOptional()
  @IsString()
  restaurantId?: string;

  @ApiProperty({
    description: 'ID da mesa (opcional — clientes em mesa validam QR Code)',
    example: 'table-uuid',
    required: false,
  })
  @IsOptional()
  @IsString()
  tableId?: string;
}

export interface CartValidationResult {
  valid: boolean;
  errors?: string[];
}
