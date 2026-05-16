import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findByRestaurant(restaurantId: string) {
    return this.prisma.category.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
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

  async update(id: string, data: Partial<{
    name: string;
    description: string;
    imageUrl: string;
    sortOrder: number;
    active: boolean;
  }>) {
    const updated = await this.prisma.category.update({
      where: { id },
      data,
    });
    if (!updated) {
      throw new NotFoundException('Categoria não encontrada');
    }
    return updated;
  }

  async delete(id: string) {
    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async reorder(categories: Array<{ id: string; sortOrder: number }>) {
    await Promise.all(
      categories.map(cat =>
        this.prisma.category.update({
          where: { id: cat.id },
          data: { sortOrder: cat.sortOrder },
        }),
      ),
    );
  }
}
