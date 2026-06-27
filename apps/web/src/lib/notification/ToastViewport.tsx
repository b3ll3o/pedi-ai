'use client';

import type { Toast } from './ToastProvider';
import styles from './ToastViewport.module.css';

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className={styles.viewport} data-testid="toast-viewport" aria-label="Notificações">
      {toasts.map((t) => {
        const role = t.severity === 'error' || t.severity === 'warning' ? 'alert' : 'status';
        const ariaLive =
          t.severity === 'error' || t.severity === 'warning' ? 'assertive' : 'polite';
        return (
          <div
            key={t.id}
            className={`${styles.toast} ${styles[t.severity]}`}
            data-testid={`toast-${t.severity}`}
            role={role}
            aria-live={ariaLive}
          >
            <span className={styles.message}>{t.message}</span>
            <button
              type="button"
              className={styles.closeBtn}
              aria-label="Fechar notificação"
              onClick={() => onDismiss(t.id)}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
