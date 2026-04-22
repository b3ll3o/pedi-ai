"use client"

import { CheckCircle } from "lucide-react"

interface OrderConfirmationProps {
  orderId: string
  estimatedTime?: number // minutes
}

export function OrderConfirmation({ orderId, estimatedTime }: OrderConfirmationProps) {
  return (
    <div className="flex flex-col items-center gap-4 p-6 text-center">
      <CheckCircle className="h-16 w-16 text-green-500" />
      <h2 className="text-2xl font-bold">Pedido realizado com sucesso!</h2>
      <p className="text-muted-foreground" data-testid="order-id">Pedido #{orderId}</p>
      {estimatedTime != null && (
        <p className="text-muted-foreground">Tempo estimado: {estimatedTime} min</p>
      )}
      <p className="text-sm text-muted-foreground">Aguarde a confirmação no seu pedido</p>
    </div>
  )
}
