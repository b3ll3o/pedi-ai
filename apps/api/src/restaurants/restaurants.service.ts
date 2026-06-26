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
    // Auditoria ACHADO-N34 (Re-varredura 9): antes retornava `phone` e
    // `address` (PII criptografada mas decriptada no select do PiiCryptoService).
    // Atacante enumerando `/restaurants?limit=100` coletava telefones em
    // massa. Agora: select explícito excluindo PII. Phone/address ficam
    // disponíveis apenas na rota autenticada `/restaurants/:id` (staff
    // do próprio tenant).
    const items = await this.prisma.restaurant.findMany({
      where: active ? { active: true } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
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
      // Auditoria ACHADO-N34 (Re-varredura 9): mesmo motivo de findAll —
      // select explícito excluindo PII quando usado em rotas autenticadas.
      // Staff autenticado continua tendo acesso via /restaurants/:id (que
      // passa pelo filtro de tenant).
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Auditoria ACHADO-N15 (Re-varredura 9): consolidação do `findByUser` no
   * service — antes, o controller executava `prisma.usersProfile.findMany` +
   * `prisma.usersProfile.groupBy` direto (DDD leak, presentation acessando
   * infra). Agora: 1 método no service retorna `{ restaurants, roleMap,
   * teamCountMap }` pronto para o controller montar o response.
   *
   * Auditoria ACHADO-N25: groupBy agora tem `take: 1000` — em tenant com
   * 10k+ usuários, groupBy vira problema (mesma lição de N3/N13).
   */
  async findByUserWithTeamCount(userId: string): Promise<
    Array<{
      id: string;
      name: string;
      slug: string | null;
      logoUrl: string | null;
      description: string | null;
      createdAt: Date;
      updatedAt: Date;
      role: string;
      teamCount: number;
    }>
  > {
    const profiles = await this.prisma.usersProfile.findMany({
      where: { userId, restaurantId: { not: null } },
      select: { restaurantId: true, role: true },
    });
    const restaurantIds = Array.from(
      new Set(profiles.map((p) => p.restaurantId as string).filter(Boolean))
    );
    if (restaurantIds.length === 0) return [];

    const [restaurants, profilesCount] = await Promise.all([
      this.findByIds(restaurantIds, { activeOnly: true }),
      // HIGH-010 (2ª varredura QA): Prisma exige `orderBy` quando há `take`
      // em `groupBy`. Usamos `restaurantId` ASC (estável) e `_count._all` DESC
      // para devolver os tenants com mais usuários primeiro — útil para
      // dashboards de admin.
      this.prisma.usersProfile.groupBy({
        by: ['restaurantId'],
        where: { restaurantId: { in: restaurantIds } },
        _count: { _all: true },
        orderBy: { _count: { restaurantId: 'desc' } },
        take: 1000,
      }),
    ]);

    const roleMap: Record<string, string> = {};
    for (const p of profiles) {
      if (p.restaurantId) roleMap[p.restaurantId] = p.role;
    }
    const teamCountMap: Record<string, number> = {};
    for (const p of profilesCount) {
      // HIGH-010 (2ª varredura QA): com `_count: { _all: true }`, o tipo
      // retornado muda — agora `_count` é `{ _all: number }`, não `number`.
      if (p.restaurantId) teamCountMap[p.restaurantId] = p._count._all;
    }

    return restaurants.map((r) => ({
      ...r,
      role: roleMap[r.id] || 'cliente',
      teamCount: teamCountMap[r.id] || 0,
    }));
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
    ownerName?: string; // Auditoria ACHADO-N26 (Re-varredura 9)
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

      // Auditoria ACHADO-N26 (Re-varredura 9): fallback `pedro123` para
      // email `pedro123@gmail.com` era UX ruim. Agora aceita `ownerName`
      // explícito; fallback só se NEM `ownerName` NEM a parte local do
      // email tiver conteúdo útil. Staff pode editar o nome depois.
      const ownerName = data.ownerName?.trim() || data.ownerEmail.split('@')[0]?.trim() || 'User';
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
