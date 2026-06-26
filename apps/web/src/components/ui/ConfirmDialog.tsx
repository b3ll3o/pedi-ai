'use client';

import { useRef } from 'react';

import { useFocusTrap } from '@/lib/a11y/use-focus-trap';

import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Substituto acessível para `window.confirm()`. Bloqueia foco dentro
 * do modal, fecha em Esc, devolve foco ao trigger.
 *
 * S3#7: substituir `confirm()` nativo do browser em fluxos admin
 * (Table/User). O nativo bloqueia thread, não é estilizável, não
 * respeita prefers-reduced-motion, e é ignorado em alguns browsers
 * mobile (Safari iOS mostra toolbar que quebra o layout).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, open, onCancel);

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={containerRef}
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
      >
        <h3 id="confirm-dialog-title" className={styles.title}>
          {title}
        </h3>
        <p id="confirm-dialog-desc" className={styles.description}>
          {description}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={destructive ? styles.confirmDestructive : styles.confirm}
            onClick={onConfirm}
            disabled={isLoading}
            autoFocus
          >
            {isLoading ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
