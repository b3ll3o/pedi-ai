'use client';

import type { KitchenOrder } from '@/hooks/useKitchenOrders';
import styles from './KitchenDisplay.module.css';

interface KitchenDisplayProps {
  pendingOrders: KitchenOrder[];
  preparingOrders: KitchenOrder[];
  readyOrders: KitchenOrder[];
  isConnected: boolean;
  onAcceptOrder: (orderId: string) => void;
  onMarkReady: (orderId: string) => void;
  onViewDetails: (orderId: string) => void;
}

export function KitchenDisplay({
  pendingOrders,
  preparingOrders,
  readyOrders,
  isConnected,
  onAcceptOrder,
  onMarkReady,
  onViewDetails,
}: KitchenDisplayProps) {
  const renderOrderCard = (order: KitchenOrder, showAccept: boolean = false) => (
    <div
      key={order.id}
      data-testid={`kitchen-order-card-${order.id}`}
      className={`${styles.orderCard} ${order.is_stale ? styles.stale : ''}`}
      onClick={() => onViewDetails(order.id)}
    >
      <div className={styles.cardHeader}>
        <span className={styles.orderId}>#{order.id.slice(0, 8)}</span>
        <span className={styles.tableName} data-testid={`kitchen-order-table-${order.id}`}>
          {order.table?.name || `Mesa ${order.table?.number}` || '-'}
        </span>
      </div>

      <div className={styles.items}>
        {order.items?.slice(0, 3).map((item) => (
          <div key={item.id} className={styles.item}>
            <span className={styles.itemQty}>{item.quantity}x</span>
            <span className={styles.itemName}>#{item.product_id.slice(-6)} - Item</span>
          </div>
        ))}
        {order.items && order.items.length > 3 && (
          <span className={styles.moreItems}>+{order.items.length - 3} mais</span>
        )}
      </div>

      <div className={styles.cardFooter}>
        <span className={`${styles.age} ${order.is_stale ? styles.ageStale : ''}`}>
          ⏱️ {order.age_display}
        </span>
        <div className={styles.cardActions}>
          {showAccept && (
            <button
              type="button"
              data-testid={`kitchen-preparing-button-${order.id}`}
              className={styles.acceptBtn}
              onClick={(e) => {
                e.stopPropagation();
                onAcceptOrder(order.id);
              }}
            >
              ✓ Aceitar
            </button>
          )}
          {order.status === 'preparing' && (
            <button
              type="button"
              data-testid={`kitchen-ready-button-${order.id}`}
              className={styles.readyBtn}
              onClick={(e) => {
                e.stopPropagation();
                onMarkReady(order.id);
              }}
            >
              ✓ Pronto
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.container} data-testid="kitchen-display">
      <div className={styles.header}>
        <h1 className={styles.title}>🏠 Kitchen Display</h1>
        <div
          className={`${styles.connectionStatus} ${isConnected ? styles.connected : styles.disconnected}`}
        >
          {isConnected ? '🟢 Online' : '🔴 Offline'}
        </div>
      </div>

      <div className={styles.columns}>
        {/* Pending Orders */}
        <div className={styles.column}>
          <h2 className={styles.columnTitle}>
            📋 Novos Pedidos
            <span className={styles.count}>{pendingOrders.length}</span>
          </h2>
          <div className={styles.orderList} data-testid="kitchen-orders-list">
            {pendingOrders.length === 0 ? (
              <div className={styles.emptyColumn}>Nenhum pedido pendente</div>
            ) : (
              pendingOrders.map((order) => renderOrderCard(order, true))
            )}
          </div>
        </div>

        {/* Preparing Orders */}
        <div className={styles.column}>
          <h2 className={styles.columnTitle}>
            🔥 Preparando
            <span className={styles.count}>{preparingOrders.length}</span>
          </h2>
          <div className={styles.orderList} data-testid="kitchen-orders-list">
            {preparingOrders.length === 0 ? (
              <div className={styles.emptyColumn}>Nenhum pedido em preparo</div>
            ) : (
              preparingOrders.map((order) => renderOrderCard(order))
            )}
          </div>
        </div>

        {/* Ready Orders */}
        <div className={styles.column}>
          <h2 className={styles.columnTitle}>
            ✅ Prontos
            <span className={styles.count}>{readyOrders.length}</span>
          </h2>
          <div className={styles.orderList} data-testid="kitchen-orders-list">
            {readyOrders.length === 0 ? (
              <div className={styles.emptyColumn}>Nenhum pedido pronto</div>
            ) : (
              readyOrders.map((order) => renderOrderCard(order))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
