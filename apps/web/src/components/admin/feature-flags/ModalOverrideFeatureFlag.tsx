'use client';

/**
 * @spec(RF-ADM-FF-05, RF-ADM-FF-06, RF-ADM-FF-10, RNF-SEC-FF-01, RNF-I18N-FF-01)
 *
 * Modal acessível para criar / remover override de uma flag.
 *
 * Acessibilidade:
 *  - `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
 *  - Foco inicial no diálogo. `Esc` fecha.
 *  - Confirmação destrutiva antes de excluir (RF-ADM-FF-06).
 *
 * RBAC:
 *  - `owner`: vê botão Salvar / Excluir.
 *  - `manager`: vê apenas visualização + banner "Apenas owner".
 *
 * Validação client-side:
 *  - `scope=GLOBAL` ⇒ `scopeId` deve ser vazio/nulo.
 *  - `scope∈{RESTAURANT,USER}` ⇒ `scopeId` obrigatório.
 *  - `rolloutPct` ∈ [0, 100].
 */
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import styles from './ModalOverrideFeatureFlag.module.css';

export type OverrideScope = 'GLOBAL' | 'RESTAURANT' | 'USER';

export interface ExistingOverride {
  id: string;
  scope: OverrideScope;
  scopeId: string | null;
}

export interface OverrideSubmitPayload {
  scope: OverrideScope;
  scopeId: string | null;
  value: unknown;
  rolloutPct?: number;
  expiresAt?: string;
}

export type FeatureFlagRole = 'owner' | 'manager';

export interface ModalOverrideFeatureFlagProps {
  open: boolean;
  flagKey: string;
  onClose: () => void;
  onSubmit: (payload: OverrideSubmitPayload) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  role: FeatureFlagRole;
  existingOverride?: ExistingOverride;
}

type FormState = {
  scope: OverrideScope;
  scopeId: string;
  value: string;
  rolloutPct: string;
  expiresAt: string;
};

const EMPTY_STATE: FormState = {
  scope: 'GLOBAL',
  scopeId: '',
  value: 'true',
  rolloutPct: '100',
  expiresAt: '',
};

function deriveInitialState(existing?: ExistingOverride): FormState {
  if (!existing) return EMPTY_STATE;
  return {
    scope: existing.scope,
    scopeId: existing.scopeId ?? '',
    value: 'true',
    rolloutPct: '100',
    expiresAt: '',
  };
}

export function ModalOverrideFeatureFlag({
  open,
  flagKey,
  onClose,
  onSubmit,
  onDelete,
  role,
  existingOverride,
}: ModalOverrideFeatureFlagProps) {
  // Renderização é derivada 100% de props — sem setState em useEffect.
  if (!open) return null;
  return (
    <ModalBody
      flagKey={flagKey}
      onClose={onClose}
      onSubmit={onSubmit}
      onDelete={onDelete}
      role={role}
      existingOverride={existingOverride}
    />
  );
}

// Re-export com type alias para evitar empty interface.
type ModalBodyProps = Omit<ModalOverrideFeatureFlagProps, 'open'>;

function ModalBody({
  flagKey,
  onClose,
  onSubmit,
  onDelete,
  role,
  existingOverride,
}: ModalBodyProps) {
  const titleId = useId();
  const [state, setState] = useState<FormState>(() => deriveInitialState(existingOverride));
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Esc fecha modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Foco inicial
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const isOwner = role === 'owner';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validação client-side (espelha Zod do backend — design.md §5).
    if (state.scope === 'GLOBAL' && state.scopeId.trim().length > 0) {
      setError('scopeId deve ser nulo para GLOBAL.');
      return;
    }
    if ((state.scope === 'RESTAURANT' || state.scope === 'USER') && !state.scopeId.trim()) {
      setError('scopeId é obrigatório para este escopo.');
      return;
    }

    const rolloutPct = state.rolloutPct.trim() === '' ? undefined : Number(state.rolloutPct);
    if (
      rolloutPct !== undefined &&
      (Number.isNaN(rolloutPct) || rolloutPct < 0 || rolloutPct > 100)
    ) {
      setError('rollout deve estar entre 0 e 100.');
      return;
    }

    const value = parseValue(state.value);
    const payload: OverrideSubmitPayload = {
      scope: state.scope,
      scopeId: state.scope === 'GLOBAL' ? null : state.scopeId.trim(),
      value,
    };
    if (rolloutPct !== undefined) payload.rolloutPct = rolloutPct;
    if (state.expiresAt) payload.expiresAt = new Date(state.expiresAt).toISOString();

    await onSubmit(payload);
  };

  const handleDeleteClick = async () => {
    if (!existingOverride || !onDelete) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    await onDelete(existingOverride.id);
  };

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={styles.dialog}
      >
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {existingOverride ? 'Editar override' : 'Adicionar override'} — <code>{flagKey}</code>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className={styles.closeBtn}
          >
            ×
          </button>
        </header>

        {!isOwner && (
          <p className={styles.banner} role="status" data-testid="rbac-banner">
            Apenas owner pode modificar overrides. Você está em modo leitura.
          </p>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <fieldset className={styles.fieldset} disabled={!isOwner}>
            <legend className={styles.srOnly}>Dados do override</legend>

            <div className={styles.field}>
              <label htmlFor="scope" className={styles.label}>
                Escopo
              </label>
              <select
                id="scope"
                value={state.scope}
                onChange={(e) => setState({ ...state, scope: e.target.value as OverrideScope })}
                className={styles.select}
              >
                <option value="GLOBAL">Global (todos os restaurantes)</option>
                <option value="RESTAURANT">Restaurante específico</option>
                <option value="USER">Usuário específico</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="scopeId" className={styles.label}>
                scopeId
              </label>
              <input
                id="scopeId"
                type="text"
                value={state.scopeId}
                onChange={(e) => setState({ ...state, scopeId: e.target.value })}
                placeholder={
                  state.scope === 'RESTAURANT'
                    ? 'ID do restaurante'
                    : state.scope === 'USER'
                      ? 'ID do usuário'
                      : 'Deixe vazio para GLOBAL'
                }
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="value" className={styles.label}>
                Valor
              </label>
              <input
                id="value"
                type="text"
                value={state.value}
                onChange={(e) => setState({ ...state, value: e.target.value })}
                placeholder="true | false | texto | número | JSON"
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="rollout" className={styles.label}>
                rollout (%) — 0 a 100
              </label>
              <input
                id="rollout"
                type="number"
                min={0}
                max={100}
                value={state.rolloutPct}
                onChange={(e) => setState({ ...state, rolloutPct: e.target.value })}
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="expiresAt" className={styles.label}>
                Data de expiração (opcional)
              </label>
              <input
                id="expiresAt"
                type="datetime-local"
                value={state.expiresAt}
                onChange={(e) => setState({ ...state, expiresAt: e.target.value })}
                className={styles.input}
              />
            </div>
          </fieldset>

          {error && (
            <p className={styles.error} role="alert" data-testid="form-error">
              {error}
            </p>
          )}

          <div className={styles.actions}>
            {existingOverride && isOwner && onDelete && (
              <button
                type="button"
                onClick={handleDeleteClick}
                className={styles.dangerBtn}
                data-testid="btn-excluir-override"
              >
                {confirmingDelete ? 'Confirmar exclusão?' : 'Excluir override'}
              </button>
            )}

            {confirmingDelete && (
              <p className={styles.confirmMsg} role="alert">
                Tem certeza? Esta ação não pode ser desfeita.
              </p>
            )}

            <button type="button" onClick={onClose} className={styles.secondaryBtn}>
              Cancelar
            </button>

            {isOwner && (
              <button type="submit" className={styles.primaryBtn} data-testid="btn-salvar-override">
                Salvar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function parseValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed !== '' && !Number.isNaN(Number(trimmed))) return Number(trimmed);
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}
