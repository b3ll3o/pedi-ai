import { ForbiddenException } from '@nestjs/common';

/**
 * Type-safe subset do Prisma delegate que o `RestaurantScopedRepository`
 * consegue escopar automaticamente. Trabalhamos apenas com o mínimo
 * necessário — findUnique/findFirst/findMany/count/update/delete — para
 * evitar acoplamento excessivo ao client Prisma completo.
 *
 * Auditoria P0-01 (2026-07-29): helper criado para garantir que toda
 * operação sobre um model multi-tenant carregue `restaurantId` no `where`.
 * Antes, chamadas como `prisma.product.findFirst({ where: { id } })`
 * vazavam dados cross-tenant (BOLA / OWASP API #1).
 *
 * **Notação (`method(args)` em vez de `method: (args) => ...`).** TypeScript
 * trata o shorthand de método como **bivariante** (aceita tanto delegações
 * com parâmetros mais estreitos quanto mais largos) — propriedade essencial
 * porque o delegate Prisma tem tipos genéricos ricos (`findUnique<T>`) que
 * não seriam atribuíveis a um field-arrow com assinatura `Record<string, unknown>`.
 * A `RestaurantScopedRepository` continua aplicando o contrato em runtime
 * (fail-closed, injeta `restaurantId`); aqui só afrouxamos o tipo para
 * acomodar Prisma 7 sem quebrar os call sites.
 */
interface ScopedDelegate {
  findUnique(args: { where: any }): Promise<any>;
  findFirst(args?: { where?: any }): Promise<any>;
  findMany<T = any>(args?: {
    where?: any;
    orderBy?: any;
    take?: number;
    skip?: number;
    cursor?: any;
    select?: any;
    include?: any;
  }): Promise<T[]>;
  count(args?: { where?: any }): Promise<number>;
  update(args: { where: any; data: any }): Promise<any>;
  delete(args: { where: any }): Promise<any>;
}

/**
 * Helper que envolve um Prisma model delegate (ex.: `prisma.product`)
 * e injeta `restaurantId` em toda operação.
 *
 * **Fail-closed:** se o contexto de tenant não for fornecido (ou for
 * vazio/null), lança `ForbiddenException` em vez de retornar dados —
 * nunca devolve registros cross-tenant.
 *
 * **Defesa em profundidade:** mesmo que o caller passe `restaurantId`
 * no `where`, o helper substitui por uma versão escopada. Útil quando
 * o `requester.restaurantId` vem do JWT e o caller esquece de aplicar.
 *
 * Auditoria P0-01 (2026-07-29).
 *
 * @example
 * ```ts
 * const productRepo = scopedRepository(
 *   prisma.product,
 *   requester.restaurantId,
 * );
 * const product = await productRepo.findFirst({ where: { id: productId } });
 * // Internamente: { where: { id: productId, restaurantId: requester.restaurantId } }
 * ```
 */
export class RestaurantScopedRepository<T> {
  constructor(
    private readonly delegate: T & ScopedDelegate,
    private readonly tenantId: string | null | undefined
  ) {
    if (!tenantId || typeof tenantId !== 'string') {
      // Fail-closed: sem tenant no contexto, é proibido ler/escrever
      // qualquer registro. Retornar lista vazia silenciaria BOLA;
      // lançar 403 explícito força o caller a tratar.
      throw new ForbiddenException('Contexto de restaurante ausente (multi-tenant)');
    }
  }

  /** Retorna um novo `where` com `restaurantId` aplicado. */
  private scopeWhere(where: Record<string, unknown> = {}): Record<string, unknown> {
    return { ...where, restaurantId: this.tenantId };
  }

  /** Bloqueia tentativas de override de `restaurantId` no where do caller. */
  private assertNoTenantOverride(where: Record<string, unknown>): void {
    if (
      Object.prototype.hasOwnProperty.call(where, 'restaurantId') &&
      where.restaurantId !== this.tenantId
    ) {
      // Caller tentando ler dados de outro tenant explicitamente —
      // bloqueia. Se for o mesmo tenant, sobrescrevemos (no-op efetivo).
      throw new ForbiddenException('restaurantId divergente do contexto (multi-tenant)');
    }
  }

  async findUnique(args: { where: Record<string, unknown> }): Promise<unknown> {
    this.assertNoTenantOverride(args.where);
    return this.delegate.findUnique({ where: this.scopeWhere(args.where) });
  }

  async findFirst(args: { where?: Record<string, unknown> } = {}): Promise<unknown> {
    if (args.where) this.assertNoTenantOverride(args.where);
    return this.delegate.findFirst({ where: this.scopeWhere(args.where) });
  }

  async findMany<T = unknown>(
    args: {
      where?: Record<string, unknown>;
      orderBy?: unknown;
      take?: number;
      skip?: number;
      cursor?: Record<string, unknown>;
      select?: unknown;
      include?: unknown;
    } = {}
  ): Promise<T[]> {
    if (args.where) this.assertNoTenantOverride(args.where);
    const { where, ...rest } = args;
    return (await this.delegate.findMany({
      where: this.scopeWhere(where),
      ...rest,
    })) as T[];
  }

  async count(args: { where?: Record<string, unknown> } = {}): Promise<number> {
    if (args.where) this.assertNoTenantOverride(args.where);
    return this.delegate.count({ where: this.scopeWhere(args.where) });
  }

  async update(args: { where: Record<string, unknown>; data: unknown }): Promise<unknown> {
    this.assertNoTenantOverride(args.where);
    return this.delegate.update({ where: this.scopeWhere(args.where), data: args.data });
  }

  async delete(args: { where: Record<string, unknown> }): Promise<unknown> {
    this.assertNoTenantOverride(args.where);
    return this.delegate.delete({ where: this.scopeWhere(args.where) });
  }
}

/**
 * Factory ergonômica — esconde o `new` para call sites enxutos.
 *
 * **Aceita qualquer delegate Prisma sem type cast no call site.** Usando
 * `T extends object` em vez de `T extends ScopedDelegate`, evitamos o
 * problema de variância entre os delegates tipados do Prisma 7
 * (`findUnique<T extends ...>(...)`) e a forma relaxada do helper —
 * o construtor faz a interseção com `ScopedDelegate` via `T & ScopedDelegate`
 * para preservar checagem estrutural sem obrigar o caller a conhecer
 * os tipos ricos do Prisma.
 *
 * @example
 * ```ts
 * const scoped = scopedRepository(prisma.product, requester.restaurantId);
 * ```
 */
export function scopedRepository<T extends object>(
  delegate: T,
  tenantId: string | null | undefined
): RestaurantScopedRepository<T> {
  return new RestaurantScopedRepository(
    delegate as unknown as T & ScopedDelegate,
    tenantId
  );
}
