'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './PixQRCode.module.css';

export interface PixQRCodeProps {
  orderId: string;
  qrCode: string;
  qrCodeBase64: string;
  expiresAt: Date;
  onPaymentConfirmed: () => void;
  onExpired: () => void;
}

type QRState = 'loading' | 'ready' | 'expired' | 'paid';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const TIMEOUT_SECONDS = 60;

export function PixQRCode({
  qrCode,
  qrCodeBase64,
  expiresAt,
  onPaymentConfirmed,
  onExpired,
}: PixQRCodeProps) {
  const [state, setState] = useState<QRState>('loading');
  const [timeLeft, setTimeLeft] = useState(0);

  const calculateTimeLeft = useCallback(() => {
    const now = new Date();
    const diff = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
    return Math.min(diff, TIMEOUT_SECONDS);
  }, [expiresAt]);

  useEffect(() => {
    // Simulate QR code generation delay
    const timer = setTimeout(() => {
      setTimeLeft(TIMEOUT_SECONDS);
      setState('ready');
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (state !== 'ready') return;

    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 1;
      const remaining = Math.max(0, TIMEOUT_SECONDS - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setState('expired');
        onExpired();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state, onExpired]);

  // Expose state change for parent to call onPaymentConfirmed
  useEffect(() => {
    if (state === 'paid') {
      onPaymentConfirmed();
    }
  }, [state, onPaymentConfirmed]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(qrCode);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = qrCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  if (state === 'loading') {
    return (
      <div className={styles.container} data-testid="pix-qr-code">
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span className={styles.loadingText}>Gerando QR Code...</span>
        </div>
      </div>
    );
  }

  if (state === 'paid') {
    return (
      <div className={styles.container} data-testid="pix-qr-code">
        <div className={styles.paid}>
          <div className={styles.checkmark}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className={styles.paidText}>Pagamento confirmado!</span>
          <span className={styles.paidSubtext}>Aguarde a confirmação do estabelecimento</span>
        </div>
      </div>
    );
  }

  const isExpired = state === 'expired';

  return (
    <div className={styles.container} data-testid="pix-qr-code">
      <div className={`${styles.qrWrapper} ${isExpired ? styles.qrExpired : ''}`}>
        <img
          src={qrCodeBase64}
          alt="QR Code PIX"
          className={styles.qrImage}
        />
        {isExpired && (
          <div className={styles.expiredOverlay}>
            <span className={styles.expiredText}>QR expirado</span>
          </div>
        )}
      </div>

      {!isExpired && (
        <>
          <div className={styles.timer}>
            <svg className={styles.timerIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className={styles.timerText}>Expira em {formatTime(timeLeft)}</span>
          </div>

          <div className={styles.actions}>
            <button onClick={handleCopyCode} className={styles.copyButton}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copiar código PIX
            </button>
          </div>
        </>
      )}

      {isExpired && (
        <div className={styles.expiredMessage}>
          <span>Este QR Code não é mais válido.</span>
          <span>Solicite um novo pagamento ao estabelecimento.</span>
        </div>
      )}
    </div>
  );
}