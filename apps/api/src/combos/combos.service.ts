import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';

import { PageDto, PAGINATION_DEFAULT_LIMIT } from '../common/dto/pagination.dto';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class CombosService {
  constructor(private prisma: PrismaService) {}

  async findByRestaurant(
    restaurantId: string,
    options: { cursor?: string; limit?: number; includeUnavailable?: boolean } = {}
  ): Promise<PageDto<unknown>> {
    const limit = options.limit ?? PAGINATION_DEFAULT_LIMIT;
    const items = await this.prisma.combo.findMany({
      // Auditoria A-S-06: por padrão, só retorna combos disponíveis
      // (cardápio público). Admin/staff passa `includeUnavailable: true`.
      where: {
        restaurantId,
        ...(options.includeUnavailable ? {} : { available: true }),
      },
      include: { comboItems: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
    const hasNext = items.length > limit;
    const data = hasNext ? items.slice(0, limit) : items;
    const nextCursor = hasNext ? data[data.length - 1].id : null;
    return PageDto.create(data, nextCursor, data.length);
  }

  async findById(id: string) {
    // C-NEW-01: filtra `restaurant.active` em endpoints públicos.
    const combo = await this.prisma.combo.findFirst({
      where: { id, restaurant: { active: true } },
      include: { comboItems: true },
    });
    if (!combo) {
      throw new NotFoundException('Combo não encontrado');
    }
    return combo;
  }

  async create(data: {
    restaurantId: string;
    name: string;
    description?: string | null;
    price: number;
    available?: boolean;
    items: Array<{ productId: string; quantity: number }>;
  }) {
    return this.prisma.combo.create({
      data: {
        restaurantId: data.restaurantId,
        name: data.name,
        description: data.description ?? null,
        bundlePrice: data.price,
        available: data.available ?? true,
        comboItems: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: { comboItems: true },
    });
  }

  /**
   * Atualização com tenant isolation: `requesterRestaurantId` é obrigatório
   * para impedir cross-tenant writes (BOLA). Quando fornecido e divergente,
   * lança `ForbiddenException`.
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      price: number;
      available: boolean;
    }>,
    requesterRestaurantId?: string | null
  ) {
    if (requesterRestaurantId) {
      const existing = await this.prisma.combo.findUnique({
        where: { id },
        select: { restaurantId: true },
      });
      if (!existing) {
        throw new NotFoundException('Combo não encontrado');
      }
      if (existing.restaurantId !== requesterRestaurantId) {
        throw new ForbiddenException('Combo pertence a outro restaurante');
      }
    }

    return this.prisma.combo.update({
      where: { id },
      data: {
        ...data,
        ...(data.price !== undefined && { bundlePrice: data.price }),
      },
      include: { comboItems: true },
    });
  }

  async delete(id: string, requesterRestaurantId?: string | null) {
    if (requesterRestaurantId) {
      const existing = await this.prisma.combo.findUnique({
        where: { id },
        select: { restaurantId: true },
      });
      if (!existing) {
        throw new NotFoundException('Combo não encontrado');
      }
      if (existing.restaurantId !== requesterRestaurantId) {
        throw new ForbiddenException('Combo pertence a outro restaurante');
      }
    }
    // Auditoria M-06: cascade delete em `$transaction` atômico — crash entre
    // as duas queries deixa comboItems órfãos.
    await this.prisma.$transaction([
      this.prisma.comboItem.deleteMany({ where: { comboId: id } }),
      this.prisma.combo.delete({ where: { id } }),
    ]);
  }
}
