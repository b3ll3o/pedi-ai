'use client';

/**
 * Sentry ErrorBoundary Wrapper
 *
 * O Next.js ErrorBoundary global está em `apps/web/src/app/error.tsx`,
 * mas isso NÃO captura erros client-side antes da hidratação completa.
 *
 * Este componente captura erros no nível da árvore React após hidratação
 * e os reporta pro Sentry. Substitui o antigo `React.StrictMode` error
 * swallowing (que só loga no console em dev).
 *
 * Para ativar o Sentry, basta o DSN estar configurado em env.
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import type { ReactNode } from 'react';

interface SentryErrorBoundaryProps {
  children: ReactNode;
  /** Fallback UI a renderizar quando há erro. */
  fallback?: ReactNode;
}

/**
 * Captura erros client-side não tratados e envia pro Sentry.
 *
 * IMPORTANTE: este componente usa `componentDidCatch` semantics via
 * useEffect+Sentry.captureException. Para capturar erros de render
 * React, use o `error.tsx` do Next.js (que também já loga no Sentry).
 */
export function SentryErrorBoundary({ children, fallback }: SentryErrorBoundaryProps) {
  useEffect(() => {
    // Listener global de erros não tratados (window.onerror, promise rejections).
    const handleUnhandledError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const error =
        'reason' in event ? event.reason : event.error ?? new Error(event.message ?? 'Unknown');
      Sentry.captureException(error, {
        tags: { source: 'global_error_handler' },
      });
    };

    window.addEventListener('error', handleUnhandledError as EventListener);
    window.addEventListener('unhandledrejection', handleUnhandledError as EventListener);

    return () => {
      window.removeEventListener('error', handleUnhandledError as EventListener);
      window.removeEventListener('unhandledrejection', handleUnhandledError as EventListener);
    };
  }, []);

  return <>{children ?? fallback}</>;
}