/**
 * Suporte BDD — repositório de feature flags em memória.
 *
 * Implementa IFeatureFlagRepository com persistência em Maps. Não usa
 * Prisma. Suporta modos de falha controlada para testes de fallback
 * (RNF-AVAIL-FF-01, RNF-RELI-FF-01).
 *
 * Modos de falha (controlados por `config`):
 *  - `dbDown`: findByKey/listar/adicionarOverride/etc lançam erro
 *  - `auditLogDown`: persistência do audit falha (simula constraint violada)
 */
import type {
  IFeatureFlagRepository,
  FeatureFlagCompleto,
  FeatureFlagResumo,
  FeatureFlagOverrideData,
  FeatureFlagAuditEntry,
  AdicionarOverrideInput,
  AtualizarFlagInput,
  CriarFlagInput,
  ListarOverridesInput,
  ListarAuditoriaInput,
} from '../../src/domain/admin/feature-flags/repositories/IFeatureFlagRepository';

let counter = 0;
function uid(prefix = 'id'): string {
  counter += 1;
  return `${prefix}_${counter.toString(36)}_${Date.now().toString(36)}`;
}

export interface MemRepoOptions {
  /** quando true, findByKey/listar/etc lançam erro (simula DB fora) */
  dbDown?: boolean;
  /** quando true, audit log falha (simula constraint violada) */
  auditLogDown?: boolean;
}

export class MemFeatureFlagRepository implements IFeatureFlagRepository {
  private flags = new Map<string, FeatureFlagCompleto>(); // by key
  private flagsById = new Map<string, string>(); // id → key
  private audit: FeatureFlagAuditEntry[] = [];

  constructor(private readonly opts: MemRepoOptions = {}) {}

  // ── helpers internos ──────────────────────────────────────
  private snapshotCompleto(key: string): FeatureFlagCompleto | null {
    return this.flags.get(key) ?? null;
  }

  private assertDbUp(op: string): void {
    if (this.opts.dbDown) {
      throw new Error(`DB indisponível (op=${op})`);
    }
  }

  private assertAuditUp(): void {
    if (this.opts.auditLogDown) {
      throw new Error('audit_log_constraint_violated');
    }
  }

  // ── IFeatureFlagRepository ────────────────────────────────
  async listar(options: { limit: number; offset: number }): Promise<{
    data: FeatureFlagResumo[];
    total: number;
  }> {
    this.assertDbUp('listar');
    const all = Array.from(this.flags.values());
    const data = all.slice(options.offset, options.offset + options.limit).map((f) => ({
      id: f.id,
      key: f.key,
      description: f.description,
      valueType: f.valueType,
      defaultValue: f.defaultValue,
      enabled: f.enabled,
      updatedAt: f.updatedAt,
      overrideCount: f.overrides.length,
    }));
    return { data, total: all.length };
  }

  async findByKey(key: string): Promise<FeatureFlagCompleto | null> {
    this.assertDbUp('findByKey');
    return this.snapshotCompleto(key);
  }

  async criar(input: CriarFlagInput): Promise<FeatureFlagCompleto> {
    this.assertDbUp('criar');
    if (this.flags.has(input.key)) {
      const err = new Error('flag já existe');
      (err as Error & { code?: string }).code = 'P2002';
      throw err;
    }
    const id = uid('flag');
    const now = new Date();
    const flag: FeatureFlagCompleto = {
      id,
      key: input.key,
      description: input.description ?? null,
      valueType: input.valueType,
      defaultValue: input.defaultValue,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
      updatedBy: input.updatedBy ?? input.actorId,
      overrides: [],
    };
    this.flags.set(input.key, flag);
    this.flagsById.set(id, input.key);

    this.assertAuditUp();
    this.audit.push({
      id: uid('audit'),
      flagId: id,
      actorId: input.actorId,
      action: 'CREATE',
      before: null,
      after: {
        key: flag.key,
        valueType: flag.valueType,
        defaultValue: flag.defaultValue,
        enabled: flag.enabled,
      },
      reason: null,
      createdAt: now,
    });

    return flag;
  }

  async atualizar(input: AtualizarFlagInput): Promise<FeatureFlagCompleto> {
    this.assertDbUp('atualizar');
    const cur = this.flags.get(input.key);
    if (!cur) {
      throw new Error('flag não encontrada');
    }
    const before = {
      enabled: cur.enabled,
      defaultValue: cur.defaultValue,
      description: cur.description,
    };
    const next: FeatureFlagCompleto = {
      ...cur,
      description:
        input.patch.description !== undefined ? input.patch.description : cur.description,
      defaultValue:
        input.patch.defaultValue !== undefined ? input.patch.defaultValue : cur.defaultValue,
      enabled: input.patch.enabled !== undefined ? input.patch.enabled : cur.enabled,
      updatedAt: new Date(),
      updatedBy: input.actorId,
    };
    this.flags.set(input.key, next);

    this.assertAuditUp();
    this.audit.push({
      id: uid('audit'),
      flagId: next.id,
      actorId: input.actorId,
      action: 'UPDATE',
      before,
      after: {
        enabled: next.enabled,
        defaultValue: next.defaultValue,
        description: next.description,
      },
      reason: null,
      createdAt: next.updatedAt,
    });

    return next;
  }

  async adicionarOverride(input: AdicionarOverrideInput): Promise<FeatureFlagOverrideData> {
    this.assertDbUp('adicionarOverride');
    const flag = this.flags.get(input.flagKey);
    if (!flag) {
      throw new Error('flag não encontrada');
    }
    const flagKey = input.flagKey;
    // verifica duplicata scope+scopeId
    const dup = flag.overrides.find((o) => o.scope === input.scope && o.scopeId === input.scopeId);
    if (dup) {
      const err = new Error('override duplicado');
      (err as Error & { code?: string }).code = 'P2002';
      throw err;
    }
    const ov: FeatureFlagOverrideData = {
      id: uid('ov'),
      flagId: flag.id,
      scope: input.scope,
      scopeId: input.scopeId,
      rolloutPct: input.rolloutPct ?? null,
      value: input.value,
      expiresAt: input.expiresAt ?? null,
      createdAt: new Date(),
      createdBy: input.createdBy,
    };
    const next = { ...flag, overrides: [...flag.overrides, ov] };
    this.flags.set(flagKey, next);

    this.assertAuditUp();
    this.audit.push({
      id: uid('audit'),
      flagId: flag.id,
      actorId: input.actorId,
      action: 'OVERRIDE_ADD',
      before: null,
      after: ov,
      reason: null,
      createdAt: ov.createdAt,
    });

    return ov;
  }

  async removerOverride(overrideId: string): Promise<FeatureFlagOverrideData | null> {
    this.assertDbUp('removerOverride');
    for (const flag of this.flags.values()) {
      const idx = flag.overrides.findIndex((o) => o.id === overrideId);
      if (idx >= 0) {
        const removed = flag.overrides[idx];
        const next = { ...flag, overrides: flag.overrides.filter((_, i) => i !== idx) };
        this.flags.set(flag.key, next);
        this.audit.push({
          id: uid('audit'),
          flagId: flag.id,
          actorId: 'system',
          action: 'OVERRIDE_REMOVE',
          before: removed,
          after: null,
          reason: null,
          createdAt: new Date(),
        });
        return removed;
      }
    }
    return null;
  }

  async listarOverrides(input: ListarOverridesInput): Promise<FeatureFlagOverrideData[]> {
    this.assertDbUp('listarOverrides');
    const flag = this.flags.get(input.flagKey);
    if (!flag) {
      throw new Error('flag não encontrada');
    }
    const now = input.now ?? new Date();
    let items = flag.overrides.filter((o) => {
      if (!o.expiresAt) return true;
      const exp = typeof o.expiresAt === 'string' ? new Date(o.expiresAt) : o.expiresAt;
      return exp > now;
    });
    items = items.sort((a, b) => {
      const ord = a.scope.localeCompare(b.scope);
      return ord !== 0 ? ord : (a.scopeId ?? '').localeCompare(b.scopeId ?? '');
    });
    return items.slice(input.offset, input.offset + input.limit);
  }

  async listarAuditoria(input: ListarAuditoriaInput): Promise<FeatureFlagAuditEntry[]> {
    this.assertDbUp('listarAuditoria');
    const flag = this.flags.get(input.flagKey);
    if (!flag) {
      throw new Error('flag não encontrada');
    }
    let items = this.audit.filter((a) => a.flagId === flag.id);
    const orderBy = input.orderBy ?? { createdAt: 'desc' };
    const field = Object.keys(orderBy)[0] as keyof FeatureFlagAuditEntry;
    const dir = orderBy[field as keyof typeof orderBy];
    items = items.sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av instanceof Date && bv instanceof Date) {
        return dir === 'asc' ? av.getTime() - bv.getTime() : bv.getTime() - av.getTime();
      }
      return dir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return items.slice(input.offset, input.offset + input.limit);
  }

  // ── API de teste (não faz parte do port) ──────────────────
  /** limpa todo o estado do repositório */
  reset(opts?: MemRepoOptions): void {
    this.flags.clear();
    this.flagsById.clear();
    this.audit = [];
    this.opts.dbDown = opts?.dbDown;
    this.opts.auditLogDown = opts?.auditLogDown;
  }

  /** seed de flags legadas para satisfazer o "Contexto" dos features */
  seedLegadas(): void {
    const legado: Array<[string, string, 'BOOLEAN', boolean]> = [
      ['offline_enabled', 'Modo offline-first', 'BOOLEAN', false],
      ['pix_enabled', 'Pagamentos via PIX', 'BOOLEAN', false],
      ['waiter_mode_enabled', 'Chamada de garçom', 'BOOLEAN', false],
      ['qr_code_enabled', 'QR codes de mesa', 'BOOLEAN', false],
      ['combos_enabled', 'Sistema de combos', 'BOOLEAN', true],
      ['analytics_enabled', 'Dashboard de analytics', 'BOOLEAN', false],
      ['cashback_enabled', 'Sistema de cashback', 'BOOLEAN', false],
      ['multi_restaurant_enabled', 'Multi-restaurante', 'BOOLEAN', true],
    ];
    for (const [key, description, valueType, defaultValue] of legado) {
      const id = uid('flag');
      const now = new Date();
      this.flags.set(key, {
        id,
        key,
        description,
        valueType,
        defaultValue,
        enabled: true,
        createdAt: now,
        updatedAt: now,
        updatedBy: 'seed',
        overrides: [],
      });
      this.flagsById.set(id, key);
    }
  }

  /** ativar/desativar DB fora */
  setDbDown(down: boolean): void {
    this.opts.dbDown = down;
  }

  /** ativar/desativar audit log quebrado */
  setAuditLogDown(down: boolean): void {
    this.opts.auditLogDown = down;
  }

  /** expõe audit (somente leitura) para asserts */
  getAuditLog(): readonly FeatureFlagAuditEntry[] {
    return this.audit;
  }

  /** total de audit entries */
  auditCount(): number {
    return this.audit.length;
  }
}
