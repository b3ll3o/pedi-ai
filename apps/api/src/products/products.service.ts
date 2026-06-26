import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';

import { PageDto, PAGINATION_DEFAULT_LIMIT } from '../common/dto/pagination.dto';
import { PrismaService } from '../common/prisma.service';

/**
 * Service de produtos com tenant isolation enforced.
 */
@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findByCategory(
    categoryId: string,
    options: { cursor?: string; limit?: number; includeUnavailable?: boolean } = {}
  ): Promise<PageDto<unknown>> {
    const limit = options.limit ?? PAGINATION_DEFAULT_LIMIT;
    const items = await this.prisma.product.findMany({
      // Auditoria A-S-05: por padrão, **só retorna produtos disponíveis**.
      // Antes, produtos desativados (`available: false`) vazavam no cardápio
      // público, contradizendo o `menu.service.getMenuByRestaurant`. Para
      // visões admin/staff, passe `includeUnavailable: true`.
      where: {
        categoryId,
        ...(options.includeUnavailable ? {} : { available: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
    const hasNext = items.length > limit;
    const data = hasNext ? items.slice(0, limit) : items;
    const nextCursor = hasNext ? data[data.length - 1].id : null;
    return PageDto.create(data, nextCursor, data.length);
  }

  async findByRestaurant(restaurantId: string) {
    // Auditoria M4: retorna estrutura hierárquica `{ categories: [{ id, name, products: [...] }] }`.
    // Antes: `flatMap` descartava o agrupamento por categoria, forçando o frontend
    // a re-agrupar client-side (com perda de ordenação).
    // Auditoria A-S-05: filtra produtos `available: true` no cardápio público.
    //
    // Auditoria ACHADO-1 (Re-varredura 5): rota pública `/products/restaurant/:restaurantId`
    // exige `restaurant.active: true` para evitar enumeração de cardápio
    // de restaurantes desativados.
    //
    // Auditoria ACHADO-N3 (Re-varredura 8): sem `take`, a query carregava
    // TODAS as categorias e produtos do restaurante de uma vez. Em produção
    // com restaurante de 500+ produtos e 50+ categorias, payload > 5MB e
    // latência P99 > 800ms. Agora: limite conservador de 100 categorias
    // e 200 produtos por categoria (somatório > 20k itens). Restaurantes
    // maiores devem usar a rota paginada `/products/category/:id`.
    const MAX_CATEGORIES = 100;
    const MAX_PRODUCTS_PER_CATEGORY = 200;
    const categories = await this.prisma.category.findMany({
      where: {
        restaurantId,
        deletedAt: null,
        active: true,
        restaurant: { active: true },
      },
      include: {
        products: {
          where: { available: true },
          orderBy: { sortOrder: 'asc' },
          take: MAX_PRODUCTS_PER_CATEGORY,
        },
      },
      orderBy: { sortOrder: 'asc' },
      take: MAX_CATEGORIES,
    });
    return {
      restaurantId,
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        sortOrder: cat.sortOrder,
        products: cat.products,
      })),
    };
  }

  async findById(id: string) {
    // Auditoria C-NEW-01: filtra `restaurant.active` em endpoints públicos.
    // Antes: dono desativa restaurante mas produto continuava acessível
    // via GET /products/:id — vazamento de cardápio de tenant "fechado".
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        category: { restaurant: { active: true } },
      },
    });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    return product;
  }

  /**
   * Helper interno: valida que a categoria pertence ao restaurante.
   */
  private async validateCategoryOwnership(
    categoryId: string,
    requesterRestaurantId: string | null | undefined
  ): Promise<void> {
    if (!requesterRestaurantId) return;
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { restaurantId: true },
    });
    if (!category || category.restaurantId !== requesterRestaurantId) {
      throw new ForbiddenException('Categoria pertence a outro restaurante');
    }
  }

  async create(data: {
    categoryId: string;
    restaurantId?: string | null;
    name: string;
    description?: string;
    imageUrl?: string;
    price: number;
    dietaryLabels?: string;
    sortOrder?: number;
  }) {
    await this.validateCategoryOwnership(data.categoryId, data.restaurantId);
    return this.prisma.product.create({
      data: {
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        price: data.price,
        dietaryLabels: data.dietaryLabels,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async createWithRestaurant(data: {
    categoryId?: string;
    restaurantId?: string | null;
    name: string;
    description?: string;
    imageUrl?: string;
    price: number;
    dietaryLabels?: string;
    sortOrder?: number;
  }) {
    let categoryId = data.categoryId;
    if (!categoryId && data.restaurantId) {
      const cat = await this.prisma.category.findFirst({
        where: { restaurantId: data.restaurantId, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      });
      categoryId = cat?.id;
    }
    if (!categoryId) {
      throw new NotFoundException('Categoria não encontrada para o restaurante');
    }
    await this.validateCategoryOwnership(categoryId, data.restaurantId);
    return this.prisma.product.create({
      data: {
        categoryId,
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        price: data.price,
        dietaryLabels: data.dietaryLabels,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      price: number;
      imageUrl: string;
      dietaryLabels: string;
      available: boolean;
      sortOrder: number;
    }>,
    requesterRestaurantId?: string | null
  ) {
    const target = await this.prisma.product.findUnique({
      where: { id },
      include: { category: { select: { restaurantId: true } } },
    });
    if (!target) {
      throw new NotFoundException('Produto não encontrado');
    }
    if (requesterRestaurantId && target.category.restaurantId !== requesterRestaurantId) {
      throw new ForbiddenException('Produto pertence a outro restaurante');
    }
    return this.prisma.product.update({ where: { id }, data });
  }

  async delete(id: string, requesterRestaurantId?: string | null) {
    const target = await this.prisma.product.findUnique({
      where: { id },
      include: { category: { select: { restaurantId: true } } },
    });
    if (!target) {
      throw new NotFoundException('Produto não encontrado');
    }
    if (requesterRestaurantId && target.category.restaurantId !== requesterRestaurantId) {
      throw new ForbiddenException('Produto pertence a outro restaurante');
    }
    await this.prisma.product.delete({ where: { id } });
  }
}
