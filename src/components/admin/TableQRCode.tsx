'use client'

import { useState, useCallback } from 'react'
import type { tables } from '@/lib/supabase/types'
import styles from './TableQRCode.module.css'

interface TableQRCodeProps {
  table: tables
  qrData?: string
  onClose: () => void
  onDownload?: () => void
}

export function TableQRCode({
  table,
  qrData,
  onClose,
  onDownload,
}: TableQRCodeProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = useCallback(async () => {
    if (!qrData) return

    setIsDownloading(true)
    try {
      // In a real implementation, this would generate an actual QR code image
      // For now, we'll create a data URL that can be downloaded
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')

      // Set canvas size
      canvas.width = 300
      canvas.height = 300

      // Draw white background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw QR-like pattern (placeholder)
      ctx.fillStyle = '#000000'
      const cellSize = 10
      const margin = 30
      const data = JSON.parse(qrData)

      // Draw position markers (3 corners)
      const drawPositionMarker = (x: number, y: number) => {
        // Outer square
        ctx.fillRect(x, y, cellSize * 7, cellSize * 7)
        // Inner white
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5)
        // Inner square
        ctx.fillStyle = '#000000'
        ctx.fillRect(x + cellSize * 2, y + cellSize * 2, cellSize * 3, cellSize * 3)
      }

      drawPositionMarker(margin, margin)
      drawPositionMarker(canvas.width - margin - cellSize * 7, margin)
      drawPositionMarker(margin, canvas.height - margin - cellSize * 7)

      // Draw table info text
      ctx.fillStyle = '#000000'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`Mesa ${table.number}`, canvas.width / 2, canvas.height - 20)

      // Create download link
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `mesa-${table.number}-qr.png`
      link.href = dataUrl
      link.click()

      onDownload?.()
    } catch (error) {
      console.error('Error downloading QR code:', error)
    } finally {
      setIsDownloading(false)
    }
  }, [qrData, table.number, onDownload])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>

        <h2 className={styles.title}>QR Code da Mesa {table.number}</h2>

        {table.name && (
          <p className={styles.subtitle}>{table.name}</p>
        )}

        <div className={styles.qrContainer}>
          <div className={styles.qrPlaceholder}>
            <span className={styles.qrIcon}>📱</span>
            <span className={styles.qrText}>QR Code</span>
          </div>
        </div>

        <div className={styles.instructions}>
          <p>Este QR Code pode ser escaneado pelos clientes para acessar o cardápio digital desta mesa.</p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.downloadButton}
            onClick={handleDownload}
            disabled={!qrData || isDownloading}
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
      </div>
    </div>
  )
}
