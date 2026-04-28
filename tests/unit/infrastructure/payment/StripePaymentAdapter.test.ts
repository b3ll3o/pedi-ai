import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StripeAdapter } from '@/infrastructure/external/StripeAdapter'

describe('StripeAdapter', () => {
  let stripeAdapter: StripeAdapter

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('criarPaymentIntent', () => {
    it('deve criar Stripe PaymentIntent com valor e currency válidos', async () => {
      // Arrange
      const valorEmCentavos = 5000 // R$ 50,00
      const pedidoId = 'pedido-123'
      stripeAdapter = new StripeAdapter('fake-secret-key')

      // Act
      const resultado = await stripeAdapter.criarPaymentIntent(valorEmCentavos, pedidoId)

      // Assert
      expect(resultado).toBeDefined()
      expect(resultado.id).toContain('pi_')
      expect(resultado.clientSecret).toBeDefined()
      expect(resultado.valor).toBe(5000)
      expect(resultado.status).toBe('requires_payment_method')
    })

    it('deve retornar clientSecret do Stripe', async () => {
      // Arrange
      const valorEmCentavos = 2500 // R$ 25,00
      const pedidoId = 'pedido-456'
      stripeAdapter = new StripeAdapter('fake-secret-key')

      // Act
      const resultado = await stripeAdapter.criarPaymentIntent(valorEmCentavos, pedidoId)

      // Assert
      expect(resultado.clientSecret).toBeDefined()
      expect(resultado.clientSecret).toContain('pi_')
      expect(resultado.clientSecret).toContain('secret')
    })

    it('deve incluir ID do pedido no ID da PaymentIntent', async () => {
      // Arrange
      const valorEmCentavos = 1000
      const pedidoId = 'pedido-teste-789'
      stripeAdapter = new StripeAdapter()

      // Act
      const resultado = await stripeAdapter.criarPaymentIntent(valorEmCentavos, pedidoId)

      // Assert
      expect(resultado.id).toContain(pedidoId)
    })

    it('deve funcionar com valor mínimo (1 centavo)', async () => {
      // Arrange
      const valorMinimo = 1
      const pedidoId = 'pedido-minimo'
      stripeAdapter = new StripeAdapter()

      // Act
      const resultado = await stripeAdapter.criarPaymentIntent(valorMinimo, pedidoId)

      // Assert
      expect(resultado).toBeDefined()
      expect(resultado.valor).toBe(1)
      expect(resultado.status).toBe('requires_payment_method')
    })

    it('deve funcionar sem secretKey (usa env var)', async () => {
      // Arrange
      stripeAdapter = new StripeAdapter()

      // Act
      const resultado = await stripeAdapter.criarPaymentIntent(1000, 'pedido-sem-chave')

      // Assert
      expect(resultado).toBeDefined()
      expect(resultado.id).toContain('pedido-sem-chave')
    })
  })

  describe('tratamento de erros', () => {
    it('deve lidar com valores muito grandes', async () => {
      // Arrange
      const valorGrande = 999999999 // ~10 milhões de reais
      const pedidoId = 'pedido-grande'
      stripeAdapter = new StripeAdapter()

      // Act
      const resultado = await stripeAdapter.criarPaymentIntent(valorGrande, pedidoId)

      // Assert
      expect(resultado).toBeDefined()
      expect(resultado.valor).toBe(999999999)
    })

    it('deve retornar PaymentIntent com estrutura correta em caso de erro', async () => {
      // Arrange
      stripeAdapter = new StripeAdapter()

      // Act
      const resultado = await stripeAdapter.criarPaymentIntent(500, 'pedido-erro')

      // Assert
      expect(resultado).toHaveProperty('id')
      expect(resultado).toHaveProperty('clientSecret')
      expect(resultado).toHaveProperty('valor')
      expect(resultado).toHaveProperty('status')

      // Verifica que não são vazios
      expect(resultado.id).toBeTruthy()
      expect(resultado.clientSecret).toBeTruthy()
    })
  })
})
