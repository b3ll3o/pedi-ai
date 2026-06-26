import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class CreatePixPaymentDto {
  @ApiProperty({
    description: 'ID (UUID v4) do pedido a ser pago',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'orderId inválido' })
  orderId!: string;

  @ApiProperty({
    description: 'ID (UUID v4) do restaurante — validado server-side (vem do JWT/QR, não do body)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'restaurantId inválido' })
  restaurantId!: string;

  @ApiProperty({ description: 'Valor do pagamento em reais', example: 56.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  amount!: number;
}
