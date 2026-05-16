'use client';

import { useState } from 'react';
import type { KitchenOrder } from '@/hooks/useKitchenOrders';
import styles from './OrderNotification.module.css';

interface OrderNotificationProps {
  order: KitchenOrder;
  onAccept: () => void;
  onReject: () => void;
  onDismiss: () => void;
}

export function OrderNotification({
  order,
  onAccept,
  onReject,
  onDismiss,
}: OrderNotificationProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleAccept = () => {
    setIsAnimating(true);
    setTimeout(() => {
      onAccept();
    }, 300);
  };

  const handleReject = () => {
    setIsAnimating(true);
    setTimeout(() => {
      onReject();
    }, 300);
  };

  return (
    <div className={`${styles.notification} ${isAnimating ? styles.animating : ''}`}>
      <div className={styles.header}>
        <span className={styles.badge}>Novo Pedido</span>
        <button
          type="button"
          className={styles.dismissBtn}
          onClick={onDismiss}
          aria-label="Dispensar"
        >
          ×
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.orderInfo}>
          <span className={styles.orderId}>#{order.id.slice(0, 8)}</span>
          <span className={styles.tableName}>
            {order.table?.name || `Mesa ${order.table?.number}` || '-'}
          </span>
        </div>

        <div className={styles.items}>
          {order.items?.slice(0, 5).map((item) => (
            <div key={item.id} className={styles.item}>
              <span className={styles.itemQty}>{item.quantity}x</span>
              <span className={styles.itemName}>#{item.product_id.slice(-6)} - Item</span>
            </div>
          ))}
          {order.items && order.items.length > 5 && (
            <span className={styles.moreItems}>+{order.items.length - 5} mais</span>
          )}
        </div>

        <div className={styles.age}>⏱️ {order.age_display}</div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.rejectBtn} onClick={handleReject}>
          ✕ Recusar
        </button>
        <button type="button" className={styles.acceptBtn} onClick={handleAccept}>
          ✓ Aceitar
        </button>
      </div>
    </div>
  );
}
