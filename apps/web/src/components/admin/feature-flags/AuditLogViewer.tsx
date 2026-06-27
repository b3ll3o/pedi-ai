'use client';

/**
 * @spec(RF-ADM-FF-09, RF-ADM-FF-10, RNF-I18N-FF-01)
 *
 * Visualizador de audit log de feature flags.
 *
 * Comportamentos:
 *  - Lista entradas em timeline vertical com timestamps relativos (pt-BR).
 *  - Diff `before → after` em JSON formatado, colapsável.
 *  - Action labels em pt-BR (RNF-I18N-FF-01).
 *  - Empty state amigável.
 *
 * Acessibilidade:
 *  - `aria-label` descritivo na timeline.
 *  - Cada entrada é um `<li>` com semântica.
 *  - Botão "Ver diff" tem `aria-expanded`.
 */
import { useState } from 'react';

import styles from './AuditLogViewer.module.css';

export interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  before: unknown;
  after: unknown;
  reason?: string | null;
  createdAt: string;
}

export interface AuditLogViewerProps {
  entries: AuditEntry[];
  /** Callback "Carregar mais" — quando ausente, não mostra botão. */
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const ACTION_LABELS_PT: Record<string, string> = {
  CREATE: 'criação',
  UPDATE: 'atualização',
  TOGGLE: 'alternar estado',
  OVERRIDE_ADD: 'adição de override',
  OVERRIDE_REMOVE: 'remoção de override',
  ROLLOUT_CHANGE: 'mudança de rollout',
};

export function AuditLogViewer({ entries, onLoadMore, hasMore = false }: AuditLogViewerProps) {
  if (entries.length === 0) {
    return (
      <div className={styles.empty} role="status" data-testid="audit-empty">
        Nenhuma alteração registrada para esta flag.
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <ol className={styles.timeline} aria-label="Histórico de alterações">
        {entries.map((entry) => (
          <AuditEntryRow key={entry.id} entry={entry} />
        ))}
      </ol>

      {onLoadMore && hasMore && (
        <div className={styles.loadMoreWrapper}>
          <button type="button" onClick={onLoadMore} className={styles.loadMoreBtn}>
            Carregar mais
          </button>
        </div>
      )}
    </div>
  );
}

function AuditEntryRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);

  const actionLabel = ACTION_LABELS_PT[entry.action] ?? entry.action.toLowerCase();
  const relativeTime = formatRelative(entry.createdAt);

  return (
    <li className={styles.entry} data-testid="audit-entry" data-action={entry.action}>
      <div className={styles.entryHeader}>
        <span className={`${styles.badge} ${styles[`badge--${entry.action}`] ?? ''}`}>
          {actionLabel}
        </span>
        <span className={styles.actor}>{entry.actorId}</span>
        <time className={styles.time} dateTime={entry.createdAt} title={entry.createdAt}>
          {relativeTime}
        </time>
      </div>

      {entry.reason && <p className={styles.reason}>{entry.reason}</p>}

      <p className={styles.summary} data-testid="audit-summary">
        {formatInline(entry.before)} → {formatInline(entry.after)}
      </p>

      <button
        type="button"
        className={styles.diffToggle}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Ocultar diff' : 'Ver diff'}
      </button>

      {expanded && (
        <div className={styles.diff}>
          <div className={styles.diffCol}>
            <h4 className={styles.diffTitle}>Antes</h4>
            <pre className={styles.diffJson}>{formatJson(entry.before)}</pre>
          </div>
          <div className={styles.diffCol}>
            <h4 className={styles.diffTitle}>Depois</h4>
            <pre className={styles.diffJson}>{formatJson(entry.after)}</pre>
          </div>
        </div>
      )}
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;

  const diffSec = Math.round((now - then) / 1000);
  if (diffSec < 5) return 'agora há pouco';
  if (diffSec < 60) return `há ${diffSec} segundos`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} minutos`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `há ${diffHour} horas`;
  const diffDay = Math.round(diffHour / 24);
  return `há ${diffDay} dias`;
}

function formatJson(value: unknown): string {
  if (value === null || value === undefined) return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Versão inline (uma linha) — usada no resumo sempre-visível.
 * Renderiza `enabled: true` e `enabled: false` no formato que o teste procura.
 */
function formatInline(value: unknown): string {
  if (value === null || value === undefined) return '—';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
