'use client'

import styles from './ConnectionStatus.module.css'

interface ConnectionStatusProps {
  isConnected: boolean
  latency?: number | null
  variant?: 'inline' | 'badge' | 'banner'
}

export function ConnectionStatus({
  isConnected,
  latency,
  variant = 'inline',
}: ConnectionStatusProps) {
  if (variant === 'badge') {
    return (
      <span className={`${styles.badge} ${isConnected ? styles.connected : styles.disconnected}`}>
        {isConnected ? '🟢 Online' : '🔴 Offline'}
      </span>
    )
  }

  if (variant === 'banner') {
    return (
      <div className={`${styles.banner} ${isConnected ? styles.connected : styles.disconnected}`}>
        <span className={styles.bannerIcon}>
          {isConnected ? '✓' : '✕'}
        </span>
        <span className={styles.bannerText}>
          {isConnected
            ? latency !== null && latency !== undefined
              ? `Conectado (${latency}ms)`
              : 'Conectado'
            : 'Sem conexão - tentando reconectar...'}
        </span>
      </div>
    )
  }

  return (
    <div className={`${styles.inline} ${isConnected ? styles.connected : styles.disconnected}`}>
      <span className={styles.dot} />
      <span className={styles.text}>
        {isConnected
          ? latency !== null && latency !== undefined
            ? `Online (${latency}ms)`
            : 'Online'
          : 'Offline'}
      </span>
    </div>
  )
}
