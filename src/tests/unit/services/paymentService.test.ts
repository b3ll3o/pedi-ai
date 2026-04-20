import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mock fetch ──────────────────────────────────────────────────

const mockFetch = vi.fn()
global.fetch = mockFetch

// ── Types ───────────────────────────────────────────────────────

interface PixPaymentResult {
  qrCode: string
  qrCodeImage: string
  expiresAt: string
  paymentId: string
}

interface StripePaymentIntentResult {
  clientSecret: string
  paymentIntentId: string
}

interface WebhookResult {
  processed: boolean
  orderId?: string
  status?: string
}

// ── Mock payment service (mirrors expected implementation) ─────

async function createPixPayment(orderId: string, amount: number): Promise<PixPaymentResult> {
  const response = await fetch('/api/payments/pix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, amount }),
  })
  if (!response.ok) throw new Error('Failed to create PIX payment')
  return response.json()
}

async function createStripePaymentIntent(
  orderId: string,
  amount: number
): Promise<StripePaymentIntentResult> {
  const response = await fetch('/api/payments/stripe/create-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, amount }),
  })
  if (!response.ok) throw new Error('Failed to create Stripe payment intent')
  return response.json()
}

async function handleWebhook(payload: Record<string, unknown>): Promise<WebhookResult> {
  const response = await fetch('/api/webhooks/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error('Webhook processing failed')
  return response.json()
}

// ── Tests ──────────────────────────────────────────────────────

describe('paymentService', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('createPixPayment', () => {
    it('creates payment correctly', async () => {
      const mockResult: PixPaymentResult = {
        qrCode: '00020101021226800014br.gov.bcb.pix2566qrcodes@pix.example.com520400005303986540410000.005802BR5925PEDI RESTAURANT6009SAO PAULO62140510simple_test6304',
        qrCodeImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        paymentId: 'pix_123456',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      })

      const result = await createPixPayment('order_abc123', 5000)

      expect(result).toEqual(mockResult)
      expect(result.paymentId).toBe('pix_123456')
      expect(result.qrCode).toBeDefined()
      expect(result.qrCodeImage).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith('/api/payments/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: 'order_abc123', amount: 5000 }),
      })
    })

    it('throws on payment failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'PIX service unavailable' }),
      })

      await expect(createPixPayment('order_fail', 5000)).rejects.toThrow(
        'Failed to create PIX payment'
      )
    })
  })

  describe('createStripePaymentIntent', () => {
    it('creates intent correctly', async () => {
      const mockResult: StripePaymentIntentResult = {
        clientSecret: 'pi_123456_secret_abcdef',
        paymentIntentId: 'pi_123456',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      })

      const result = await createStripePaymentIntent('order_xyz789', 7500)

      expect(result).toEqual(mockResult)
      expect(result.clientSecret).toBe('pi_123456_secret_abcdef')
      expect(result.paymentIntentId).toBe('pi_123456')
      expect(mockFetch).toHaveBeenCalledWith('/api/payments/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: 'order_xyz789', amount: 7500 }),
      })
    })

    it('throws on intent creation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Stripe API error' }),
      })

      await expect(createStripePaymentIntent('order_fail', 7500)).rejects.toThrow(
        'Failed to create Stripe payment intent'
      )
    })
  })

  describe('handleWebhook', () => {
    it('processes valid webhook', async () => {
      const mockPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_webhook_123',
            amount: 5000,
            metadata: { orderId: 'order_webhook_test' },
          },
        },
      }

      const mockResult: WebhookResult = {
        processed: true,
        orderId: 'order_webhook_test',
        status: 'paid',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      })

      const result = await handleWebhook(mockPayload)

      expect(result.processed).toBe(true)
      expect(result.orderId).toBe('order_webhook_test')
      expect(result.status).toBe('paid')
      expect(mockFetch).toHaveBeenCalledWith('/api/webhooks/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockPayload),
      })
    })

    it('throws on webhook processing failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid signature' }),
      })

      await expect(
        handleWebhook({ type: 'invalid', data: {} })
      ).rejects.toThrow('Webhook processing failed')
    })
  })
})