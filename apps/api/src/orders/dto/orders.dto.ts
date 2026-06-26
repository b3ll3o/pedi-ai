import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MinLength,
  MaxLength,
  ArrayMaxSize,
  ArrayMinSize,
  IsUUID,
  IsEmail,
} from 'class-validator';

export class OrderItemDto {
  @ApiProperty({
    description: 'ID (UUID v4) do produto',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsString()
  @IsUUID('4', { message: 'productId deve ser UUID v4' })
  productId!: string;

  @ApiProperty({ description: 'Quantidade do item (1-999)', example: 2, minimum: 1, maximum: 999 })
  @IsNumber()
  @Min(1, { message: 'Quantidade deve ser ≥ 1' })
  @Max(999, { message: 'Quantidade máxima por item é 999' })
  quantity!: number;

  @ApiProperty({
    description:
      'Preço unitário enviado pelo cliente — IGNORADO pelo backend. Preço é sempre sobrescrito com `product.price` no service.',
    example: 25.5,
    minimum: 0,
    deprecated: true,
  })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiProperty({
    description:
      'Preço total do item (quantidade × unitPrice) — IGNORADO pelo backend. Recalculado a partir do preço real do produto.',
    example: 51.0,
    minimum: 0,
    deprecated: true,
  })
  @IsNumber()
  @Min(0)
  totalPrice!: number;

  @ApiProperty({
    description: 'Observações do item (ex: "sem cebola")',
    example: 'Sem cebola',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MinLength(0)
  @MaxLength(500)
  notes?: string;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'ID do restaurante (vem do QR code ou do JWT — validado server-side)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsString()
  @IsUUID('4')
  restaurantId!: string;

  @ApiProperty({ description: 'ID da mesa (opcional)', required: false, format: 'uuid' })
  @IsOptional()
  @IsString()
  @IsUUID('4')
  tableId?: string;

  @ApiProperty({ description: 'ID do cliente (UUID do usuário autenticado)', required: false })
  @IsOptional()
  @IsString()
  @IsUUID('4')
  customerId?: string;

  @ApiProperty({ description: 'Telefone de contato do cliente', required: false, maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  customerPhone?: string;

  @ApiProperty({ description: 'Nome do cliente', required: false, minLength: 1, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  customerName?: string;

  @ApiProperty({ description: 'Email do cliente', required: false, format: 'email' })
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  @MaxLength(255)
  customerEmail?: string;

  @ApiProperty({
    description: 'Subtotal — IGNORADO pelo backend. Recalculado a partir de preços reais.',
    example: 51.0,
    minimum: 0,
    deprecated: true,
  })
  @IsNumber()
  @Min(0)
  @Max(10_000_000)
  subtotal!: number;

  @ApiProperty({ description: 'Taxa de serviço', example: 5.0, minimum: 0, maximum: 10_000_000 })
  @IsNumber()
  @Min(0)
  @Max(10_000_000)
  tax!: number;

  @ApiProperty({
    description: 'Total — IGNORADO pelo backend. Recalculado.',
    example: 56.0,
    minimum: 0,
    deprecated: true,
  })
  @IsNumber()
  @Min(0)
  @Max(10_000_000)
  total!: number;

  @ApiProperty({
    description: 'Método de pagamento',
    enum: PaymentMethod,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'Método de pagamento inválido' })
  paymentMethod?: PaymentMethod;

  @ApiProperty({
    description: 'Chave de idempotência (UUID v4) — evita pedidos duplicados em retry',
    required: false,
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;

  @ApiProperty({
    description: 'Lista de itens do pedido (1-100)',
    type: () => [OrderItemDto],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Pedido deve ter ao menos 1 item' })
  @ArrayMaxSize(100, { message: 'Pedido não pode ter mais de 100 itens' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'Novo status do pedido',
    enum: ['pending_payment', 'paid', 'preparing', 'ready', 'delivered', 'cancelled'],
    example: 'preparing',
  })
  @IsEnum(['pending_payment', 'paid', 'preparing', 'ready', 'delivered', 'cancelled'] as const, {
    message: 'Status inválido',
  })
  status!: 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

  @ApiProperty({ description: 'Notas sobre a mudança de status', required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
