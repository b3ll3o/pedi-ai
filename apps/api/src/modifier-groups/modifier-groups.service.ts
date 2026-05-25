import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ModifierGroupsService {
  constructor(private prisma: PrismaService) {}

  async findByRestaurant(restaurantId: string) {
    return this.prisma.modifierGroup.findMany({
      where: { restaurantId },
      include: {
        modifierValues: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    const group = await this.prisma.modifierGroup.findUnique({
      where: { id },
      include: { modifierValues: true },
    });
    if (!group) {
      throw new NotFoundException('Grupo de modificadores não encontrado');
    }
    return group;
  }

  async findValueById(id: string) {
    const value = await this.prisma.modifierValue.findUnique({ where: { id } });
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

  async addValue(groupId: string, data: { name: string; priceAdjustment?: number }) {
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
    }>
  ) {
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
    }>
  ) {
    return this.prisma.modifierValue.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.prisma.modifierValue.deleteMany({ where: { modifierGroupId: id } });
    await this.prisma.modifierGroup.delete({ where: { id } });
  }

  async deleteValue(id: string) {
    await this.prisma.modifierValue.delete({ where: { id } });
  }
}
