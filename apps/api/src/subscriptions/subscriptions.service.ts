import { Injectable } from '@nestjs/common';

import { PrismaService } from '../common/prisma.service';
import { PRICING_PLANS, isValidPlanType, getPlanPriceCents, type PlanType } from '@pedi-ai/shared/constants';

/**
 * Service de assinaturas (billing SaaS).
 *
 * Catálogo de preços server-side (auditoria M-03):
 * - Preços SEMPRE derivados de `PRICING_PLANS` em `@pedi-ai/shared/constants`.
 * - Dono NÃO pode definir `priceCents` no body — é ignorado, eliminando bypass de billing.
 *
 * TODO (auditoria P0-2): integrar com Asaas pra cobrar de verdade.
 * Por enquanto, este service só gerencia o `status` (trial/active/expired/cancelled).
 * A integração com gateway de pagamento está em stub até a feature ser implementada.
 */
@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async findByRestaurant(restaurantId: string) {
    return this.prisma.subscription.findFirst({
      where: { restaurantId },
      include: { restaurant: { select: { name: true } } },
    });
  }

  async createOrUpdate(data: { restaurantId: string; planType: string }) {
    // Auditoria A-03: `upsert` é atômico — 2 requests simultâneas com mesmo
    // restaurantId resultam em 1 update + 1 no-op (não em P2002 + 500).
    // Auditoria M-03: `priceCents` é SEMPRE derivado do catálogo server-side.
    // Qualquer valor do body é IGNORADO para evitar bypass de billing.
    const planType: PlanType = isValidPlanType(data.planType) ? data.planType : 'monthly';
    const serverPriceCents = getPlanPriceCents(planType);
    const trialDays = PRICING_PLANS[planType].trialDays;

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    return this.prisma.subscription.upsert({
      where: { restaurantId: data.restaurantId },
      create: {
        restaurantId: data.restaurantId,
        status: 'trialing',
        planType,
        priceCents: serverPriceCents,
        currency: 'BRL',
        trialDays,
        trialStartedAt: new Date(),
        trialEndsAt,
        version: 1,
      },
      update: {
        planType,
        priceCents: serverPriceCents,
        status: 'active',
      },
      include: { restaurant: { select: { name: true } } },
    });
  }
}