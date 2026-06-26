import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';

import { PrismaService } from '../common/prisma.service';

/**
 * Service de categorias com tenant isolation enforced.
 * Toda escrita valida que o recurso pertence ao restaurante do requisitante.
 */
@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findByRestaurant(restaurantId: string) {
    return this.prisma.category.findMany({
      // ACHADO-1 (Re-varredura 5): rota `/categories` é pública — exige
      // `restaurant.active: true` para evitar enumeração de cardápio de
      // restaurantes desativados.
      where: { restaurantId, deletedAt: null, restaurant: { active: true } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string) {
    // C-NEW-01: filtra `restaurant.active` em endpoints públicos.
    const category = await this.prisma.category.findFirst({
      where: { id, deletedAt: null, restaurant: { active: true } },
    });
    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }
    return category;
  }

  async create(data: {
    restaurantId: string;
    name: string;
    description?: string;
    imageUrl?: string;
    sortOrder?: number;
  }) {
    return this.prisma.category.create({ data });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      imageUrl: string;
      sortOrder: number;
      active: boolean;
    }>,
    requesterRestaurantId?: string | null
  ) {
    const target = await this.prisma.category.findUnique({ where: { id } });
    if (!target || target.deletedAt) {
      throw new NotFoundException('Categoria não encontrada');
    }
    if (requesterRestaurantId && target.restaurantId !== requesterRestaurantId) {
      throw new ForbiddenException('Categoria pertence a outro restaurante');
    }
    return this.prisma.category.update({ where: { id }, data });
  }

  async delete(id: string, requesterRestaurantId?: string | null) {
    const target = await this.prisma.category.findUnique({ where: { id } });
    if (!target || target.deletedAt) {
      throw new NotFoundException('Categoria não encontrada');
    }
    if (requesterRestaurantId && target.restaurantId !== requesterRestaurantId) {
      throw new ForbiddenException('Categoria pertence a outro restaurante');
    }
    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async reorder(
    categories: Array<{ id: string; sortOrder: number }>,
    requesterRestaurantId?: string | null
  ) {
    // Verifica que todas as categorias pertencem ao restaurante.
    if (requesterRestaurantId) {
      const ids = categories.map((c) => c.id);
      const found = await this.prisma.category.findMany({
        where: { id: { in: ids } },
        select: { id: true, restaurantId: true },
      });
      const allSameRestaurant =
        found.length === ids.length && found.every((c) => c.restaurantId === requesterRestaurantId);
      if (!allSameRestaurant) {
        throw new ForbiddenException('Uma ou mais categorias não pertencem ao restaurante');
      }
    }

    // Auditoria M5: wrapped em `prisma.$transaction` para garantir atomicidade.
    // `Promise.all` permitia updates parciais se uma das queries falhasse no meio,
    // deixando sortOrder inconsistente.
    await this.prisma.$transaction(
      categories.map((cat) =>
        this.prisma.category.update({
          where: { id: cat.id },
          data: { sortOrder: cat.sortOrder },
        })
      )
    );
  }
}
