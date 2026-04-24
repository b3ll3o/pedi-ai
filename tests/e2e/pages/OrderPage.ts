import { Page, Locator, expect } from '@playwright/test'
import { createClient, RealtimeChannel } from '@supabase/supabase-js'

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

export class OrderPage {
  readonly page: Page
  readonly orderId: Locator
  readonly orderStatus: Locator
  readonly orderItems: Locator
  readonly orderTotal: Locator
  readonly paymentStatus: Locator
  readonly qrCode: Locator
  readonly statusTimeline: Locator
  readonly cancelButton: Locator
  readonly realtimeIndicator: Locator
  readonly connectionStatus: Locator

  private supabaseUrl: string
  private supabaseKey: string

  constructor(page: Page) {
    this.page = page
    this.orderId = page.locator('[data-testid="order-id"]')
    this.orderStatus = page.locator('[data-testid="order-status"]')
    this.orderItems = page.locator('[data-testid="order-item"]')
    this.orderTotal = page.locator('[data-testid="order-total"]')
    this.paymentStatus = page.locator('[data-testid="payment-status"]')
    this.qrCode = page.locator('[data-testid="order-qr-code"]')
    this.statusTimeline = page.locator('[data-testid="status-timeline"]')
    this.cancelButton = page.locator('[data-testid="cancel-order-button"]')
    this.realtimeIndicator = page.locator('[data-testid="realtime-indicator"]')
    this.connectionStatus = page.locator('[data-testid="connection-status"]')

    // Configurações do Supabase via variáveis de ambiente
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    this.supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  }

  async goto(orderId: string): Promise<void> {
    await this.page.goto(`/order/${orderId}`)
  }

  async getOrderIdValue(): Promise<string> {
    return (await this.orderId.textContent()) ?? ''
  }

  async getStatus(): Promise<OrderStatus> {
    const statusText = await this.orderStatus.textContent()
    return (statusText?.toLowerCase().trim() as OrderStatus) ?? 'pending'
  }

  async waitForStatus(status: OrderStatus, timeout = 60_000): Promise<void> {
    await expect(this.orderStatus).toHaveText(new RegExp(status, 'i'), { timeout })
  }

  /**
   * Aguarda atualização de status via Realtime ou polling fallback.
   * Usa Supabase realtime channel com postgres_changes filter.
   * Fallback: polling a cada 2s se realtime falhar.
   */
  async waitForRealtimeStatus(status: OrderStatus, timeout = 60_000): Promise<void> {
    const restaurantId = await this.getRestaurantIdFromPage()
    if (!restaurantId) {
      // Fallback para polling se não conseguir restaurantId
      await this.pollForStatus(status, timeout)
      return
    }

    try {
      await this.waitForRealtimeUpdate(status, restaurantId, timeout)
    } catch {
      // Fallback: polling a cada 2s
      await this.pollForStatus(status, timeout)
    }
  }

  private async getRestaurantIdFromPage(): Promise<string | null> {
    // Tenta obter restaurantId da URL ou do contexto da página
    const url = this.page.url()
    const match = url.match(/\/order\/([^\/]+)/)
    if (match) {
      // Tentar buscar do localStorage ou context
      return this.page.evaluate(() => {
        return localStorage.getItem('restaurantId')
      }) as Promise<string | null>
    }
    return null
  }

  private async waitForRealtimeUpdate(
    status: OrderStatus,
    restaurantId: string,
    timeout: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        channel.unsubscribe()
        reject(new Error(`Timeout esperando status ${status} via realtime`))
      }, timeout)

      const channel: RealtimeChannel = {
        topic: `orders-${restaurantId}`,
        subscribe: () => {},
        unsubscribe: () => {},
        on: () => channel,
        send: () => Promise.resolve(),
      }

      // Criar cliente Supabase para realtime
      const supabase = createClient(this.supabaseUrl, this.supabaseKey)

      const subscription = supabase
        .channel(`orders-${restaurantId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          (payload) => {
            const newStatus = payload.new?.status
            if (newStatus?.toLowerCase() === status.toLowerCase()) {
              clearTimeout(timeoutId)
              subscription.unsubscribe()
              resolve()
            }
          }
        )
        .subscribe()

      // Guardar referência para cleanup
      ;(this as unknown as { _realtimeSubscription: { unsubscribe: () => void } })._realtimeSubscription = subscription
    })
  }

  private async pollForStatus(status: OrderStatus, timeout: number): Promise<void> {
    const intervalMs = 2000
    const maxAttempts = Math.floor(timeout / intervalMs)
    let attempts = 0

    while (attempts < maxAttempts) {
      const currentStatus = await this.getStatus()
      if (currentStatus.toLowerCase() === status.toLowerCase()) {
        return
      }
      await this.page.waitForTimeout(intervalMs)
      attempts++
    }

    throw new Error(`Status ${status} não encontrado após ${timeout}ms de polling`)
  }

  async getItems(): Promise<string[]> {
    const count = await this.orderItems.count()
    const items: string[] = []
    for (let i = 0; i < count; i++) {
      items.push(await this.orderItems.nth(i).textContent() ?? '')
    }
    return items
  }

  async getTotal(): Promise<string> {
    return (await this.orderTotal.textContent()) ?? ''
  }

  async isPaymentConfirmed(): Promise<boolean> {
    const status = await this.paymentStatus.textContent()
    return status?.toLowerCase().includes('confirm') ?? false
  }

  async cancelOrder(): Promise<void> {
    await this.cancelButton.click()
    await this.page.locator('[data-testid="confirm-cancel-button"]').click()
  }

  async getQRCode(): Promise<string> {
    const qrCodeSrc = await this.qrCode.getAttribute('src')
    return qrCodeSrc ?? ''
  }

  /**
   * Verifica se indicador de conexão realtime está visível.
   */
  async isRealtimeConnected(): Promise<boolean> {
    await this.realtimeIndicator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    const status = await this.connectionStatus.textContent()
    return status?.toLowerCase().includes('conectado') ?? false
  }

  /**
   * Aguarda atualização da timeline sem page reload.
   */
  async waitForTimelineUpdate(timeout = 5000): Promise<void> {
    const initialTimeline = await this.statusTimeline.innerHTML()
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      await this.page.waitForTimeout(500)
      const currentTimeline = await this.statusTimeline.innerHTML()
      if (currentTimeline !== initialTimeline) {
        return
      }
    }

    throw new Error('Timeline não foi atualizada')
  }
}