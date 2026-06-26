import { Injectable, NotFoundException } from '@nestjs/common';

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
    // Auditoria C8: restaurante precisa estar **active: true** para ter o
    // cardápio exposto publicamente. Sem isso, donos desativam um
    // restaurante temporariamente mas seu cardápio continua público.
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, active: true },
      select: { id: true, name: true },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurante não encontrado ou inativo');
    }

    // Auditoria ACHADO-30 (Re-varredura 6): antes estas 4 queries eram
    // sequenciais (categories → products → modifierGroups → combos),
    // adicionando latência agregada de ~50-100ms em horários de pico.
    // Como `products` depende dos IDs de `categories`, mas modifierGroups
    // e combos são independentes, paralelizamos: 1ª query (categories)
    // sequencial, depois `Promise.all` para os 3 restantes.
    //
    // Auditoria ACHADO-N13 (Re-varredura 8): as queries paralelas não
    // tinham `take`. Restaurante com 500+ produtos/modificadores/combos
    // estouraria payload (mesmo problema do ACHADO-N3). Limites
    // conservadores alinhados com findByRestaurant: 200 itens por
    // categoria agregada, 100 modifier groups, 50 combos.
    const MAX_CATEGORIES = 100;
    const MAX_PRODUCTS = 500;
    const MAX_MODIFIER_GROUPS = 100;
    const MAX_COMBOS = 50;

    const categories = await this.prisma.category.findMany({
      where: { restaurantId, active: true },
      orderBy: { sortOrder: 'asc' },
      take: MAX_CATEGORIES,
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

    const categoryIds = categories.map((c) => c.id);
    const [products, modifierGroups, combos] = await Promise.all([
      // Products dependem dos categoryIds resolvidos acima.
      this.prisma.product.findMany({
        where:
          categoryIds.length > 0 ? { categoryId: { in: categoryIds }, available: true } : undefined,
        orderBy: { sortOrder: 'asc' },
        take: MAX_PRODUCTS,
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
      }),
      // Modifier groups são por restaurantId (independente de categorias).
      this.prisma.modifierGroup.findMany({
        where: { restaurantId },
        take: MAX_MODIFIER_GROUPS,
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
      }),
      // Combos são por restaurantId (independente de categorias).
      this.prisma.combo.findMany({
        where: { restaurantId, available: true },
        take: MAX_COMBOS,
        select: {
          id: true,
          restaurantId: true,
          name: true,
          description: true,
          bundlePrice: true,
          available: true,
        },
      }),
    ]);

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
    // Auditoria C8: produto precisa estar **available: true** E o restaurante
    // **active: true**. Sem isso, produtos desativados vazam no cardápio.
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        available: true,
        category: { restaurantId, restaurant: { active: true } },
      },
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
