'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { OrderWithItems, OrderStatus } from '@/application/services/adminOrderService';

import styles from './OrderDetailAdmin.module.css';

interface OrderDetailAdminProps {
  order: OrderWithItems;
  onUpdateStatus: (orderId: string, status: OrderStatus, notes?: string) => void;
  onCancel: (orderId: string, reason?: string) => void;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Aguardando Pagamento',
  paid: 'Pago',
  preparing: 'Preparando',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: '#f59e0b',
  paid: '#3b82f6',
  preparing: '#8b5cf6',
  ready: '#10b981',
  delivered: '#059669',
  cancelled: '#ef4444',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  refunded: 'Reembolsado',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

function getNextStatus(orderStatus: OrderStatus): OrderStatus | null {
  switch (orderStatus) {
    case 'pending_payment':
      return 'paid';
    case 'paid':
      return 'preparing';
    case 'preparing':
      return 'ready';
    case 'ready':
      return 'delivered';
    default:
      return null;
  }
}

function PaymentMethodDisplay({ method }: { method: string | null | undefined }) {
  const label = method ? PAYMENT_METHOD_LABELS[method] : null;
  return <span>{label || method || '-'}</span>;
}

function PaymentStatusDisplay({ status }: { status: string | null | undefined }) {
  const label = status ? PAYMENT_STATUS_LABELS[status] : null;
  return <span>{label || 'Falhou'}</span>;
}

function OrderItemsList({ items }: { items: OrderWithItems['items'] }) {
  if (!items || items.length === 0) {
    return <p className={styles.noItems}>Nenhum item encontrado</p>;
  }

  return (
    <div className={styles.itemsList}>
      {items.map((item: any) => (
        <div key={item.id} className={styles.item}>
          <div className={styles.itemInfo}>
            <span className={styles.itemQuantity}>{item.quantity}x</span>
            <span className={styles.itemName}>#{item.product_id.slice(-6)} - Item</span>
          </div>
          <span className={styles.itemPrice}>{formatPrice(item.unit_price * item.quantity)}</span>
        </div>
      ))}
    </div>
  );
}

function OrderTotals({ subtotal, tax, total }: { subtotal: number; tax: number; total: number }) {
  return (
    <div className={styles.totals}>
      <div className={styles.totalRow}>
        <span>Subtotal:</span>
        <span>{formatPrice(subtotal)}</span>
      </div>
      <div className={styles.totalRow}>
        <span>Taxa:</span>
        <span>{formatPrice(tax)}</span>
      </div>
      <div className={`${styles.totalRow} ${styles.grandTotal}`}>
        <span>Total:</span>
        <span>{formatPrice(total)}</span>
      </div>
    </div>
  );
}

function StatusHistoryList({ history }: { history: OrderWithItems['status_history'] }) {
  if (!history || history.length === 0) return null;

  return (
    <div className={styles.historyList}>
      {history.map((entry: any) => (
        <div key={entry.id} className={styles.historyItem}>
          <span
            className={styles.historyStatus}
            style={{ color: STATUS_COLORS[entry.status as OrderStatus] }}
          >
            {STATUS_LABELS[entry.status as OrderStatus]}
          </span>
          <span className={styles.historyDate}>{formatDate(entry.created_at)}</span>
          {entry.notes && <span className={styles.historyNotes}>{entry.notes}</span>}
        </div>
      ))}
    </div>
  );
}

function CancelModal({
  show,
  cancelReason,
  onReasonChange,
  onCancel,
  onConfirm,
  isUpdating,
}: {
  show: boolean;
  cancelReason: string;
  onReasonChange: (reason: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isUpdating: boolean;
}) {
  if (!show) return null;

  return (
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
          onChange={(e) => onReasonChange(e.target.value)}
          rows={3}
        />
        <div className={styles.modalActions}>
          <button type="button" className={styles.modalCancel} onClick={onCancel}>
            Voltar
          </button>
          <button
            type="button"
            className={styles.modalConfirm}
            onClick={onConfirm}
            disabled={isUpdating}
          >
            {isUpdating ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OrderDetailAdmin({ order, onUpdateStatus, onCancel }: OrderDetailAdminProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const handleUpdateStatus = async () => {
    const nextStatus = getNextStatus(order.status as OrderStatus);
    if (!nextStatus) return;

    setIsUpdating(true);
    try {
      await onUpdateStatus(order.id, nextStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = async () => {
    setIsUpdating(true);
    try {
      await onCancel(order.id, cancelReason || undefined);
      setShowCancelModal(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const nextStatus = getNextStatus(order.status as OrderStatus);
  const canCancel = order.status !== 'cancelled' && order.status !== 'delivered';

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
            style={{ backgroundColor: STATUS_COLORS[order.status as OrderStatus] }}
          >
            {STATUS_LABELS[order.status as OrderStatus]}
          </span>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainSection}>
          {/* Order Items */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Itens do Pedido</h2>
            <OrderItemsList items={order.items} />
          </div>

          {/* Order Totals */}
          <div className={styles.section}>
            <OrderTotals subtotal={order.subtotal} tax={order.tax} total={order.total} />
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
                  <PaymentMethodDisplay method={order.payment_method} />
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Status Pagamento</span>
                <span className={styles.infoValue}>
                  <PaymentStatusDisplay status={order.payment_status} />
                </span>
              </div>
            </div>
          </div>

          {/* Status History */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Histórico</h2>
            <StatusHistoryList history={order.status_history} />
          </div>

          {/* Actions */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Ações</h2>
            <div className={styles.actions}>
              {nextStatus && (
                <button
                  type="button"
                  className={styles.updateButton}
                  onClick={handleUpdateStatus}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Atualizando...' : `Marcar como ${STATUS_LABELS[nextStatus]}`}
                </button>
              )}
              {canCancel && (
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
      <CancelModal
        show={showCancelModal}
        cancelReason={cancelReason}
        onReasonChange={setCancelReason}
        onCancel={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        isUpdating={isUpdating}
      />
    </div>
  );
}
