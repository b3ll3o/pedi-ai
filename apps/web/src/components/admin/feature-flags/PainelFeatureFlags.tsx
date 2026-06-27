'use client';

/**
 * @spec(RF-ADM-FF-10)
 *
 * Orquestrador do painel admin de feature flags.
 * Combina `TabelaFeatureFlags`, `ModalOverrideFeatureFlag`, `ModalCriarFlag`,
 * `AuditLogViewer` e `FiltrosFeatureFlags`. Gerencia estado de mutação
 * (toggle, override, audit, criar) usando os hooks de
 * `application/admin/feature-flags/use-cases/*`.
 *
 * Estados:
 *  - `loading`: skeleton.
 *  - `error`: banner com botão "Tentar novamente".
 *  - `vazio`: empty state com CTA "Nova flag".
 *
 * RBAC visual:
 *  - `manager`: botões desabilitados; banner explicativo.
 *
 * Feedback:
 *  - Sucesso/erro de mutações são emitidos via `useToast` (Task 7).
 */
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';

import { logger } from '@/lib/logger';
import { useToast } from '@/lib/notification';

import { AuditLogViewer, type AuditEntry } from './AuditLogViewer';
import { FiltrosFeatureFlags, type FiltroEstado } from './FiltrosFeatureFlags';
import {
  ModalCriarFlag,
  type CriarFlagSubmitPayload,
  type FeatureFlagRole,
} from './ModalCriarFlag';
import {
  ModalOverrideFeatureFlag,
  type ExistingOverride,
  type OverrideSubmitPayload,
} from './ModalOverrideFeatureFlag';
import { TabelaFeatureFlags, type FeatureFlagResumo } from './TabelaFeatureFlags';

import { useAdicionarOverride } from '@/application/admin/feature-flags/use-cases/useAdicionarOverride';
import { useAtualizarFeatureFlag } from '@/application/admin/feature-flags/use-cases/useAtualizarFeatureFlag';
import { useCriarFeatureFlag } from '@/application/admin/feature-flags/use-cases/useCriarFeatureFlag';
import { useListarOverrides } from '@/application/admin/feature-flags/use-cases/useListarOverrides';
import { useRemoverOverride } from '@/application/admin/feature-flags/use-cases/useRemoverOverride';

import styles from './PainelFeatureFlags.module.css';

export type { FeatureFlagRole } from './ModalCriarFlag';

export interface PainelFeatureFlagsProps {
  role: FeatureFlagRole;
}

const POLL_INTERVAL_MS = 30_000;

// ─────────────────────────────────────────────────────────────────────────
// Reducer — satisfaz `react-hooks/set-state-in-effect` ao evitar setState
// direto em useEffect. Dispara actions e o reducer aplica.
// ─────────────────────────────────────────────────────────────────────────

type FlagsState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; data: FeatureFlagResumo[] };

type FlagsAction =
  | { type: 'fetch_start' }
  | { type: 'fetch_success'; data: FeatureFlagResumo[] }
  | { type: 'fetch_error'; message: string }
  | { type: 'optimistic_toggle'; key: string; enabled: boolean };

function flagsReducer(state: FlagsState, action: FlagsAction): FlagsState {
  switch (action.type) {
    case 'fetch_start':
      return state.kind === 'success' ? state : { kind: 'loading' };
    case 'fetch_success':
      return { kind: 'success', data: action.data };
    case 'fetch_error':
      return { kind: 'error', message: action.message };
    case 'optimistic_toggle':
      if (state.kind !== 'success') return state;
      return {
        kind: 'success',
        data: state.data.map((f) => (f.key === action.key ? { ...f, enabled: action.enabled } : f)),
      };
    default:
      return state;
  }
}

export function PainelFeatureFlags({ role }: PainelFeatureFlagsProps) {
  const [state, dispatch] = useReducer(flagsReducer, { kind: 'idle' });
  const [busca, setBusca] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado>('todos');

  const [modalFlagKey, setModalFlagKey] = useState<string | null>(null);
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [existingOverrides, setExistingOverrides] = useState<Record<string, ExistingOverride>>({});
  const [auditFlagKey, setAuditFlagKey] = useState<string | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const { atualizar } = useAtualizarFeatureFlag();
  const { adicionar } = useAdicionarOverride();
  const { remover } = useRemoverOverride();
  const { criar } = useCriarFeatureFlag();
  const toast = useToast();
  const overridesState = useListarOverrides(modalFlagKey ?? '');

  // ────────────────────────────────────────────────────────────────────
  // Listagem + polling — dispatch via reducer (sem setState em effect).
  // ────────────────────────────────────────────────────────────────────

  const carregar = useCallback(async () => {
    dispatch({ type: 'fetch_start' });
    try {
      const response = await fetch('/api/v1/admin/feature-flags', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`Erro ${response.status}`);
      const body = (await response.json()) as { data?: FeatureFlagResumo[] };
      dispatch({ type: 'fetch_success', data: body.data ?? [] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('PainelFeatureFlags', 'Falha ao listar flags', { message });
      dispatch({ type: 'fetch_error', message });
    }
  }, []);

  useEffect(() => {
    void carregar();
    const id = setInterval(carregar, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [carregar]);

  // ────────────────────────────────────────────────────────────────────
  // Filtros (client-side)
  // ────────────────────────────────────────────────────────────────────

  const flags = state.kind === 'success' ? state.data : [];
  const loading = state.kind === 'loading' || state.kind === 'idle';
  const error = state.kind === 'error' ? state.message : null;

  const flagsFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return flags.filter((flag) => {
      if (termo && !flag.key.toLowerCase().includes(termo)) return false;
      if (estadoFiltro === 'habilitados' && !flag.enabled) return false;
      if (estadoFiltro === 'desabilitados' && flag.enabled) return false;
      return true;
    });
  }, [flags, busca, estadoFiltro]);

  // ────────────────────────────────────────────────────────────────────
  // Toggle flag (optimistic + rollback + toast feedback)
  // ────────────────────────────────────────────────────────────────────

  const handleToggle = useCallback(
    async (key: string, enabled: boolean) => {
      const prev = flags.find((f) => f.key === key)?.enabled;
      dispatch({ type: 'optimistic_toggle', key, enabled });
      await atualizar(
        key,
        { enabled },
        {
          onSuccess: () => {
            toast.success(`Flag "${key}" atualizada.`);
          },
          onError: (message) => {
            toast.error(message);
          },
          onRollback: () => {
            if (prev !== undefined) {
              dispatch({ type: 'optimistic_toggle', key, enabled: prev });
            }
          },
        }
      );
    },
    [atualizar, flags, toast]
  );

  // ────────────────────────────────────────────────────────────────────
  // Modal de override
  // ────────────────────────────────────────────────────────────────────

  const handleOpenOverrides = useCallback(
    async (key: string) => {
      setModalFlagKey(key);
      try {
        await overridesState.buscar();
        const found = overridesState.overrides.find((o) => o.scope !== 'GLOBAL');
        if (found) {
          setExistingOverrides({
            [key]: {
              id: found.id,
              scope: found.scope,
              scopeId: found.scopeId ?? null,
            },
          });
        }
      } catch {
        // erros tratados pelo hook
      }
    },
    [overridesState]
  );

  const handleSubmitOverride = useCallback(
    async (payload: OverrideSubmitPayload) => {
      if (!modalFlagKey) return;
      const result = await adicionar(modalFlagKey, payload, {
        onSuccess: () => toast.success('Override adicionado.'),
        onError: (message) => toast.error(message),
      });
      if (result) {
        setModalFlagKey(null);
        void carregar();
      }
    },
    [modalFlagKey, adicionar, carregar, toast]
  );

  const handleDeleteOverride = useCallback(
    async (id: string) => {
      if (!modalFlagKey) return;
      const ok = await remover(modalFlagKey, id, {
        onSuccess: () => toast.success('Override removido.'),
        onError: (message) => toast.error(message),
      });
      if (ok) {
        setModalFlagKey(null);
        setExistingOverrides({});
        void carregar();
      }
    },
    [modalFlagKey, remover, carregar, toast]
  );

  // ────────────────────────────────────────────────────────────────────
  // Modal de criação de flag (RF-ADM-FF-03)
  // ────────────────────────────────────────────────────────────────────

  const handleSubmitCriar = useCallback(
    async (payload: CriarFlagSubmitPayload): Promise<void> => {
      await criar(payload, {
        onSuccess: () => {
          toast.success(`Flag "${payload.key}" criada.`);
          setModalCriarAberto(false);
          void carregar();
        },
        onError: (message) => {
          toast.error(message);
        },
      });
    },
    [criar, carregar, toast]
  );

  // ────────────────────────────────────────────────────────────────────
  // Audit log
  // ────────────────────────────────────────────────────────────────────

  const carregarAudit = useCallback(async (key: string) => {
    setAuditFlagKey(key);
    setAuditLoading(true);
    try {
      const response = await fetch(`/api/v1/admin/feature-flags/${key}/audit?limit=50`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`Erro ${response.status}`);
      const body = (await response.json()) as { data?: AuditEntry[] };
      setAuditEntries(body.data ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('PainelFeatureFlags', 'Falha ao carregar audit', { message });
      setAuditEntries([]);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  // ────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Feature Flags</h1>
          <p className={styles.subtitle}>Gerencie flags, escopos e auditoria de mudanças.</p>
        </div>
        <button
          type="button"
          className={styles.primaryBtn}
          data-testid="btn-criar-flag"
          onClick={() => setModalCriarAberto(true)}
          disabled={role !== 'owner'}
          title={role === 'owner' ? undefined : 'Apenas owner pode criar flags'}
        >
          Nova flag
        </button>
      </header>

      {role === 'manager' && (
        <p className={styles.rbacBanner} role="status">
          Você está em modo leitura. Apenas owner pode editar flags e overrides.
        </p>
      )}

      <FiltrosFeatureFlags
        busca={busca}
        estado={estadoFiltro}
        onBuscaChange={setBusca}
        onEstadoChange={setEstadoFiltro}
      />

      {error && (
        <div className={styles.errorBanner} role="alert">
          <span>Erro ao carregar flags: {error}</span>
          <button type="button" onClick={carregar} className={styles.retryBtn}>
            Tentar novamente
          </button>
        </div>
      )}

      {loading ? (
        <p className={styles.loading} aria-busy="true" aria-live="polite">
          Carregando feature flags…
        </p>
      ) : (
        <TabelaFeatureFlags
          flags={flagsFiltradas}
          role={role}
          onToggle={handleToggle}
          onManageOverrides={handleOpenOverrides}
          onViewAudit={(k) => void carregarAudit(k)}
        />
      )}

      {modalFlagKey && (
        <ModalOverrideFeatureFlag
          open
          flagKey={modalFlagKey}
          onClose={() => {
            setModalFlagKey(null);
            setExistingOverrides({});
          }}
          onSubmit={handleSubmitOverride}
          onDelete={handleDeleteOverride}
          role={role}
          existingOverride={existingOverrides[modalFlagKey]}
        />
      )}

      {modalCriarAberto && (
        <ModalCriarFlag
          open
          role={role}
          onClose={() => setModalCriarAberto(false)}
          onSubmit={handleSubmitCriar}
        />
      )}

      {auditFlagKey && (
        <section className={styles.auditSection} aria-label="Histórico de alterações">
          <header className={styles.auditHeader}>
            <h2 className={styles.auditTitle}>
              Histórico — <code>{auditFlagKey}</code>
            </h2>
            <button
              type="button"
              onClick={() => {
                setAuditFlagKey(null);
                setAuditEntries([]);
              }}
              className={styles.secondaryBtn}
            >
              Fechar histórico
            </button>
          </header>
          {auditLoading ? (
            <p className={styles.loading} aria-busy="true">
              Carregando histórico…
            </p>
          ) : (
            <AuditLogViewer entries={auditEntries} />
          )}
        </section>
      )}
    </div>
  );
}
