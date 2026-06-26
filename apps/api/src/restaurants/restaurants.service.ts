import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';

import { PageDto, PAGINATION_DEFAULT_LIMIT } from '../common/dto/pagination.dto';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class RestaurantsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    active = true,
    options: { cursor?: string; limit?: number } = {}
  ): Promise<PageDto<unknown>> {
    const limit = options.limit ?? PAGINATION_DEFAULT_LIMIT;
    const items = await this.prisma.restaurant.findMany({
      where: active ? { active: true } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
    const hasNext = items.length > limit;
    const data = hasNext ? items.slice(0, limit) : items;
    const nextCursor = hasNext ? data[data.length - 1].id : null;
    return PageDto.create(data, nextCursor, data.length);
  }

  async findById(id: string) {
    // C-NEW-01: restaurante desativado não deve aparecer em rotas públicas.
    // Admin/staff continuam acessando via rota autenticada.
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id, active: true },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurante não encontrado');
    }
    return restaurant;
  }

  async findByIds(ids: string[], options: { activeOnly?: boolean } = {}) {
    // Auditoria ACHADO-35 (Re-varredura 7): rota `/restaurants/user/me` agora
    // exige `activeOnly: true` para filtrar restaurantes desativados pelo admin.
    // Default é `false` para preservar comportamento de chamadas internas que
    // precisam ver restaurantes desativados (ex: admin dashboards).
    return this.prisma.restaurant.findMany({
      where: {
        id: { in: ids },
        ...(options.activeOnly ? { active: true } : {}),
      },
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
    // C-NEW-01: filtra `active: true` para rotas públicas.
    return this.prisma.restaurant.findFirst({ where: { slug, active: true } });
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
    // Auditoria ACHADO-40 (Re-varredura 7): `prisma.restaurant.update` lança
    // `PrismaClientKnownRequestError` (P2025) se o registro não existe —
    // nunca retorna `null`/`undefined`. O `if (!updated)` era código morto
    // e P2025 virava 500 em vez de 404. Aqui interceptamos P2025 e
    // retornamos 404 com a mesma mensagem de `findById` (UX consistente).
    try {
      return await this.prisma.restaurant.update({
        where: { id },
        data,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Restaurante não encontrado');
      }
      throw err;
    }
  }

  async deactivate(id: string) {
    return this.update(id, { active: false });
  }
}
