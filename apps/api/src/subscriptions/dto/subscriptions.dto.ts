import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min } from 'class-validator';

/**
 * Planos suportados pelo gateway de billing.
 * Auditoria M-03: `priceCents` foi **removido** daqui — antes o cliente
 * enviava o preço e podia burlar o billing (`priceCents: 0`).
 * Agora o preço é derivado server-side via catálogo interno em
 * `SubscriptionsService.createOrUpdate`.
 */
export enum PlanType {
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
}

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'Tipo de plano',
    enum: PlanType,
    example: PlanType.MONTHLY,
  })
  @IsEnum(PlanType, { message: 'planType deve ser "monthly" ou "annual"' })
  planType!: PlanType;

  /**
   * `@IsOptional` apenas para manter o campo no body tolerável em clientes
   * legados — o valor é **IGNORADO** pelo service. Mantido aqui só para
   * rejeitar via class-validator (em vez de silenciosamente aceitar) e
   * retornar 400 com mensagem clara.
   */
  @ApiProperty({
    description: 'DEPRECATED — ignorado pelo service. Preço é derivado do catálogo server-side.',
    required: false,
    deprecated: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;
}
