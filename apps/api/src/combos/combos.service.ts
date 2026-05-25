import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../common/prisma.service';

@Injectable()
export class CombosService {
  constructor(private prisma: PrismaService) {}

  async findByRestaurant(restaurantId: string) {
    return this.prisma.combo.findMany({
      where: { restaurantId },
      include: { comboItems: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    const combo = await this.prisma.combo.findUnique({
      where: { id },
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

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      price: number;
      available: boolean;
    }>
  ) {
    return this.prisma.combo.update({
      where: { id },
      data: {
        ...data,
        ...(data.price !== undefined && { bundlePrice: data.price }),
      },
      include: { comboItems: true },
    });
  }

  async delete(id: string) {
    await this.prisma.comboItem.deleteMany({ where: { comboId: id } });
    await this.prisma.combo.delete({ where: { id } });
  }
}
