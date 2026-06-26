import { Injectable } from '@nestjs/common';

import { PrismaService } from '../common/prisma.service';

/**
 * Catálogo de preços server-side (auditoria M-03).
 * Dono **não** pode mais definir `priceCents` no body — o preço é
 * derivado do plano via este mapa, eliminando o bypass de billing.
 */
const PLAN_PRICING_CENTS: Record<string, number> = {
  monthly: 4990, // R$ 49,90
  annual: 47900, // R$ 479,00 (~20% desconto)
};

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
    const serverPriceCents = PLAN_PRICING_CENTS[data.planType] ?? PLAN_PRICING_CENTS.monthly;

    const trialDays = 14;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    return this.prisma.subscription.upsert({
      where: { restaurantId: data.restaurantId },
      create: {
        restaurantId: data.restaurantId,
        status: 'trialing',
        planType: data.planType,
        priceCents: serverPriceCents,
        currency: 'BRL',
        trialDays,
        trialStartedAt: new Date(),
        trialEndsAt,
        version: 1,
      },
      update: {
        planType: data.planType,
        priceCents: serverPriceCents,
        status: 'active',
      },
      include: { restaurant: { select: { name: true } } },
    });
  }
}
