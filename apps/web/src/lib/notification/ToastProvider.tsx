'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

import { ToastViewport } from './ToastViewport';

export type ToastSeverity = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  severity: ToastSeverity;
  message: string;
  durationMs: number;
}

export interface ToastOptions {
  durationMs?: number;
}

export interface ToastApi {
  toasts: Toast[];
  success: (message: string, opts?: ToastOptions) => string;
  error: (message: string, opts?: ToastOptions) => string;
  info: (message: string, opts?: ToastOptions) => string;
  warning: (message: string, opts?: ToastOptions) => string;
  dismiss: (id: string) => void;
}

type State = Toast[];
type Action = { type: 'add'; toast: Toast } | { type: 'remove'; id: string };

const DEFAULT_DURATION_MS = 5000;
const MAX_VISIBLE = 5;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add': {
      const next = [...state, action.toast];
      return next.length > MAX_VISIBLE ? next.slice(-MAX_VISIBLE) : next;
    }
    case 'remove':
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

export const ToastContext = createContext<ToastApi | null>(null);

let counter = 0;
function makeId(): string {
  counter += 1;
  return `toast-${Date.now().toString(36)}-${counter}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, []);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    dispatch({ type: 'remove', id });
  }, []);

  const push = useCallback(
    (severity: ToastSeverity, message: string, opts?: ToastOptions): string => {
      const id = makeId();
      const durationMs = opts?.durationMs ?? DEFAULT_DURATION_MS;
      dispatch({ type: 'add', toast: { id, severity, message, durationMs } });
      if (durationMs > 0) {
        const timer = setTimeout(() => dismiss(id), durationMs);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss]
  );

  // Cleanup timers ao desmontar
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      toasts,
      success: (m, o) => push('success', m, o),
      error: (m, o) => push('error', m, o),
      info: (m, o) => push('info', m, o),
      warning: (m, o) => push('warning', m, o),
      dismiss,
    }),
    [toasts, push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
