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
      include: {
        products: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return categories.flatMap(cat => cat.products);
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
    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.prisma.product.delete({ where: { id } });
  }
}
