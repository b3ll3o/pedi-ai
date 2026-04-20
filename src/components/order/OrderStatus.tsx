"use client"

import { useEffect, useState, useCallback } from "react"
import { CheckCircle, Clock, ChefHat, Bell, Truck, XCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Enum_order_status, order_status_history } from "@/lib/supabase/types"

interface OrderStatusProps {
  orderId: string
}

const STATUS_CONFIG: Record<Enum_order_status, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: "Pendente", icon: Clock, color: "text-yellow-500" },
  confirmed: { label: "Confirmado", icon: CheckCircle, color: "text-blue-500" },
  preparing: { label: "Preparando", icon: ChefHat, color: "text-orange-500" },
  ready: { label: "Pronto", icon: Bell, color: "text-green-500" },
  delivered: { label: "Entregue", icon: Truck, color: "text-green-600" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "text-red-500" },
}

const STATUS_ORDER: Enum_order_status[] = ["pending", "confirmed", "preparing", "ready", "delivered"]

export function OrderStatus({ orderId }: OrderStatusProps) {
  const supabase = createClient()
  const [currentStatus, setCurrentStatus] = useState<Enum_order_status | null>(null)
  const [history, setHistory] = useState<order_status_history[]>([])
  const [loading, setLoading] = useState(true)

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true })
    if (data) setHistory(data as order_status_history[])
  }, [supabase, orderId])

  const loadCurrentStatus = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single()
    if (data) setCurrentStatus(data.status as Enum_order_status)
  }, [supabase, orderId])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([loadCurrentStatus(), loadHistory()])
      setLoading(false)
    }
    init()

    const channel = supabase
      .channel(`order:${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setCurrentStatus(payload.new.status as Enum_order_status)
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_status_history",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          setHistory((prev) => [...prev, payload.new as order_status_history])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId, supabase, loadCurrentStatus, loadHistory])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  if (!currentStatus) return null

  const currentIndex = STATUS_ORDER.indexOf(currentStatus)
  const isActive = (index: number) =>
    currentStatus === "cancelled"
      ? false
      : index <= currentIndex

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Current Status */}
      <div className="flex flex-col items-center gap-3 text-center">
        {(() => {
          const config = STATUS_CONFIG[currentStatus]
          const Icon = config.icon
          return (
            <>
              <div className={`relative flex h-16 w-16 items-center justify-center rounded-full bg-muted ${config.color}`}>
                <Icon className="h-8 w-8" />
              </div>
              <div>
                <p className="text-lg font-semibold">{config.label}</p>
                <p className="text-sm text-muted-foreground">Pedido #{orderId}</p>
              </div>
            </>
          )
        })()}
      </div>

      {/* Timeline */}
      <div className="flex items-start justify-between gap-2 px-4">
        <div className="absolute inset-0 flex items-center">
          <div className="h-0.5 w-full bg-muted" />
          <div
            className="h-0.5 bg-green-500 transition-all"
            style={{ width: `${(currentIndex / (STATUS_ORDER.slice(0, -1).length - 1)) * 100}%` }}
          />
        </div>
        {STATUS_ORDER.slice(0, -1).map((status, index) => {
          const config = STATUS_CONFIG[status]
          const Icon = config.icon
          const active = isActive(index)
          return (
            <div key={status} className="z-10 flex flex-col items-center gap-1">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  active ? config.color : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-xs ${active ? "text-foreground" : "text-muted-foreground"}`}>
                {config.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="flex flex-col gap-2 border-t pt-4">
          <h3 className="text-sm font-medium">Histórico</h3>
          <div className="flex flex-col gap-2">
            {history.map((entry) => {
              const config = STATUS_CONFIG[entry.status]
              const Icon = config.icon
              return (
                <div key={entry.id} className="flex items-center gap-3 text-sm">
                  <span className={config.color}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>{config.label}</span>
                  {entry.notes && <span className="text-muted-foreground">— {entry.notes}</span>}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
