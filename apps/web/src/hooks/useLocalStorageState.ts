'use client';

/**
 * useLocalStorageState — Hook SSR-safe para estado persistido em localStorage.
 *
 * **POR QUE `useSyncExternalStore` em vez de `useState` + `useEffect`?**
 *
 * O padrão legado (ler localStorage dentro de `useEffect` e chamar `setState`)
 * dispara a regra `react-hooks/set-state-in-effect` (React 19 / Next 15+),
 * porque força um re-render desnecessário (cascading renders).
 *
 * `useSyncExternalStore` resolve isso calculando o estado **diretamente durante
 * o render** baseado no snapshot externo — sem effect, sem render extra.
 *
 * **SSR-safe:**
 * - `getServerSnapshot` retorna `initialValue` (sem localStorage).
 * - `getClientSnapshot` lê localStorage.
 * - Sem hydration mismatch (mesmo valor durante renderização inicial).
 *
 * **Tabela de versões:**
 * - Bump `VERSION` pra forçar reset do storage (útil quando o schema muda).
 *
 * @example
 * ```tsx
 * const [dismissed, setDismissed] = useLocalStorageState('banner_dismissed', false);
 * ```
 */

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_PREFIX = 'pedi:';

function buildKey(key: string, version: string | number): string {
  return `${STORAGE_PREFIX}${key}@v${version}`;
}

// Pub/sub em memória por chave — `useSyncExternalStore` precisa notificar os
// subscribers quando o storage muda (storage event só dispara entre tabs).
const keyListeners = new Map<string, Set<() => void>>();

function notifyKey(key: string): void {
  const listeners = keyListeners.get(key);
  if (!listeners) return;
  for (const cb of listeners) cb();
}

/**
 * Hook SSR-safe para ler/escrever estado em localStorage.
 *
 * @param key - Chave do storage (sem prefixo; será prefixada com `pedi:`).
 * @param initialValue - Valor inicial caso storage vazio ou indisponível.
 * @param version - Versão do schema; bump pra forçar reset.
 * @returns Tupla `[value, setValue]` similar a `useState`.
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
  version: string | number = '1'
): [T, (next: T | ((prev: T) => T)) => void] {
  const storageKey = buildKey(key, version);

  // Subscribe: registra listener pra essa chave + escuta mudanças cross-tab.
  const subscribe = useCallback(
    (notify: () => void) => {
      if (typeof window === 'undefined') return () => {};

      // Listener in-tab (dispatched via notifyKey no setValue).
      let set = keyListeners.get(storageKey);
      if (!set) {
        set = new Set();
        keyListeners.set(storageKey, set);
      }
      set.add(notify);

      // Listener cross-tab (StorageEvent).
      const handler = (event: StorageEvent) => {
        if (event.key === storageKey || event.key === null) {
          notify();
        }
      };
      window.addEventListener('storage', handler);

      return () => {
        window.removeEventListener('storage', handler);
        const listeners = keyListeners.get(storageKey);
        if (listeners) {
          listeners.delete(notify);
          if (listeners.size === 0) keyListeners.delete(storageKey);
        }
      };
    },
    [storageKey]
  );

  // Snapshot do servidor: SEMPRE retorna initialValue (evita hydration mismatch).
  const getServerSnapshot = useCallback(() => initialValue, [initialValue]);

  // Snapshot do client: lê do localStorage ou retorna initialValue.
  const getClientSnapshot = useCallback((): T => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === null) return initialValue;
      return JSON.parse(raw) as T;
    } catch {
      // Storage corrompido ou indisponível (modo privado, cookies bloqueados).
      return initialValue;
    }
  }, [storageKey, initialValue]);

  const value = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      if (typeof window === 'undefined') return;

      try {
        const current = getClientSnapshot();
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(current) : next;
        window.localStorage.setItem(storageKey, JSON.stringify(resolved));
        notifyKey(storageKey);
      } catch {
        // Storage cheio ou bloqueado — silencioso.
      }
    },
    [storageKey, getClientSnapshot]
  );

  return [value, setValue];
}
