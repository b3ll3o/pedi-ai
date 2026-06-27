/**
 * @spec(RF-ADM-FF-03, RF-ADM-FF-04, RF-ADM-FF-05, RF-ADM-FF-08)
 *
 * Aggregate Root `FeatureFlag` (rich) — concentra as invariantes do agregado.
 *
 * Invariantes:
 *   - `key` imutável após criação (RF-ADM-FF-04)
 *   - `valueType` imutável após criação (RF-ADM-FF-04)
 *   - `defaultValue` deve ser compatível com `valueType`
 *   - `enabled = false` zera avaliações (RF-ADM-FF-08)
 *   - `atualizar()` rejeita tentativa de alterar `key` ou `valueType`
 *   - `desabilitar()` / `habilitar()` emitem `FeatureFlagChanged`
 *   - Override duplicado (`flagId, scope, scopeId`) é rejeitado in-memory
 */

import { FeatureFlagChanged, FeatureFlagSnapshot } from '../events/FeatureFlagChanged';
import { FlagKey } from '../value-objects/FlagKey';
import { FlagValue, FlagValueType } from '../value-objects/FlagValue';
import { FlagScopeType } from '../value-objects/TargetingRule';

export interface FeatureFlagOverrideAttr {
  id: string;
  scope: FlagScopeType;
  scopeId: string | null;
  value: unknown;
  rolloutPct?: number | null;
  expiresAt?: Date | null;
}

export interface CriarFeatureFlagInput {
  key: string;
  description?: string | null;
  valueType: FlagValueType;
  defaultValue: unknown;
  enabled?: boolean;
  updatedBy: string;
}

export interface AtualizarFeatureFlagPatch {
  description?: string | null;
  defaultValue?: unknown;
  enabled?: boolean;
}

export interface AdicionarOverrideAttrInput {
  id?: string;
  scope: FlagScopeType;
  scopeId: string | null;
  value: unknown;
  rolloutPct?: number | null;
  expiresAt?: Date | null;
}

export class FeatureFlag {
  private readonly _overrides: FeatureFlagOverrideAttr[] = [];

  private constructor(
    public readonly id: string,
    public readonly key: string,
    public readonly valueType: FlagValueType,
    public description: string | null,
    public defaultValue: unknown,
    public enabled: boolean,
    public updatedBy: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
    private readonly _initialOverrides: FeatureFlagOverrideAttr[] = []
  ) {
    this._overrides.push(..._initialOverrides);
  }

  /**
   * Construtor canônico (factory). Valida invariantes e retorna instância.
   */
  static criar(input: CriarFeatureFlagInput): FeatureFlag {
    const flagKey = FlagKey.criar(input.key);
    FlagValue.criar(input.valueType, input.defaultValue);

    return new FeatureFlag(
      '', // id atribuído pela persistência
      flagKey.valor,
      input.valueType,
      input.description ?? null,
      input.defaultValue,
      input.enabled ?? true,
      input.updatedBy,
      new Date(),
      new Date()
    );
  }

  /**
   * Hidrata a partir do repositório (id e overrides já conhecidos).
   */
  static hidratar(dados: {
    id: string;
    key: string;
    description: string | null;
    valueType: FlagValueType;
    defaultValue: unknown;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    updatedBy: string | null;
    overrides?: FeatureFlagOverrideAttr[];
  }): FeatureFlag {
    return new FeatureFlag(
      dados.id,
      dados.key,
      dados.valueType,
      dados.description,
      dados.defaultValue,
      dados.enabled,
      dados.updatedBy,
      dados.createdAt,
      dados.updatedAt,
      dados.overrides ?? []
    );
  }

  // ── Acesso aos overrides ─────────────────────────────────────

  get overrideCount(): number {
    return this._overrides.length;
  }

  get overrides(): ReadonlyArray<FeatureFlagOverrideAttr> {
    return this._overrides;
  }

  listarOverridesAtivos(now: Date): FeatureFlagOverrideAttr[] {
    return this._overrides.filter((o) => !o.expiresAt || o.expiresAt > now);
  }

  // ── Comportamento ────────────────────────────────────────────

  atualizar(patch: AtualizarFeatureFlagPatch & { key?: unknown; valueType?: unknown }): void {
    if ('key' in patch && patch.key !== undefined) {
      throw new Error('key é imutável após criação');
    }
    if ('valueType' in patch && patch.valueType !== undefined) {
      throw new Error('valueType é imutável após criação');
    }

    if (patch.description !== undefined) {
      this.description = patch.description;
    }

    if (patch.defaultValue !== undefined) {
      FlagValue.criar(this.valueType, patch.defaultValue);
      this.defaultValue = patch.defaultValue;
    }

    if (patch.enabled !== undefined) {
      this.enabled = patch.enabled;
    }

    this.updatedAt = new Date();
  }

  desabilitar(actorId: string): FeatureFlagChanged[] {
    if (!this.enabled) return [];
    this.enabled = false;
    this.updatedAt = new Date();
    this.updatedBy = actorId;
    return [
      new FeatureFlagChanged(
        'TOGGLE',
        actorId,
        { key: this.key, enabled: true },
        { key: this.key, enabled: false }
      ),
    ];
  }

  habilitar(actorId: string): FeatureFlagChanged[] {
    if (this.enabled) return [];
    this.enabled = true;
    this.updatedAt = new Date();
    this.updatedBy = actorId;
    return [
      new FeatureFlagChanged(
        'TOGGLE',
        actorId,
        { key: this.key, enabled: false },
        { key: this.key, enabled: true }
      ),
    ];
  }

  adicionarOverride(input: AdicionarOverrideAttrInput): FeatureFlagOverrideAttr {
    const id = input.id ?? `ov_${Math.random().toString(36).slice(2, 10)}`;

    const duplicado = this._overrides.find(
      (o) => o.scope === input.scope && o.scopeId === input.scopeId
    );
    if (duplicado) {
      throw new Error(
        `Já existe override para (${this.key}, ${input.scope}, ${input.scopeId ?? 'null'})`
      );
    }

    const override: FeatureFlagOverrideAttr = {
      id,
      scope: input.scope,
      scopeId: input.scopeId,
      value: input.value,
      rolloutPct: input.rolloutPct ?? null,
      expiresAt: input.expiresAt ?? null,
    };

    this._overrides.push(override);
    this.updatedAt = new Date();

    return override;
  }

  removerOverride(overrideId: string): FeatureFlagChanged[] {
    const idx = this._overrides.findIndex((o) => o.id === overrideId);
    if (idx === -1) {
      throw new Error('Override não encontrado');
    }

    const removido = this._overrides.splice(idx, 1)[0];
    this.updatedAt = new Date();

    return [
      new FeatureFlagChanged(
        'OVERRIDE_REMOVE',
        '', // actorId populado pelo caso de uso
        {
          key: this.key,
          override: {
            id: removido.id,
            scope: removido.scope,
            scopeId: removido.scopeId,
            value: removido.value,
            rolloutPct: removido.rolloutPct ?? null,
            expiresAt: removido.expiresAt ?? null,
          },
        },
        null
      ),
    ];
  }

  snapshot(): FeatureFlagSnapshot {
    return {
      id: this.id || undefined,
      key: this.key,
      enabled: this.enabled,
      description: this.description,
      valueType: this.valueType,
      defaultValue: this.defaultValue,
      override: null,
    };
  }
}
