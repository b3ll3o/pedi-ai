"use client"

import { useEffect, useState } from "react"
import { useTableStore } from "@/stores/tableStore"
import type { order_items, order_status_history } from "@/lib/supabase/types"

interface OrderDetailProps {
  orderId: string
  onReorder: () => void
}

interface OrderItem extends Omit<order_items, "created_at"> {
  productName?: string
}

interface StatusHistoryEntry extends Omit<order_status_history, "order_id"> {
  created_at: string
}

interface OrderData {
  id: string
  status: string
  payment_status: string
  items: OrderItem[]
  status_history: StatusHistoryEntry[]
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "text-yellow-500" },
  confirmed: { label: "Confirmado", color: "text-blue-500" },
  preparing: { label: "Preparando", color: "text-orange-500" },
  ready: { label: "Pronto", color: "text-green-500" },
  delivered: { label: "Entregue", color: "text-green-600" },
  cancelled: { label: "Cancelado", color: "text-red-500" },
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price)
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString))
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className ?? ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
  )
}

function ReorderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function ChefHatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
      <line x1="6" x2="18" y1="17" y2="17" />
    </svg>
  )
}

function UtensilsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  )
}

const STATUS_ICONS: Record<string, React.FC<{ className?: string }>> = {
  pending: ClockIcon,
  confirmed: CheckIcon,
  preparing: ChefHatIcon,
  ready: UtensilsIcon,
  delivered: CheckIcon,
  cancelled: XIcon,
}

export function OrderDetail({ orderId, onReorder }: OrderDetailProps) {
  const [order, setOrder] = useState<OrderData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const restaurantId = useTableStore((state) => state.restaurantId)

  useEffect(() => {
    async function fetchOrder() {
      if (!restaurantId) {
        setError("Restaurant ID not found")
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(
          `/api/orders/${orderId}?restaurant_id=${restaurantId}`
        )

        if (!response.ok) {
          throw new Error("Failed to fetch order")
        }

        const data: OrderData = await response.json()
        setOrder(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, restaurantId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <SpinnerIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <XIcon className="h-12 w-12 text-red-500" />
        <p className="text-muted-foreground">
          {error || "Failed to load order details"}
        </p>
      </div>
    )
  }

  const currentStatusConfig = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
  const StatusIcon = STATUS_ICONS[order.status] ?? STATUS_ICONS.pending

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Pedido #{order.id.slice(0, 8)}</h2>
          <span className={`flex items-center gap-1 text-sm font-medium ${currentStatusConfig.color}`}>
            <StatusIcon className="h-4 w-4" />
            {currentStatusConfig.label}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDate(order.created_at)}
        </p>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Itens do Pedido
        </h3>
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-medium">
                  {item.productName || `Produto ${item.product_id.slice(0, 8)}`}
                </span>
                <span className="text-sm text-muted-foreground">
                  {item.quantity}x {formatPrice(item.unit_price)}
                </span>
                {item.notes && (
                  <span className="text-xs text-muted-foreground italic">
                    Obs: {item.notes}
                  </span>
                )}
              </div>
              <span className="font-medium">
                {formatPrice(item.total_price)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Status History Timeline */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Histórico de Status
        </h3>
        <div className="relative border-l-2 border-muted pl-4">
          {order.status_history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum histórico disponível
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {order.status_history.map((entry, index) => {
                const config = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.pending
                const Icon = STATUS_ICONS[entry.status] ?? STATUS_ICONS.pending
                const isLast = index === order.status_history.length - 1

                return (
                  <div key={entry.id} className="relative">
                    {/* Timeline dot */}
                    <div
                      className={`absolute -left-6 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background ${config.color} ${isLast ? "" : "opacity-50"}`}
                    >
                      <Icon className="h-2.5 w-2.5" />
                    </div>

                    <div className="flex flex-col">
                      <span className={`font-medium ${isLast ? "" : "text-muted-foreground"}`}>
                        {config.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(entry.created_at)}
                      </span>
                      {entry.notes && (
                        <span className="mt-1 text-sm text-muted-foreground">
                          {entry.notes}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reorder Button */}
      <button
        onClick={onReorder}
        className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        type="button"
      >
        <ReorderIcon className="h-4 w-4" />
        Fazer Novo Pedido
      </button>
    </div>
  )
}
