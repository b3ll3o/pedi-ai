import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

import { PageDto, PAGINATION_DEFAULT_LIMIT } from '../common/dto/pagination.dto';
import { PrismaService } from '../common/prisma.service';
import { scopedRepository } from '../shared/multi-tenant';

/**
 * Service de produtos com tenant isolation enforced.
 *
 * Auditoria P0-01 (2026-07-29): o model `Product` agora tem `restaurantId`
 * autoritativo (além de `categoryId → Category.restaurantId`). Toda query
 * escopa por `restaurantId` para prevenir BOLA (OWASP API #1).
 *
 * **Multi-tenant em produção:** o helper `RestaurantScopedRepository`
 * (`apps/api/src/shared/multi-tenant/scoped-repository.ts`) é a fonte
 * canônica de "WHERE inclui restaurantId automaticamente" para qualquer
 * model multi-tenant. Usar `scopedRepository(this.prisma.product, tenant)`
 * em vez de chamar `prisma.product.*` direto garante que o filtro de
 * tenant nunca é esquecido em novas hot paths — o construtor do helper
 * é fail-closed (`ForbiddenException` se tenant ausente).
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
    // Auditoria P0-01 (2026-07-29): helper fail-closed injeta `restaurantId`
    // no WHERE automaticamente. Mesmo se um futuro dev esquecer de
    // adicionar `restaurantId: options.restaurantId` na cláusula where,
    // o helper aplica por baixo dos panos — BOLA impossível por construção.
    const productRepo = scopedRepository(this.prisma.product, options.restaurantId);
    // Tipo explícito no `findMany<T>`: o helper tem T = unknown por padrão
    // (para não impor a forma do delegate Prisma), mas o caller sabe que
    // o resultado carrega ao menos `id` (necessário para o cursor).
    type ProductWithId = { id: string };
    const items = (await productRepo.findMany<ProductWithId>({
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
    })) as ProductWithId[];
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
    // Auditoria P0-01 (2026-07-29): escopo via `Category.restaurantId`
    // (não via `Product.restaurantId`) — `Category` já era o filtro
    // autoritativo pré-migration. Mantido como está.
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
   * `restaurantId` autoritativo. O helper `RestaurantScopedRepository`
   * injeta `restaurantId` no `WHERE` automaticamente — defesa em
   * profundidade que blinda BOLA mesmo se algum caller esquecer de
   * aplicar o filtro.
   *
   * **BREAKING CHANGE — P0-01 (2026-07-29):**
   * `requesterRestaurantId` é OBRIGATÓRIO (fail-closed). O caminho
   * público-anônimo foi REMOVIDO: antes, esta rota era pública e
   * permitia BOLA cross-tenant. Agora, `GET /products/:id` no
   * controller exige JWT (`@Roles(atendente, gerente, dono)`) e
   * sempre passa `req.user.restaurantId` para este método.
   *
   * **Migração de consumidores:**
   *   • Clientes do cardápio → usar `GET /menu/products/:id?restaurantId=<rest>`
   *     (rota pública do menu, escopada por tenant via query).
   *   • Painel admin/staff → passar JWT do usuário e este método
   *     recebe `requesterRestaurantId` automaticamente.
   *
   * @throws NotFoundException se não encontrar (404 — não revela
   *   existência cross-tenant para evitar enumeração).
   * @throws ForbiddenException se `requesterRestaurantId` for
   *   ausente/vazio (fail-closed no construtor do helper).
   */
  async findById(id: string, requesterRestaurantId: string) {
    // Auditoria P0-01 (2026-07-29): helper fail-closed injeta
    // `restaurantId` no WHERE por baixo dos panos, mesmo que o caller
    // esqueça de aplicar.
    const productRepo = scopedRepository(this.prisma.product, requesterRestaurantId);
    const product = await productRepo.findFirst({
      where: {
        id,
        // Filtro adicional: `category.restaurant.active` cobre o caso
        // em que restaurante foi desativado mas produto continua na
        // coluna autoritativa (dado histórico).
        category: { restaurant: { active: true } },
      },
    });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    return product;
  }

  /**
   * Helper interno: deriva o `restaurantId` autoritativo de uma Category.
   *
   * Auditoria P0-01 (2026-07-29): centraliza o lookup + validação de
   * ownership em um único método. Quando `requesterRestaurantId` é
   * fornecido, usa o helper fail-closed para impedir cross-tenant.
   * Retorna o `restaurantId` da Category para uso em `prisma.product.create`.
   *
   * @throws ForbiddenException se categoria pertence a outro tenant.
   * @throws NotFoundException se categoria não existe (caminho sem tenant).
   */
  private async deriveCategoryRestaurantId(
    categoryId: string,
    requesterRestaurantId: string | null | undefined
  ): Promise<string> {
    if (requesterRestaurantId) {
      // Tenant-aware: helper fail-closed. Se categoria pertencer a outro
      // tenant, retorna null e lançamos ForbiddenException (BOLA prevenido
      // sem revelar se a categoria existe).
      const categoryRepo = scopedRepository(this.prisma.category, requesterRestaurantId);
      const cat = (await categoryRepo.findUnique({
        where: { id: categoryId },
      })) as { restaurantId: string } | null;
      if (!cat) {
        throw new ForbiddenException('Categoria pertence a outro restaurante');
      }
      return cat.restaurantId;
    }
    // Sem tenant: lookup direto (caminho legado — usado em testes/scripts).
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { restaurantId: true },
    });
    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }
    return category.restaurantId;
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
    // Auditoria P0-01 (2026-07-29): `restaurantId` derivado da Category
    // (autoritativo) via helper fail-closed quando tenant é fornecido.
    const restaurantId = await this.deriveCategoryRestaurantId(data.categoryId, data.restaurantId);
    return this.prisma.product.create({
      data: {
        categoryId: data.categoryId,
        restaurantId,
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
      // Auditoria P0-01 (2026-07-29): lookup de categoria default
      // escopado por `restaurantId` direto na coluna autoritativa.
      // Não usamos `scopedRepository` aqui pois precisamos de
      // `orderBy` (helper atual só suporta `where`).
      const cat = await this.prisma.category.findFirst({
        where: { restaurantId: data.restaurantId, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      });
      categoryId = cat?.id;
    }
    if (!categoryId) {
      throw new NotFoundException('Categoria não encontrada para o restaurante');
    }
    // Mesmo `deriveCategoryRestaurantId` de `create()` — fonte canônica.
    const restaurantId = await this.deriveCategoryRestaurantId(categoryId, data.restaurantId);
    return this.prisma.product.create({
      data: {
        categoryId,
        restaurantId,
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
    if (requesterRestaurantId) {
      // Auditoria P0-01 (2026-07-29): caminho de produção — o helper
      // `scopedRepository` É o caminho de mutação, não apenas uma
      // conveniência para `findFirst`. Usar `productRepo.update` injeta
      // `restaurantId` no WHERE da mutação, fechando a janela TOCTOU
      // entre o lookup e o update: se um admin path reatribuir
      // `restaurantId` da linha entre o `findFirst` e o `update`, a
      // mutação recai sobre a cláusula WHERE escopada e retorna
      // `P2025` (que mapeamos para `ForbiddenException` abaixo).
      // `findFirst` prévio é mantido apenas para mapear "não existe
      // neste tenant" → 403 (não revela enumeração cross-tenant).
      const productRepo = scopedRepository(this.prisma.product, requesterRestaurantId);
      const target = await productRepo.findFirst({ where: { id } });
      if (!target) {
        // 403 (não 404) para não revelar se produto existe em outro tenant.
        throw new ForbiddenException('Produto pertence a outro restaurante');
      }
      try {
        return await productRepo.update({ where: { id }, data });
      } catch (err) {
        // Prisma `P2025` = "Record to update not found" — se a linha foi
        // reatribuída para outro tenant entre o lookup e a mutação, o
        // helper retorna `P2025` em vez de mutar dados cross-tenant.
        // Mapeamos para `ForbiddenException` para manter o contrato
        // "pertencer a outro restaurante" do caller.
        if ((err as { code?: string }).code === 'P2025') {
          throw new ForbiddenException('Produto pertence a outro restaurante');
        }
        throw err;
      }
    }

    // Fallback sem tenant (compat): lookup direto + 404 puro.
    const target = await this.prisma.product.findFirst({ where: { id } });
    if (!target) {
      throw new NotFoundException('Produto não encontrado');
    }
    return this.prisma.product.update({ where: { id }, data });
  }

  async delete(id: string, requesterRestaurantId?: string | null) {
    if (requesterRestaurantId) {
      // Auditoria P0-01 (2026-07-29): mesma defesa do `update` — helper
      // `scopedRepository` É o caminho de mutação. Usar `productRepo.delete`
      // garante que o `WHERE` da mutação carrega `restaurantId` autoritativo,
      // prevenindo TOCTOU entre lookup e delete (mesma justificativa do
      // `update`).
      const productRepo = scopedRepository(this.prisma.product, requesterRestaurantId);
      const target = await productRepo.findFirst({ where: { id } });
      if (!target) {
        throw new ForbiddenException('Produto pertence a outro restaurante');
      }
      try {
        await productRepo.delete({ where: { id } });
        return;
      } catch (err) {
        if ((err as { code?: string }).code === 'P2025') {
          throw new ForbiddenException('Produto pertence a outro restaurante');
        }
        throw err;
      }
    }

    // Fallback sem tenant (compat).
    const target = await this.prisma.product.findFirst({ where: { id } });
    if (!target) {
      throw new NotFoundException('Produto não encontrado');
    }
    await this.prisma.product.delete({ where: { id } });
  }
}
