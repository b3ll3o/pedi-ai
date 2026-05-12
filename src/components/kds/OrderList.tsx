'use client'

import type { PedidoKDS } from '@/hooks/usePedidosKDS'
import { OrderCard } from './OrderCard'
import styles from './OrderList.module.css'

interface OrderListProps {
  orders: PedidoKDS[]
  selectedStatus: PedidoKDS['status'] | 'all'
  onAcceptOrder?: (orderId: string) => void
  onMarkReady?: (orderId: string) => void
  onViewDetails?: (orderId: string) => void
}

const STATUS_COLUMNS: Record<string, { title: string; icon: string }> = {
  paid: { title: 'Novos Pedidos', icon: '📋' },
  preparing: { title: 'Preparando', icon: '🔥' },
  ready: { title: 'Prontos', icon: '✅' },
}

export function OrderList({
  orders,
  selectedStatus,
  onAcceptOrder,
  onMarkReady,
  onViewDetails,
}: OrderListProps) {
  const filteredOrders =
    selectedStatus === 'all'
      ? orders
      : orders.filter((o) => o.status === selectedStatus)

  const ordersByStatus = {
    paid: filteredOrders.filter((o) => o.status === 'paid'),
    preparing: filteredOrders.filter((o) => o.status === 'preparing'),
    ready: filteredOrders.filter((o) => o.status === 'ready'),
  }

  const renderColumn = (
    status: keyof typeof STATUS_COLUMNS,
    orders: PedidoKDS[]
  ) => {
    const columnInfo = STATUS_COLUMNS[status]
    const showAcceptButton = status === 'paid'

    return (
      <section
        key={status}
        className={styles.column}
        aria-labelledby={`kds-column-${status}`}
      >
        <header className={styles.columnHeader}>
          <h2 id={`kds-column-${status}`} className={styles.columnTitle}>
            <span aria-hidden="true">{columnInfo.icon}</span>
            {columnInfo.title}
          </h2>
          <span
            className={styles.count}
            aria-label={`${orders.length} pedidos`}
          >
            {orders.length}
          </span>
        </header>
        <div
          className={styles.orderList}
          data-testid={`kds-orders-list-${status}`}
          role="list"
          aria-label={`Pedidos ${columnInfo.title}`}
        >
          {orders.length === 0 ? (
            <div className={styles.emptyColumn}>
              Nenhum pedido
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} role="listitem">
                <OrderCard
                  order={order}
                  showAcceptButton={showAcceptButton}
                  onAccept={onAcceptOrder}
                  onMarkReady={onMarkReady}
                  onClick={onViewDetails}
                />
              </div>
            ))
          )}
        </div>
      </section>
    )
  }

  if (selectedStatus !== 'all') {
    const statusOrders = ordersByStatus[selectedStatus as keyof typeof ordersByStatus] || []
    return (
      <div className={styles.container}>
        <div className={styles.columns}>
          <section
            className={styles.column}
            aria-labelledby={`kds-column-${selectedStatus}`}
          >
            <header className={styles.columnHeader}>
              <h2 id={`kds-column-${selectedStatus}`} className={styles.columnTitle}>
                <span aria-hidden="true">
                  {STATUS_COLUMNS[selectedStatus]?.icon}
                </span>
                {STATUS_COLUMNS[selectedStatus]?.title}
              </h2>
              <span className={styles.count} aria-label={`${statusOrders.length} pedidos`}>
                {statusOrders.length}
              </span>
            </header>
            <div
              className={styles.orderList}
              data-testid={`kds-orders-list-${selectedStatus}`}
              role="list"
              aria-label={`Pedidos ${STATUS_COLUMNS[selectedStatus]?.title}`}
            >
              {statusOrders.length === 0 ? (
                <div className={styles.emptyColumn}>Nenhum pedido</div>
              ) : (
                statusOrders.map((order) => (
                  <div key={order.id} role="listitem">
                    <OrderCard
                      order={order}
                      showAcceptButton={selectedStatus === 'paid'}
                      onAccept={onAcceptOrder}
                      onMarkReady={onMarkReady}
                      onClick={onViewDetails}
                    />
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.columns}>
        {Object.entries(ordersByStatus).map(([status, statusOrders]) =>
          renderColumn(status as keyof typeof STATUS_COLUMNS, statusOrders)
        )}
      </div>
    </div>
  )
}