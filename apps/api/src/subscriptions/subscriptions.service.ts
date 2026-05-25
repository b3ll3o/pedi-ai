import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../common/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async findByRestaurant(restaurantId: string) {
    return this.prisma.subscription.findFirst({
      where: { restaurantId },
      include: { restaurant: { select: { name: true } } },
    });
  }

  async createOrUpdate(data: { restaurantId: string; planType: string; priceCents?: number }) {
    const existing = await this.prisma.subscription.findFirst({
      where: { restaurantId: data.restaurantId },
    });

    if (existing) {
      return this.prisma.subscription.update({
        where: { id: existing.id },
        data: {
          planType: data.planType,
          priceCents: data.priceCents ?? existing.priceCents,
          status: 'active',
        },
        include: { restaurant: { select: { name: true } } },
      });
    }

    const trialDays = 14;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    return this.prisma.subscription.create({
      data: {
        restaurantId: data.restaurantId,
        status: 'trialing',
        planType: data.planType,
        priceCents: data.priceCents ?? 1999,
        currency: 'BRL',
        trialDays,
        trialStartedAt: new Date(),
        trialEndsAt,
        version: 1,
      },
      include: { restaurant: { select: { name: true } } },
    });
  }
}
