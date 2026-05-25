import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../common/prisma.service';

@Injectable()
export class RestaurantsService {
  constructor(private prisma: PrismaService) {}

  async findAll(active = true) {
    return this.prisma.restaurant.findMany({
      where: active ? { active: true } : undefined,
    });
  }

  async findById(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) {
      throw new NotFoundException('Restaurante não encontrado');
    }
    return restaurant;
  }

  async findByIds(ids: string[]) {
    return this.prisma.restaurant.findMany({
      where: { id: { in: ids } },
    });
  }

  async findByUserId(userId: string) {
    const profiles = await this.prisma.usersProfile.findMany({
      where: { userId },
      select: { restaurantId: true },
    });
    const restaurantIds = profiles
      .map((p) => p.restaurantId)
      .filter((id): id is string => id !== null);
    if (restaurantIds.length === 0) return [];
    return this.findByIds(restaurantIds);
  }

  async findByUserIdWithTrial(userId: string) {
    const profiles = await this.prisma.usersProfile.findMany({
      where: { userId, role: 'dono' },
      select: { restaurantId: true },
    });
    const restaurantIds = profiles
      .map((p) => p.restaurantId)
      .filter((id): id is string => id !== null);
    if (restaurantIds.length === 0) return [];

    const now = new Date();
    const restaurants = await this.prisma.restaurant.findMany({
      where: {
        id: { in: restaurantIds },
        active: true,
        subscriptions: {
          some: {
            status: 'trialing',
            trialEndsAt: { gt: now },
          },
        },
      },
    });

    return restaurants;
  }

  async findBySlug(slug: string) {
    return this.prisma.restaurant.findFirst({ where: { slug } });
  }

  async create(data: {
    name: string;
    slug?: string;
    description?: string;
    address?: string;
    phone?: string;
    logoUrl?: string;
  }) {
    return this.prisma.restaurant.create({ data });
  }

  async createWithOwner(data: {
    name: string;
    slug?: string;
    description?: string;
    address?: string;
    phone?: string;
    logoUrl?: string;
    ownerId: string;
    ownerEmail: string;
    ownerRole?: UserRole;
  }) {
    const trialDays = 14;
    const now = new Date();
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    return this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          address: data.address,
          phone: data.phone,
          logoUrl: data.logoUrl,
        },
      });

      const ownerName = data.ownerEmail.split('@')[0] || 'User';
      await tx.usersProfile.create({
        data: {
          userId: data.ownerId,
          restaurantId: restaurant.id,
          role: data.ownerRole ?? 'dono',
          name: ownerName,
          email: data.ownerEmail,
        },
      });

      await tx.subscription.create({
        data: {
          restaurantId: restaurant.id,
          status: 'trialing',
          planType: 'monthly',
          priceCents: 1999,
          currency: 'BRL',
          trialDays,
          trialStartedAt: now,
          trialEndsAt,
        },
      });

      return restaurant;
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      description: string;
      address: string;
      phone: string;
      logoUrl: string;
      active: boolean;
      settings: string;
    }>
  ) {
    const updated = await this.prisma.restaurant.update({
      where: { id },
      data,
    });
    if (!updated) {
      throw new NotFoundException('Restaurante não encontrado');
    }
    return updated;
  }

  async deactivate(id: string) {
    return this.update(id, { active: false });
  }
}
