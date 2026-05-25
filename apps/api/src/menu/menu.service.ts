import { Injectable } from '@nestjs/common';

import { PrismaService } from '../common/prisma.service';

export interface MenuItemModifierGroup {
  id: string;
  restaurantId: string;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  modifierValues: Array<{
    id: string;
    name: string;
    priceAdjustment: number;
    available: boolean;
  }>;
}

export interface MenuItemProduct {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  available: boolean;
  sortOrder: number;
  dietaryLabels: string | null;
}

export interface MenuItemCombo {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  price: number;
  available: boolean;
}

export interface MenuResponse {
  categories: Array<{
    id: string;
    restaurantId: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    sortOrder: number;
    active: boolean;
  }>;
  products: MenuItemProduct[];
  modifierGroups: MenuItemModifierGroup[];
  combos: MenuItemCombo[];
}

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async getMenuByRestaurant(restaurantId: string): Promise<MenuResponse> {
    // Fetch categories
    const categories = await this.prisma.category.findMany({
      where: { restaurantId, active: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        restaurantId: true,
        name: true,
        description: true,
        imageUrl: true,
        sortOrder: true,
        active: true,
      },
    });

    // Fetch products (available only)
    const categoryIds = categories.map((c) => c.id);
    const products = await this.prisma.product.findMany({
      where:
        categoryIds.length > 0 ? { categoryId: { in: categoryIds }, available: true } : undefined,
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        categoryId: true,
        name: true,
        description: true,
        imageUrl: true,
        price: true,
        available: true,
        sortOrder: true,
        dietaryLabels: true,
      },
    });

    // Fetch modifier groups
    const modifierGroups = await this.prisma.modifierGroup.findMany({
      where: { restaurantId },
      select: {
        id: true,
        restaurantId: true,
        name: true,
        required: true,
        minSelections: true,
        maxSelections: true,
        modifierValues: {
          where: { available: true },
          select: {
            id: true,
            name: true,
            priceAdjustment: true,
            available: true,
          },
        },
      },
    });

    // Fetch combos (available only)
    const combos = await this.prisma.combo.findMany({
      where: { restaurantId, available: true },
      select: {
        id: true,
        restaurantId: true,
        name: true,
        description: true,
        bundlePrice: true,
        available: true,
      },
    });

    return {
      categories,
      products,
      modifierGroups,
      combos: combos.map((c) => ({
        id: c.id,
        restaurantId: c.restaurantId,
        name: c.name,
        description: c.description,
        price: c.bundlePrice,
        available: c.available,
      })),
    };
  }

  async getProductById(productId: string, restaurantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, category: { restaurantId } },
      include: {
        category: { select: { id: true, name: true } },
        productModifierGroups: {
          include: {
            modifierGroup: {
              include: {
                modifierValues: { where: { available: true } },
              },
            },
          },
        },
      },
    });

    if (!product) {
      return null;
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      image_url: product.imageUrl,
      price: product.price,
      dietary_labels: product.dietaryLabels,
      available: product.available,
      category: { id: product.category.id, name: product.category.name },
      modifier_groups: product.productModifierGroups.map((pmg) => ({
        id: pmg.modifierGroup.id,
        name: pmg.modifierGroup.name,
        required: pmg.modifierGroup.required,
        min_selections: pmg.modifierGroup.minSelections,
        max_selections: pmg.modifierGroup.maxSelections,
        values: pmg.modifierGroup.modifierValues.map((mv) => ({
          id: mv.id,
          name: mv.name,
          price_adjustment: mv.priceAdjustment,
        })),
      })),
    };
  }
}
