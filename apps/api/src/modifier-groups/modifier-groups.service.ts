import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';

import { PageDto, PAGINATION_DEFAULT_LIMIT } from '../common/dto/pagination.dto';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ModifierGroupsService {
  constructor(private prisma: PrismaService) {}

  async findByRestaurant(
    restaurantId: string,
    options: { cursor?: string; limit?: number; includeUnavailable?: boolean } = {}
  ): Promise<PageDto<unknown>> {
    const limit = options.limit ?? PAGINATION_DEFAULT_LIMIT;
    const items = await this.prisma.modifierGroup.findMany({
      // Auditoria A-S-06: por padrão, filtra modifier values não disponíveis.
      // Modifier groups em si não têm flag `available`; só os valores internos.
      where: { restaurantId },
      include: {
        modifierValues: {
          where: options.includeUnavailable ? undefined : { available: true },
        },
      },
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
    const group = await this.prisma.modifierGroup.findFirst({
      where: { id, restaurant: { active: true } },
      include: { modifierValues: true },
    });
    if (!group) {
      throw new NotFoundException('Grupo de modificadores não encontrado');
    }
    return group;
  }

  async findValueById(id: string) {
    // C-NEW-01: filtra `restaurant.active` via join.
    const value = await this.prisma.modifierValue.findFirst({
      where: { id, modifierGroup: { restaurant: { active: true } } },
    });
    if (!value) {
      throw new NotFoundException('Valor do modificador não encontrado');
    }
    return value;
  }

  async create(data: {
    restaurantId: string;
    name: string;
    required?: boolean;
    minSelections?: number;
    maxSelections?: number;
  }) {
    return this.prisma.modifierGroup.create({
      data: {
        restaurantId: data.restaurantId,
        name: data.name,
        required: data.required ?? false,
        minSelections: data.minSelections ?? 0,
        maxSelections: data.maxSelections ?? 1,
      },
    });
  }

  async addValue(
    groupId: string,
    data: { name: string; priceAdjustment?: number },
    requesterRestaurantId?: string | null
  ) {
    if (requesterRestaurantId) {
      const group = await this.prisma.modifierGroup.findUnique({
        where: { id: groupId },
        select: { restaurantId: true },
      });
      if (!group) {
        throw new NotFoundException('Grupo de modificadores não encontrado');
      }
      if (group.restaurantId !== requesterRestaurantId) {
        throw new ForbiddenException('Grupo pertence a outro restaurante');
      }
    }
    return this.prisma.modifierValue.create({
      data: {
        modifierGroupId: groupId,
        name: data.name,
        priceAdjustment: data.priceAdjustment ?? 0,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      required: boolean;
      minSelections: number;
      maxSelections: number;
    }>,
    requesterRestaurantId?: string | null
  ) {
    if (requesterRestaurantId) {
      const existing = await this.prisma.modifierGroup.findUnique({
        where: { id },
        select: { restaurantId: true },
      });
      if (!existing) {
        throw new NotFoundException('Grupo de modificadores não encontrado');
      }
      if (existing.restaurantId !== requesterRestaurantId) {
        throw new ForbiddenException('Grupo pertence a outro restaurante');
      }
    }
    return this.prisma.modifierGroup.update({
      where: { id },
      data,
    });
  }

  async updateValue(
    id: string,
    data: Partial<{
      name: string;
      priceAdjustment: number;
      available: boolean;
    }>,
    requesterRestaurantId?: string | null
  ) {
    if (requesterRestaurantId) {
      const value = await this.prisma.modifierValue.findUnique({
        where: { id },
        include: { modifierGroup: { select: { restaurantId: true } } },
      });
      if (!value) {
        throw new NotFoundException('Valor do modificador não encontrado');
      }
      if (value.modifierGroup.restaurantId !== requesterRestaurantId) {
        throw new ForbiddenException('Valor pertence a outro restaurante');
      }
    }
    return this.prisma.modifierValue.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, requesterRestaurantId?: string | null) {
    if (requesterRestaurantId) {
      const existing = await this.prisma.modifierGroup.findUnique({
        where: { id },
        select: { restaurantId: true },
      });
      if (!existing) {
        throw new NotFoundException('Grupo de modificadores não encontrado');
      }
      if (existing.restaurantId !== requesterRestaurantId) {
        throw new ForbiddenException('Grupo pertence a outro restaurante');
      }
    }
    // Auditoria M-06: cascade delete em `$transaction` atômico.
    await this.prisma.$transaction([
      this.prisma.modifierValue.deleteMany({ where: { modifierGroupId: id } }),
      this.prisma.modifierGroup.delete({ where: { id } }),
    ]);
  }

  async deleteValue(id: string, requesterRestaurantId?: string | null) {
    if (requesterRestaurantId) {
      const value = await this.prisma.modifierValue.findUnique({
        where: { id },
        include: { modifierGroup: { select: { restaurantId: true } } },
      });
      if (!value) {
        throw new NotFoundException('Valor do modificador não encontrado');
      }
      if (value.modifierGroup.restaurantId !== requesterRestaurantId) {
        throw new ForbiddenException('Valor pertence a outro restaurante');
      }
    }
    await this.prisma.modifierValue.delete({ where: { id } });
  }
}
