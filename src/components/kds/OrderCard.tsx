'use client'

import type { PedidoKDS } from '@/hooks/usePedidosKDS'
import { Timer } from './Timer'
import styles from './OrderCard.module.css'

interface OrderCardProps {
  order: PedidoKDS
  showAcceptButton?: boolean
  onAccept?: (orderId: string) => void
  onMarkReady?: (orderId: string) => void
  onClick?: (orderId: string) => void
}

export function OrderCard({
  order,
  showAcceptButton = false,
  onAccept,
  onMarkReady,
  onClick,
}: OrderCardProps) {
  const handleClick = () => {
    onClick?.(order.id)
  }

  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAccept?.(order.id)
  }

  const handleMarkReady = (e: React.MouseEvent) => {
    e.stopPropagation()
    onMarkReady?.(order.id)
  }

  return (
    <article
      data-testid={`kds-order-card-${order.id}`}
      className={`${styles.card} ${order.is_stale ? styles.stale : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      <header className={styles.header}>
        <span className={styles.orderId}>#{order.id.slice(0, 8)}</span>
        <span
          className={styles.tableName}
          data-testid={`kds-order-table-${order.id}`}
        >
          {order.table?.name || `Mesa ${order.table?.number}` || '-'}
        </span>
      </header>

      <ul className={styles.items} aria-label="Itens do pedido">
        {order.items?.slice(0, 3).map((item) => (
          <li key={item.id} className={styles.item}>
            <span className={styles.itemQty}>{item.quantity}x</span>
            <span className={styles.itemName}>
              #{item.product_id.slice(-6)} - Item
            </span>
          </li>
        ))}
        {order.items && order.items.length > 3 && (
          <li className={styles.moreItems}>
            +{order.items.length - 3} mais
          </li>
        )}
      </ul>

      <footer className={styles.footer}>
        <Timer
          startTime={new Date(order.created_at)}
          staleThresholdSeconds={300}
        />
        <div className={styles.actions}>
          {showAcceptButton && (
            <button
              type="button"
              data-testid={`kds-preparing-button-${order.id}`}
              className={styles.acceptBtn}
              onClick={handleAccept}
            >
              ✓ Aceitar
            </button>
          )}
          {order.status === 'preparing' && (
            <button
              type="button"
              data-testid={`kds-ready-button-${order.id}`}
              className={styles.readyBtn}
              onClick={handleMarkReady}
            >
              ✓ Pronto
            </button>
          )}
        </div>
      </footer>
    </article>
  )
}