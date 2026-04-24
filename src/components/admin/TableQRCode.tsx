'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { tables } from '@/lib/supabase/types';
import styles from './TableQRCode.module.css';

interface TableQRCodeProps {
  table: tables;
  qrData?: string;
  onClose: () => void;
  onDownload?: () => void;
}

interface QrPayload {
  restaurant_id: string;
  table_id: string;
  timestamp: number;
  signature: string;
}

export function TableQRCode({
  table,
  qrData,
  onClose,
  onDownload,
}: TableQRCodeProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate QR code image URL from qrData
  useEffect(() => {
    if (!qrData) return;

    const generateQrUrl = async () => {
      try {
        const payload: QrPayload = JSON.parse(qrData);
        // Create a URL-encoded string for the QR code
        // The QR code should contain restaurant_id:table_id:timestamp:signature
        const qrContent = `${payload.restaurant_id}:${payload.table_id}:${payload.timestamp}:${payload.signature}`;
        // Use Google Charts API to generate QR code
        const encodedData = encodeURIComponent(qrContent);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}&format=png&margin=10`;
        setQrImageUrl(qrUrl);
      } catch (error) {
        console.error('Error parsing QR data:', error);
      }
    };
    generateQrUrl();
  }, [qrData]);

  const handleDownload = useCallback(async () => {
    if (!qrImageUrl) return;

    setIsDownloading(true);
    try {
      // Fetch the QR code image
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mesa-${table.number}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      onDownload?.();
    } catch (error) {
      console.error('Erro ao baixar QR code:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [qrImageUrl, table.number, onDownload]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>

        <h2 id="qr-modal-title" className={styles.title}>
          QR Code da Mesa {table.number}
        </h2>

        {table.name && <p className={styles.subtitle}>{table.name}</p>}

        <div className={styles.qrContainer}>
          {qrImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrImageUrl}
              alt={`QR Code da Mesa ${table.number}`}
              className={styles.qrImage}
              width={200}
              height={200}
            />
          ) : (
            <div className={styles.qrPlaceholder}>
              <span className={styles.qrIcon}>📱</span>
              <span className={styles.qrText}>QR Code</span>
            </div>
          )}
        </div>

        <div className={styles.instructions}>
          <p>
            Este QR Code pode ser escaneado pelos clientes para acessar o
            cardápio digital desta mesa.
          </p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.downloadButton}
            onClick={handleDownload}
            disabled={!qrImageUrl || isDownloading}
          >
            {isDownloading ? 'Baixando...' : 'Baixar QR Code'}
          </button>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}