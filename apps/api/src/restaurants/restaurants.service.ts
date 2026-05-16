import { Injectable, NotFoundException } from '@nestjs/common';
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

  async update(id: string, data: Partial<{
    name: string;
    slug: string;
    description: string;
    address: string;
    phone: string;
    logoUrl: string;
    active: boolean;
    settings: string;
  }>) {
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
