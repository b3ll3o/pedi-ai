/**
 * @spec(RF-ADM-FF-03..06)
 *
 * Domain Event `FeatureFlagChanged` — emitido sempre que uma flag
 * (ou seus overrides) sofre mutação que afete avaliação.
 *
 * Imutável. `before`/`after` são snapshots parciais — apenas os campos
 * alterados. Use o `actorId` para auditoria (RNF-RELI-FF-01).
 */

export type FeatureFlagAction =
  | 'CREATE'
  | 'UPDATE'
  | 'TOGGLE'
  | 'OVERRIDE_ADD'
  | 'OVERRIDE_REMOVE'
  | 'ROLLOUT_CHANGE';

export interface FeatureFlagSnapshot {
  id?: string;
  key: string;
  enabled?: boolean;
  description?: string | null;
  valueType?: 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON';
  defaultValue?: unknown;
  override?: {
    id: string;
    scope: 'GLOBAL' | 'RESTAURANT' | 'USER';
    scopeId: string | null;
    value: unknown;
    rolloutPct?: number | null;
    expiresAt?: Date | null;
  } | null;
}

export class FeatureFlagChanged {
  constructor(
    public readonly action: FeatureFlagAction,
    public readonly actorId: string,
    public readonly before: FeatureFlagSnapshot | null,
    public readonly after: FeatureFlagSnapshot | null,
    public readonly createdAt: Date = new Date()
  ) {}
}
