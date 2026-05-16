import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findByCategory(categoryId: string) {
    return this.prisma.product.findMany({
      where: { categoryId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findByRestaurant(restaurantId: string) {
    const categories = await this.prisma.category.findMany({
      where: { restaurantId },
    });
    const products = await this.prisma.product.findMany({
      where: {
        categoryId: { in: categories.map(c => c.id) },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return products;
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    return product;
  }

  async create(data: {
    categoryId: string;
    name: string;
    description?: string;
    imageUrl?: string;
    price: number;
    dietaryLabels?: string;
    sortOrder?: number;
  }) {
    return this.prisma.product.create({ data });
  }

  async update(id: string, data: Partial<{
    name: string;
    description: string;
    imageUrl: string;
    price: number;
    dietaryLabels: string;
    available: boolean;
    sortOrder: number;
  }>) {
    const updated = await this.prisma.product.update({
      where: { id },
      data,
    });
    if (!updated) {
      throw new NotFoundException('Produto não encontrado');
    }
    return updated;
  }

  async delete(id: string) {
    await this.prisma.product.delete({ where: { id } });
  }
}
