'use client';

/**
 * Filtros para a tabela de feature flags.
 * - Busca por chave (substring case-insensitive).
 * - Filtro por escopo (todos | habilitados | desabilitados).
 *
 * Acessibilidade:
 *  - `<label>` associado a cada input.
 *  - Estado de filtro anunciado via `aria-live`.
 */
import { useId } from 'react';

import styles from './FiltrosFeatureFlags.module.css';

export type FiltroEstado = 'todos' | 'habilitados' | 'desabilitados';

export interface FiltrosFeatureFlagsProps {
  busca: string;
  estado: FiltroEstado;
  onBuscaChange: (value: string) => void;
  onEstadoChange: (value: FiltroEstado) => void;
}

export function FiltrosFeatureFlags({
  busca,
  estado,
  onBuscaChange,
  onEstadoChange,
}: FiltrosFeatureFlagsProps) {
  const buscaId = useId();
  const estadoId = useId();

  return (
    <div className={styles.wrapper} role="search" aria-label="Filtros de feature flags">
      <div className={styles.field}>
        <label htmlFor={buscaId} className={styles.label}>
          Buscar por chave
        </label>
        <input
          id={buscaId}
          type="search"
          value={busca}
          onChange={(e) => onBuscaChange(e.target.value)}
          placeholder="ex.: pix_enabled"
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={estadoId} className={styles.label}>
          Estado
        </label>
        <select
          id={estadoId}
          value={estado}
          onChange={(e) => onEstadoChange(e.target.value as FiltroEstado)}
          className={styles.select}
        >
          <option value="todos">Todos</option>
          <option value="habilitados">Habilitados</option>
          <option value="desabilitados">Desabilitados</option>
        </select>
      </div>
    </div>
  );
}
