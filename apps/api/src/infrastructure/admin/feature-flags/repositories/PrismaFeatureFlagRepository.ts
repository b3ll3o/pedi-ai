/**
 * @spec(RF-ADM-FF-01..09, RNF-RELI-FF-01)
 *
 * Adapter Prisma do repositório de feature flags.
 * Implementa `IFeatureFlagRepository` (port do domain).
 *
 * Atomicidade (RNF-RELI-FF-01): mutações que alteram flag + audit log
 * usam `prisma.$transaction(async tx => {...})` — qualquer falha em
 * `audit.create` desfaz a mutation.
 */
import {
  AdicionarOverrideInput,
  AtualizarFlagInput,
  CriarFlagInput,
  FeatureFlagAuditEntry,
  FeatureFlagCompleto,
  FeatureFlagOverrideData,
  FeatureFlagResumo,
  IFeatureFlagRepository,
  ListarAuditoriaInput,
  ListarOverridesInput,
} from '../../../../domain/admin/feature-flags/repositories/IFeatureFlagRepository';

// Tipo mínimo do PrismaClient que esta classe precisa.
interface PrismaLike {
  featureFlag: {
    findMany: (args: unknown) => Promise<unknown[]>;
    findUnique: (args: unknown) => Promise<unknown | null>;
    findFirst: (args: unknown) => Promise<unknown | null>;
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
    count: (args: unknown) => Promise<number>;
  };
  featureFlagOverride: {
    findMany: (args: unknown) => Promise<unknown[]>;
    findUnique: (args: unknown) => Promise<unknown | null>;
    create: (args: unknown) => Promise<unknown>;
    delete: (args: unknown) => Promise<unknown>;
    count: (args: unknown) => Promise<number>;
  };
  featureFlagAuditLog: {
    findMany: (args: unknown) => Promise<unknown[]>;
    create: (args: unknown) => Promise<unknown>;
  };
  $transaction: <T>(fn: (tx: PrismaLike) => Promise<T>) => Promise<T>;
}

type RawFlag = {
  id: string;
  key: string;
  description: string | null;
  valueType: 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON';
  defaultValue: unknown;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
  overrides?: RawOverride[];
};

type RawOverride = {
  id: string;
  flagId: string;
  scope: 'GLOBAL' | 'RESTAURANT' | 'USER';
  scopeId: string | null;
  rolloutPct: number | null;
  value: unknown;
  expiresAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
};

type RawAudit = {
  id: string;
  flagId: string;
  actorId: string;
  action: string;
  before: unknown;
  after: unknown;
  reason: string | null;
  createdAt: Date;
};

export class PrismaFeatureFlagRepository implements IFeatureFlagRepository {
  constructor(private readonly prisma: PrismaLike) {}

  // ── listar ─────────────────────────────────────────────────

  async listar(options: { limit: number; offset: number }): Promise<{
    data: FeatureFlagResumo[];
    total: number;
  }> {
    const flags = (await this.prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
      skip: options.offset,
      take: options.limit,
    })) as RawFlag[];

    const total = await this.prisma.featureFlag.count({});

    // overrideCount por flag — 1 query por flag seria N+1; aqui aceitamos
    // o trade-off porque o admin lista ≤50 flags por página.
    const data: FeatureFlagResumo[] = [];
    for (const f of flags) {
      const count = await this.prisma.featureFlagOverride.count({
        where: { flagId: f.id },
      });
      data.push({
        id: f.id,
        key: f.key,
        description: f.description,
        valueType: f.valueType,
        defaultValue: f.defaultValue,
        enabled: f.enabled,
        updatedAt: f.updatedAt,
        overrideCount: count,
      });
    }

    return { data, total };
  }

  // ── findByKey ───────────────────────────────────────────────

  async findByKey(key: string): Promise<FeatureFlagCompleto | null> {
    const flag = (await this.prisma.featureFlag.findUnique({
      where: { key },
      include: { overrides: true },
    })) as (RawFlag & { overrides: RawOverride[] }) | null;

    if (!flag) return null;

    return {
      id: flag.id,
      key: flag.key,
      description: flag.description,
      valueType: flag.valueType,
      defaultValue: flag.defaultValue,
      enabled: flag.enabled,
      createdAt: flag.createdAt,
      updatedAt: flag.updatedAt,
      updatedBy: flag.updatedBy,
      overrides: (flag.overrides ?? []).map((o) => ({
        id: o.id,
        flagId: o.flagId,
        scope: o.scope,
        scopeId: o.scopeId,
        rolloutPct: o.rolloutPct,
        value: o.value,
        expiresAt: o.expiresAt,
        createdAt: o.createdAt,
        createdBy: o.createdBy,
      })),
    };
  }

  // ── criar (transação atômica) ───────────────────────────────

  async criar(input: CriarFlagInput): Promise<FeatureFlagCompleto> {
    const flag = (await this.prisma.$transaction(async (tx) => {
      const created = (await tx.featureFlag.create({
        data: {
          key: input.key,
          description: input.description ?? null,
          valueType: input.valueType,
          defaultValue: input.defaultValue as object,
          enabled: input.enabled ?? true,
          updatedBy: input.updatedBy,
        },
      })) as RawFlag;

      await tx.featureFlagAuditLog.create({
        data: {
          flagId: created.id,
          actorId: input.actorId,
          action: 'CREATE',
          before: null,
          after: {
            id: created.id,
            key: created.key,
            description: created.description,
            valueType: created.valueType,
            defaultValue: created.defaultValue,
            enabled: created.enabled,
          } as object,
        },
      });

      return created;
    })) as RawFlag;

    return {
      id: flag.id,
      key: flag.key,
      description: flag.description,
      valueType: flag.valueType,
      defaultValue: flag.defaultValue,
      enabled: flag.enabled,
      createdAt: flag.createdAt,
      updatedAt: flag.updatedAt,
      updatedBy: flag.updatedBy,
      overrides: [],
    };
  }

  // ── atualizar ───────────────────────────────────────────────

  async atualizar(input: AtualizarFlagInput): Promise<FeatureFlagCompleto> {
    const before = (await this.prisma.featureFlag.findUnique({
      where: { key: input.key },
      include: { overrides: true },
    })) as (RawFlag & { overrides: RawOverride[] }) | null;

    if (!before) {
      throw new Error('FeatureFlag não encontrada');
    }

    const data: Record<string, unknown> = {};
    if (input.patch.description !== undefined) data.description = input.patch.description;
    if (input.patch.defaultValue !== undefined) data.defaultValue = input.patch.defaultValue;
    if (input.patch.enabled !== undefined) data.enabled = input.patch.enabled;

    const after = (await this.prisma.$transaction(async (tx) => {
      const updated = (await tx.featureFlag.update({
        where: { id: before.id },
        data,
      })) as RawFlag;

      await tx.featureFlagAuditLog.create({
        data: {
          flagId: updated.id,
          actorId: input.actorId,
          action: 'UPDATE',
          before: {
            id: before.id,
            key: before.key,
            enabled: before.enabled,
            description: before.description,
            defaultValue: before.defaultValue,
          } as object,
          after: {
            id: updated.id,
            key: updated.key,
            enabled: updated.enabled,
            description: updated.description,
            defaultValue: updated.defaultValue,
          } as object,
        },
      });

      return updated;
    })) as RawFlag;

    return {
      id: after.id,
      key: after.key,
      description: after.description,
      valueType: after.valueType,
      defaultValue: after.defaultValue,
      enabled: after.enabled,
      createdAt: after.createdAt,
      updatedAt: after.updatedAt,
      updatedBy: after.updatedBy,
      overrides: before.overrides ?? [],
    };
  }

  // ── adicionarOverride (transação atômica) ───────────────────

  async adicionarOverride(input: AdicionarOverrideInput): Promise<FeatureFlagOverrideData> {
    const flag = (await this.prisma.featureFlag.findUnique({
      where: { key: input.flagKey },
    })) as RawFlag | null;

    if (!flag) {
      throw new Error('FeatureFlag não encontrada');
    }

    const result = (await this.prisma.$transaction(async (tx) => {
      const created = (await tx.featureFlagOverride.create({
        data: {
          flagId: flag.id,
          scope: input.scope,
          scopeId: input.scopeId,
          rolloutPct: input.rolloutPct ?? null,
          value: input.value as object,
          expiresAt: input.expiresAt ?? null,
          createdBy: input.createdBy,
        },
      })) as RawOverride;

      await tx.featureFlagAuditLog.create({
        data: {
          flagId: flag.id,
          actorId: input.actorId,
          action: 'OVERRIDE_ADD',
          before: null,
          after: {
            id: created.id,
            flagId: created.flagId,
            scope: created.scope,
            scopeId: created.scopeId,
            rolloutPct: created.rolloutPct,
            value: created.value,
            expiresAt: created.expiresAt,
          } as object,
        },
      });

      return created;
    })) as RawOverride;

    return {
      id: result.id,
      flagId: result.flagId,
      scope: result.scope,
      scopeId: result.scopeId,
      rolloutPct: result.rolloutPct,
      value: result.value,
      expiresAt: result.expiresAt,
      createdAt: result.createdAt,
      createdBy: result.createdBy,
    };
  }

  // ── removerOverride ─────────────────────────────────────────

  async removerOverride(overrideId: string): Promise<FeatureFlagOverrideData | null> {
    const before = (await this.prisma.featureFlagOverride.findUnique({
      where: { id: overrideId },
    })) as RawOverride | null;

    if (!before) return null;

    await this.prisma.$transaction(async (tx) => {
      const removed = (await tx.featureFlagOverride.delete({
        where: { id: overrideId },
      })) as RawOverride;

      await tx.featureFlagAuditLog.create({
        data: {
          flagId: removed.flagId,
          actorId: removed.createdBy ?? 'system',
          action: 'OVERRIDE_REMOVE',
          before: {
            id: removed.id,
            flagId: removed.flagId,
            scope: removed.scope,
            scopeId: removed.scopeId,
            rolloutPct: removed.rolloutPct,
            value: removed.value,
            expiresAt: removed.expiresAt,
          } as object,
          after: null,
        },
      });
    });

    return {
      id: before.id,
      flagId: before.flagId,
      scope: before.scope,
      scopeId: before.scopeId,
      rolloutPct: before.rolloutPct,
      value: before.value,
      expiresAt: before.expiresAt,
      createdAt: before.createdAt,
      createdBy: before.createdBy,
    };
  }

  // ── listarOverrides ─────────────────────────────────────────

  async listarOverrides(input: ListarOverridesInput): Promise<FeatureFlagOverrideData[]> {
    const flag = (await this.prisma.featureFlag.findUnique({
      where: { key: input.flagKey },
    })) as RawFlag | null;

    if (!flag) {
      throw new Error('FeatureFlag não encontrada');
    }

    const now = input.now ?? new Date();
    const rows = (await this.prisma.featureFlagOverride.findMany({
      where: {
        flagId: flag.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [{ scope: 'asc' }, { createdAt: 'desc' }],
      take: input.limit,
      skip: input.offset,
    })) as RawOverride[];

    return rows.map((o) => ({
      id: o.id,
      flagId: o.flagId,
      scope: o.scope,
      scopeId: o.scopeId,
      rolloutPct: o.rolloutPct,
      value: o.value,
      expiresAt: o.expiresAt,
      createdAt: o.createdAt,
      createdBy: o.createdBy,
    }));
  }

  // ── listarAuditoria ─────────────────────────────────────────

  async listarAuditoria(input: ListarAuditoriaInput): Promise<FeatureFlagAuditEntry[]> {
    const flag = (await this.prisma.featureFlag.findUnique({
      where: { key: input.flagKey },
    })) as RawFlag | null;

    const flagId = flag?.id;
    const rows = (await this.prisma.featureFlagAuditLog.findMany({
      where: { flagId },
      orderBy: { createdAt: 'desc' },
      take: input.limit,
      skip: input.offset,
    })) as RawAudit[];

    return rows.map((r) => ({
      id: r.id,
      flagId: r.flagId,
      actorId: r.actorId,
      action: r.action,
      before: r.before,
      after: r.after,
      reason: r.reason,
      createdAt: r.createdAt,
    }));
  }
}
