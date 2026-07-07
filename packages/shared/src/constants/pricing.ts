/**
 * Pricing — Constantes de Negócio
 *
 * **FONTE DA VERDADE ÚNICA** dos preços dos planos do Pedi-AI.
 * - Backend (`apps/api`) consome daqui pra calcular cobrança via Asaas.
 * - Frontend (`apps/web`) consome daqui pra exibir na landing e no painel.
 * - Qualquer mudança de preço DEVE ser feita aqui e em mais lugar nenhum.
 *
 * **REGRA ANTI-BYPASS (auditoria M-03):** o backend NUNCA aceita `priceCents`
 * do body da request — sempre lê daqui. Frontend pode usar pra preview, mas
 * a fonte autoritativa é este arquivo.
 *
 * ## Como adicionar um novo plano
 *
 * 1. Adicionar entrada em `PRICING_PLANS` com `monthly`/`annual` em centavos.
 * 2. Atualizar landing page (`apps/web/src/app/page.tsx`) consumindo daqui.
 * 3. Atualizar validação DTO (`apps/api/src/subscriptions/dto/subscriptions.dto.ts`)
 *    pra aceitar o novo `planType` no enum.
 * 4. Adicionar feature flag correspondente se o plano tem features exclusivas.
 * 5. Documentar no `AGENTS.md` e `PROJECT_CONTEXT.md`.
 *
 * ## Auditoria de mudanças
 *
 * | Data       | Plano       | De → Para       | Motivo                          |
 * |------------|-------------|-----------------|---------------------------------|
 * | 2026-07-06 | monthly     | → R$ 49,90      | Unificação (era R$ 19,99 no web)|
 * | 2026-07-06 | annual      | → R$ 479,00     | ~20% desconto sobre annualizado |
 */

export type PlanType = 'monthly' | 'annual';

/**
 * Preços em **centavos** (R$ 49,90 = 4990 centavos).
 * Imutável — não aceitar do body da request (auditoria M-03).
 */
export const PRICING_PLANS: Record<PlanType, {
  /** Preço em centavos (ex: 4990 = R$ 49,90). */
  priceCents: number;
  /** Moeda ISO 4217. */
  currency: 'BRL';
  /** Descrição humana do plano. */
  description: string;
  /** Dias de trial grátis ao assinar. */
  trialDays: number;
}> = {
  monthly: {
    priceCents: 4990, // R$ 49,90
    currency: 'BRL',
    description: 'Plano mensal — R$ 49,90/mês',
    trialDays: 14,
  },
  annual: {
    priceCents: 47900, // R$ 479,00 (~20% off vs 12× mensal)
    currency: 'BRL',
    description: 'Plano anual — R$ 479,00/ano (economize R$ 119,80)',
    trialDays: 14,
  },
};

/**
 * Lista ordenada dos planos (pra renderizar na landing page / dashboard).
 */
export const PLAN_ORDER: readonly PlanType[] = ['monthly', 'annual'] as const;

/**
 * Helper: obtém preço em centavos de um plano. Retorna `monthly` se inválido.
 */
export function getPlanPriceCents(planType: string): number {
  if (planType in PRICING_PLANS) {
    return PRICING_PLANS[planType as PlanType].priceCents;
  }
  return PRICING_PLANS.monthly.priceCents;
}

/**
 * Helper: formata centavos → "R$ 49,90".
 */
export function formatPrice(cents: number): string {
  const reais = cents / 100;
  return `R$ ${reais.toFixed(2).replace('.', ',')}`;
}

/**
 * Helper: obtém preço formatado de um plano.
 */
export function getPlanPriceFormatted(planType: PlanType): string {
  return formatPrice(PRICING_PLANS[planType].priceCents);
}

/**
 * Helper: calcula data de expiração do trial a partir de "agora".
 */
export function getTrialEndDate(startDate: Date = new Date(), planType: PlanType = 'monthly'): Date {
  const trialDays = PRICING_PLANS[planType].trialDays;
  const expiresAt = new Date(startDate);
  expiresAt.setDate(expiresAt.getDate() + trialDays);
  return expiresAt;
}

/**
 * Helper: tipo TypeScript guard — verifica se uma string é um `PlanType` válido.
 */
export function isValidPlanType(value: unknown): value is PlanType {
  return typeof value === 'string' && value in PRICING_PLANS;
}