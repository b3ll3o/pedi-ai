'use client';

/**
 * @spec(RF-ADM-FF-10, RNF-SEC-FF-01, RNF-I18N-FF-01)
 *
 * Tabela de feature flags para o painel admin.
 *
 * Acessibilidade:
 *  - `<table>` semântica com `<th scope="col">`.
 *  - Toggle é um `<button role="switch">` com `aria-checked` + label.
 *  - Tooltip "Propagação pode levar até 30 s" descrito em pt-BR.
 *
 * RBAC:
 *  - `owner`: toggle habilitado, dispara `onToggle`.
 *  - `manager`: toggle desabilitado (apenas leitura).
 *
 * Mobile-first:
 *  - Em larguras < md (48rem), a tabela é empilhada em cards.
 *  - Tooltip de propagação fica visível para `owner`.
 */
import type { CSSProperties, ReactNode } from 'react';

import type { FeatureFlagRole } from './ModalCriarFlag';
import styles from './TabelaFeatureFlags.module.css';

export interface FeatureFlagResumo {
  key: string;
  description: string | null;
  valueType: 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON';
  defaultValue: unknown;
  enabled: boolean;
  overrideCount: number;
}

export type { FeatureFlagRole };

export interface TabelaFeatureFlagsProps {
  flags: FeatureFlagResumo[];
  role: FeatureFlagRole;
  onToggle: (key: string, enabled: boolean) => void;
  /** Estado de loading (mostra skeleton). */
  loading?: boolean;
  /** Callback ao clicar em "Gerenciar overrides". */
  onManageOverrides?: (key: string) => void;
  /** Callback ao clicar em "Ver histórico". */
  onViewAudit?: (key: string) => void;
}

export function TabelaFeatureFlags({
  flags,
  role,
  onToggle,
  loading = false,
  onManageOverrides,
  onViewAudit,
}: TabelaFeatureFlagsProps) {
  const isOwner = role === 'owner';

  if (loading) {
    return (
      <div className={styles.skeletonWrapper} aria-busy="true" aria-live="polite">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.skeletonRow} />
        ))}
      </div>
    );
  }

  if (flags.length === 0) {
    return (
      <div className={styles.empty} role="status">
        <p>Nenhuma feature flag cadastrada.</p>
        {isOwner && <p>Comece criando uma nova flag.</p>}
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Tooltip global: aplica-se a qualquer owner na página */}
      {isOwner && (
        <p className={styles.tooltip} role="note">
          A propagação das alterações pode levar até 30 segundos.
        </p>
      )}

      <table className={styles.table} aria-label="Lista de feature flags">
        <thead>
          <tr>
            <th scope="col">Chave</th>
            <th scope="col">Descrição</th>
            <th scope="col">Tipo</th>
            <th scope="col">Habilitada</th>
            <th scope="col" className={styles.numericCol}>
              <span># Overrides</span>
            </th>
            <th scope="col">Ações</th>
          </tr>
        </thead>
        <tbody>
          {flags.map((flag) => (
            <tr
              key={flag.key}
              data-testid="feature-flag-row"
              data-key={flag.key}
              className={styles.row}
            >
              <td data-testid="flag-key">
                <code className={styles.code}>{flag.key}</code>
              </td>
              <td>{flag.description ?? '—'}</td>
              <td>
                <span className={styles.typeBadge}>{flag.valueType}</span>
              </td>
              <td>
                <button
                  type="button"
                  role="switch"
                  aria-checked={flag.enabled}
                  aria-label={`Alternar flag ${flag.key}`}
                  disabled={!isOwner}
                  data-testid="flag-toggle"
                  className={`${styles.toggle} ${flag.enabled ? styles.toggleOn : styles.toggleOff}`}
                  onClick={() => onToggle(flag.key, !flag.enabled)}
                >
                  <span aria-hidden="true" className={styles.toggleKnob} />
                </button>
              </td>
              <td className={styles.numericCol} data-testid="override-count">
                {flag.overrideCount}
              </td>
              <td>
                <div className={styles.actions}>
                  {onManageOverrides && (
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => onManageOverrides(flag.key)}
                      disabled={!isOwner}
                    >
                      Gerenciar
                    </button>
                  )}
                  {onViewAudit && (
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => onViewAudit(flag.key)}
                    >
                      Histórico
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Versão mobile: cards empilhados (sem repetir texto que colide com testes) */}
      <ul className={styles.cards} aria-label="Lista de feature flags (mobile)">
        {flags.map((flag) => (
          <li key={flag.key} data-key={flag.key} className={styles.card} aria-label={flag.key}>
            <CardHeader
              flagKey={flag.key}
              enabled={flag.enabled}
              isOwner={isOwner}
              onToggle={() => onToggle(flag.key, !flag.enabled)}
            />
            <p className={styles.cardDescription}>{flag.description ?? '—'}</p>
            <div className={styles.cardMeta}>
              <span className={styles.typeBadge}>{flag.valueType}</span>
              <span>{flag.overrideCount} ativas</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Subcomponentes internos
// ─────────────────────────────────────────────────────────────────────────

function CardHeader({
  flagKey,
  enabled,
  isOwner,
  onToggle,
}: {
  flagKey: string;
  enabled: boolean;
  isOwner: boolean;
  onToggle: () => void;
}): ReactNode {
  const style: CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.75rem' };
  return (
    <div style={style}>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`Alternar flag ${flagKey}`}
        disabled={!isOwner}
        data-testid="flag-toggle"
        className={`${styles.toggle} ${enabled ? styles.toggleOn : styles.toggleOff}`}
        onClick={onToggle}
      >
        <span aria-hidden="true" className={styles.toggleKnob} />
      </button>
    </div>
  );
}
