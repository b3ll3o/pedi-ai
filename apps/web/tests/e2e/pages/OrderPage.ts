import { Page, Locator, expect } from '@playwright/test'
import { io, Socket } from 'socket.io-client'

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

  private socket: Socket | null = null

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
   * Aguarda atualização de status via Socket.io realtime.
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
      await this.waitForSocketIOUpdate(status, restaurantId, timeout)
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

  private async waitForSocketIOUpdate(
    status: OrderStatus,
    restaurantId: string,
    timeout: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.socket?.disconnect()
        reject(new Error(`Timeout esperando status ${status} via Socket.io`))
      }, timeout)

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

      this.socket = io(apiUrl, {
        transports: ['websocket'],
        autoConnect: true,
      })

      this.socket.on('connect', () => {
        this.socket?.emit('joinRestaurant', { restaurantId })
      })

      this.socket.on('orderUpdate', (data: { orderId: string; status: string }) => {
        if (data.status.toLowerCase() === status.toLowerCase()) {
          clearTimeout(timeoutId)
          this.socket?.disconnect()
          resolve()
        }
      })

      this.socket.on('connect_error', () => {
        clearTimeout(timeoutId)
        this.socket?.disconnect()
        reject(new Error('Socket.io connection failed'))
      })
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