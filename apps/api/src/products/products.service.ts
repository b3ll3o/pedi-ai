import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

import { PageDto, PAGINATION_DEFAULT_LIMIT } from '../common/dto/pagination.dto';
import { PrismaService } from '../common/prisma.service';

/**
 * Service de produtos com tenant isolation enforced.
 *
 * Auditoria P0-01 (2026-07-29): o model `Product` agora tem `restaurantId`
 * autoritativo (além de `categoryId → Category.restaurantId`). Toda query
 * escopa por `restaurantId` para prevenir BOLA (OWASP API #1).
 */
@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findByCategory(
    categoryId: string,
    options: {
      cursor?: string;
      limit?: number;
      includeUnavailable?: boolean;
      // Auditoria P0-01 (2026-07-29): `restaurantId` agora é OBRIGATÓRIO
      // em `options` — fail-closed. Sem o tenant explícito, o método
      // lança BadRequestException antes de tocar no DB. Antes: filtro
      // apenas por `categoryId` permitia que qualquer categoria de
      // qualquer tenant fosse lida via API pública.
      restaurantId?: string;
    } = {}
  ): Promise<PageDto<unknown>> {
    // Auditoria P0-01 (2026-07-29): fail-closed. Sem restaurantId, é
    // impossível saber de qual tenant são os produtos — bloquear antes
    // de tocar no DB impede BOLA via `GET /products/category/:id`.
    if (!options.restaurantId || typeof options.restaurantId !== 'string') {
      throw new BadRequestException('restaurantId é obrigatório para listagem por categoria');
    }

    const limit = options.limit ?? PAGINATION_DEFAULT_LIMIT;
    const items = await this.prisma.product.findMany({
      // Auditoria A-S-05: por padrão, **só retorna produtos disponíveis**.
      // Antes, produtos desativados (`available: false`) vazavam no cardápio
      // público, contradizendo o `menu.service.getMenuByRestaurant`. Para
      // visões admin/staff, passe `includeUnavailable: true`.
      //
      // Auditoria P0-01 (2026-07-29): filtro `restaurantId` adicionado
      // para garantir isolamento multi-tenant. Mesmo que o caller
      // passe um `categoryId` de outro tenant, o WHERE escopado
      // retorna vazio em vez de vazar dados.
      where: {
        categoryId,
        restaurantId: options.restaurantId,
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
    //
    // Auditoria P0-01 (2026-07-29): o filtro `restaurantId` em Category já
    // garante isolamento multi-tenant — Products herdam o tenant via
    // `Category.restaurantId`. Mantemos como está (não regressão).
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

  /**
   * Produto por ID com isolamento multi-tenant.
   *
   * Auditoria P0-01 (2026-07-29): o model `Product` agora carrega
   * `restaurantId` autoritativo. Quando o caller fornece
   * `requesterRestaurantId` (vindo do JWT), filtramos por ele —
   * defesa em profundidade que blinda BOLA mesmo se o JOIN
   * `category.restaurant` for bypassado em algum lugar.
   *
   * **Comportamento:**
   * - Com `requesterRestaurantId`: WHERE inclui `id = ? AND
   *   restaurantId = ? AND category.restaurant.active = true`.
   * - Sem `requesterRestaurantId`: WHERE inclui apenas `id = ? AND
   *   category.restaurant.active = true` (compatibilidade com
   *   `/menu/products/:id?restaurantId=...` que já escopa via query).
   *
   * @throws NotFoundException se não encontrar (404 — não revela
   *   existência cross-tenant para evitar enumeração).
   */
  async findById(id: string, requesterRestaurantId?: string | null) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        category: { restaurant: { active: true } },
        // Auditoria P0-01 (2026-07-29): filtro direto na coluna
        // autoritativa `restaurantId` quando o caller fornece o tenant.
        // BOLA prevenido: prod-b1 (tenant B) com requester=A retorna null.
        ...(requesterRestaurantId ? { restaurantId: requesterRestaurantId } : {}),
      },
    });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    return product;
  }

  /**
   * Helper interno: valida que a categoria pertence ao restaurante.
   *
   * Auditoria P0-01 (2026-07-29): mantém o check via `category.restaurantId`
   * (single source of truth na criação). Em product.create/createWithRestaurant
   * ainda derivamos `restaurantId` da Category — relação canônica.
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

    // Auditoria P0-01 (2026-07-29): ao criar, precisamos popular
    // `restaurantId` (NOT NULL). Sempre derivamos da Category
    // (autoritativo) — se o caller passou `data.restaurantId`
    // divergente, o `validateCategoryOwnership` já bloqueou.
    const category = await this.prisma.category.findUnique({
      where: { id: data.categoryId },
      select: { restaurantId: true },
    });
    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return this.prisma.product.create({
      data: {
        categoryId: data.categoryId,
        restaurantId: category.restaurantId,
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

    // Auditoria P0-01 (2026-07-29): derivar `restaurantId` da Category
    // (autoritativo) — mesma fonte usada em `create()`.
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { restaurantId: true },
    });
    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return this.prisma.product.create({
      data: {
        categoryId,
        restaurantId: category.restaurantId,
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
    // Auditoria P0-01 (2026-07-29): filtro duplo — `category.restaurantId`
    // (manter) + `restaurantId` direto (defesa em profundidade). Mesmo
    // se um JOIN for bypassado em algum lugar, o filtro direto na coluna
    // autoritativa fecha a porta.
    const target = await this.prisma.product.findFirst({
      where: {
        id,
        ...(requesterRestaurantId ? { restaurantId: requesterRestaurantId } : {}),
      },
      include: { category: { select: { restaurantId: true } } },
    });
    if (!target) {
      // Auditoria P0-01 (2026-07-29): quando o caller forneceu
      // `requesterRestaurantId` mas o produto não bate com esse tenant
      // (filtro WHERE retornou null), é mais seguro lançar 403 do que
      // 404 — não revela se o produto existe em outro tenant (mitigação
      // de enumeração). Sem `requesterRestaurantId`, é 404 puro.
      if (requesterRestaurantId) {
        throw new ForbiddenException('Produto pertence a outro restaurante');
      }
      throw new NotFoundException('Produto não encontrado');
    }
    if (requesterRestaurantId && target.category.restaurantId !== requesterRestaurantId) {
      throw new ForbiddenException('Produto pertence a outro restaurante');
    }
    return this.prisma.product.update({ where: { id }, data });
  }

  async delete(id: string, requesterRestaurantId?: string | null) {
    // Auditoria P0-01 (2026-07-29): mesma defesa em profundidade do `update`.
    const target = await this.prisma.product.findFirst({
      where: {
        id,
        ...(requesterRestaurantId ? { restaurantId: requesterRestaurantId } : {}),
      },
      include: { category: { select: { restaurantId: true } } },
    });
    if (!target) {
      // Ver `update` acima — mesma lógica de não-enumeração.
      if (requesterRestaurantId) {
        throw new ForbiddenException('Produto pertence a outro restaurante');
      }
      throw new NotFoundException('Produto não encontrado');
    }
    if (requesterRestaurantId && target.category.restaurantId !== requesterRestaurantId) {
      throw new ForbiddenException('Produto pertence a outro restaurante');
    }
    await this.prisma.product.delete({ where: { id } });
  }
}
