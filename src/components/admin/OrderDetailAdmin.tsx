'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { OrderWithItems, OrderStatus } from '@/services/adminOrderService'
import styles from './OrderDetailAdmin.module.css'

interface OrderDetailAdminProps {
  order: OrderWithItems
  onUpdateStatus: (orderId: string, status: OrderStatus, notes?: string) => void
  onCancel: (orderId: string, reason?: string) => void
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  preparing: '#8b5cf6',
  ready: '#10b981',
  delivered: '#059669',
  cancelled: '#ef4444',
}

export function OrderDetailAdmin({
  order,
  onUpdateStatus,
  onCancel,
}: OrderDetailAdminProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  const getNextStatus = (): OrderStatus | null => {
    switch (order.status) {
      case 'pending':
        return 'confirmed'
      case 'confirmed':
        return 'preparing'
      case 'preparing':
        return 'ready'
      case 'ready':
        return 'delivered'
      default:
        return null
    }
  }

  const handleUpdateStatus = async () => {
    const nextStatus = getNextStatus()
    if (!nextStatus) return

    setIsUpdating(true)
    try {
      await onUpdateStatus(order.id, nextStatus)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancel = async () => {
    setIsUpdating(true)
    try {
      await onCancel(order.id, cancelReason || undefined)
      setShowCancelModal(false)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/admin/pedidos" className={styles.backLink}>
          ← Voltar para pedidos
        </Link>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Pedido #{order.id.slice(0, 8)}</h1>
          <span
            className={styles.statusBadge}
            style={{ backgroundColor: STATUS_COLORS[order.status] }}
          >
            {STATUS_LABELS[order.status]}
          </span>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainSection}>
          {/* Order Items */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Itens do Pedido</h2>
            <div className={styles.itemsList}>
              {order.items?.map((item) => (
                <div key={item.id} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemQuantity}>{item.quantity}x</span>
                    <span className={styles.itemName}>
                      {item.product?.name || 'Produto não encontrado'}
                    </span>
                  </div>
                  <span className={styles.itemPrice}>
                    {formatPrice(item.total_price)}
                  </span>
                </div>
              ))}
            </div>
            {(!order.items || order.items.length === 0) && (
              <p className={styles.noItems}>Nenhum item encontrado</p>
            )}
          </div>

          {/* Order Totals */}
          <div className={styles.section}>
            <div className={styles.totals}>
              <div className={styles.totalRow}>
                <span>Subtotal:</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className={styles.totalRow}>
                <span>Taxa:</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
              <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                <span>Total:</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.sideSection}>
          {/* Order Info */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Informações</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Mesa</span>
                <span className={styles.infoValue}>
                  {order.table?.name || `Mesa ${order.table?.number}` || '-'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Data/Hora</span>
                <span className={styles.infoValue}>{formatDate(order.created_at)}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Pagamento</span>
                <span className={styles.infoValue}>
                  {order.payment_method === 'pix' ? 'PIX' :
                   order.payment_method === 'credit_card' ? 'Cartão de Crédito' :
                   order.payment_method === 'debit_card' ? 'Cartão de Débito' :
                   order.payment_method || '-'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Status Pagamento</span>
                <span className={styles.infoValue}>
                  {order.payment_status === 'pending' ? 'Pendente' :
                   order.payment_status === 'paid' ? 'Pago' :
                   order.payment_status === 'refunded' ? 'Reembolsado' : 'Falhou'}
                </span>
              </div>
            </div>
          </div>

          {/* Status History */}
          {order.status_history && order.status_history.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Histórico</h2>
              <div className={styles.historyList}>
                {order.status_history.map((entry) => (
                  <div key={entry.id} className={styles.historyItem}>
                    <span
                      className={styles.historyStatus}
                      style={{ color: STATUS_COLORS[entry.status as OrderStatus] }}
                    >
                      {STATUS_LABELS[entry.status as OrderStatus]}
                    </span>
                    <span className={styles.historyDate}>
                      {formatDate(entry.created_at)}
                    </span>
                    {entry.notes && (
                      <span className={styles.historyNotes}>{entry.notes}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Ações</h2>
            <div className={styles.actions}>
              {getNextStatus() && (
                <button
                  type="button"
                  className={styles.updateButton}
                  onClick={handleUpdateStatus}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Atualizando...' : `Marcar como ${STATUS_LABELS[getNextStatus()!]}`}
                </button>
              )}
              {order.status !== 'cancelled' && order.status !== 'delivered' && (
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowCancelModal(true)}
                  disabled={isUpdating}
                >
                  Cancelar Pedido
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Cancelar Pedido</h3>
            <p className={styles.modalText}>
              Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita.
            </p>
            <textarea
              className={styles.cancelReason}
              placeholder="Motivo do cancelamento (opcional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancel}
                onClick={() => setShowCancelModal(false)}
              >
                Voltar
              </button>
              <button
                type="button"
                className={styles.modalConfirm}
                onClick={handleCancel}
                disabled={isUpdating}
              >
                {isUpdating ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
