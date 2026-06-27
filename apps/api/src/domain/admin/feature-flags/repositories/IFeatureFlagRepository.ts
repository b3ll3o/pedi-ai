/**
 * @spec(RF-ADM-FF-01..09)
 *
 * Interface `IFeatureFlagRepository` — port do repositório de feature flags.
 *
 * Princípio: domain não conhece Prisma. A implementação fica em
 * `infrastructure/admin/feature-flags/repositories/PrismaFeatureFlagRepository`.
 *
 * Operações:
 *   - CRUD da flag
 *   - CRUD de overrides
 *   - Auditoria
 *   - Listagem com paginação
 */

export interface FeatureFlagResumo {
  id: string;
  key: string;
  description: string | null;
  valueType: 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON';
  defaultValue: unknown;
  enabled: boolean;
  updatedAt: Date;
  overrideCount: number;
}

export interface FeatureFlagCompleto {
  id: string;
  key: string;
  description: string | null;
  valueType: 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON';
  defaultValue: unknown;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
  overrides: FeatureFlagOverrideData[];
}

export interface FeatureFlagOverrideData {
  id: string;
  flagId: string;
  scope: 'GLOBAL' | 'RESTAURANT' | 'USER';
  scopeId: string | null;
  rolloutPct: number | null;
  value: unknown;
  expiresAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
}

export interface FeatureFlagAuditEntry {
  id: string;
  flagId: string;
  actorId: string;
  action: string;
  before: unknown;
  after: unknown;
  reason: string | null;
  createdAt: Date;
}

export interface CriarFlagInput {
  key: string;
  description?: string | null;
  valueType: 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON';
  defaultValue: unknown;
  enabled?: boolean;
  updatedBy: string;
  actorId: string;
}

export interface AtualizarFlagInput {
  key: string;
  patch: {
    description?: string | null;
    defaultValue?: unknown;
    enabled?: boolean;
  };
  actorId: string;
}

export interface AdicionarOverrideInput {
  flagKey: string;
  scope: 'GLOBAL' | 'RESTAURANT' | 'USER';
  scopeId: string | null;
  value: unknown;
  rolloutPct?: number | null;
  expiresAt?: Date | null;
  createdBy: string;
  actorId: string;
}

export interface ListarOverridesInput {
  flagKey: string;
  limit: number;
  offset: number;
  /** Quando presente, filtra `expiresAt > now OR null` */
  now?: Date;
  /** Filtro adicional (ex.: `where: { OR: [{ expiresAt: null }, ...] }`) */
  where?: Record<string, unknown>;
}

export interface ListarAuditoriaInput {
  flagKey: string;
  limit: number;
  offset: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

export interface IFeatureFlagRepository {
  listar(options: { limit: number; offset: number }): Promise<{
    data: FeatureFlagResumo[];
    total: number;
  }>;

  findByKey(key: string): Promise<FeatureFlagCompleto | null>;

  criar(input: CriarFlagInput): Promise<FeatureFlagCompleto>;

  atualizar(input: AtualizarFlagInput): Promise<FeatureFlagCompleto>;

  adicionarOverride(input: AdicionarOverrideInput): Promise<FeatureFlagOverrideData>;

  removerOverride(overrideId: string): Promise<FeatureFlagOverrideData | null>;

  listarOverrides(input: ListarOverridesInput): Promise<FeatureFlagOverrideData[]>;

  listarAuditoria(input: ListarAuditoriaInput): Promise<FeatureFlagAuditEntry[]>;
}
