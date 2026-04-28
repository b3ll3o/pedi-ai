import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PixAdapter } from '@/infrastructure/external/PixAdapter'

describe('PixAdapter', () => {
  let pixAdapter: PixAdapter

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('criarCobranca', () => {
    it('deve criar cobrança Pix com valor e ID do pedido válidos', async () => {
      // Arrange
      const valorEmCentavos = 5000 // R$ 50,00
      const pedidoId = 'pedido-123'
      pixAdapter = new PixAdapter('fake-token', 'https://api.mercadopago.com')

      // Act
      const resultado = await pixAdapter.criarCobranca(valorEmCentavos, pedidoId)

      // Assert
      expect(resultado).toBeDefined()
      expect(resultado.id).toContain(pedidoId)
      expect(resultado.valor).toBe(50) // Convertido de centavos para reais
      expect(resultado.imagemQrCode).toBeDefined()
      expect(resultado.codigoPix).toContain(pedidoId)
      expect(resultado.expiracao).toBeInstanceOf(Date)
    })

    it('deve retornar cobrança com id, valor, imagemQrCode e codigoPix', async () => {
      // Arrange
      const valorEmCentavos = 2500 // R$ 25,00
      const pedidoId = 'pedido-456'
      pixAdapter = new PixAdapter('fake-token')

      // Act
      const resultado = await pixAdapter.criarCobranca(valorEmCentavos, pedidoId)

      // Assert
      expect(resultado).toHaveProperty('id')
      expect(resultado).toHaveProperty('valor')
      expect(resultado).toHaveProperty('imagemQrCode')
      expect(resultado).toHaveProperty('codigoPix')
      expect(resultado).toHaveProperty('expiracao')

      // Verifica que não são vazios
      expect(resultado.id).toBeTruthy()
      expect(resultado.imagemQrCode).toBeTruthy()
      expect(resultado.codigoPix).toBeTruthy()
    })

    it('deve definir expiração para 30 minutos no futuro', async () => {
      // Arrange
      const valorEmCentavos = 1000
      const pedidoId = 'pedido-expiracao'
      pixAdapter = new PixAdapter()
      const antes = new Date()

      // Act
      const resultado = await pixAdapter.criarCobranca(valorEmCentavos, pedidoId)
      const depois = new Date()

      // Assert
      const diffMs = resultado.expiracao.getTime() - antes.getTime()
      const diffEsperado = 30 * 60 * 1000 // 30 minutos em ms

      // A expiração deve ser aproximadamente 30 minutos no futuro (com margem de 1 segundo)
      expect(diffMs).toBeGreaterThanOrEqual(diffEsperado - 1000)
      expect(diffMs).toBeLessThanOrEqual(diffEsperado + 1000 + (depois.getTime() - antes.getTime()))
    })
  })

  describe('verificarStatus', () => {
    it('deve retornar cobrança com ID fornecido', async () => {
      // Arrange
      const cobrancaId = 'pix_pedido-123_1234567890'
      pixAdapter = new PixAdapter()

      // Act
      const resultado = await pixAdapter.verificarStatus(cobrancaId)

      // Assert
      expect(resultado).toBeDefined()
      expect(resultado.id).toBe(cobrancaId)
      expect(resultado.expiracao).toBeInstanceOf(Date)
    })

    it('deve retornar cobrança com campos vazios para simulação de status pendente', async () => {
      // Arrange
      const cobrancaId = 'pix_teste_999'
      pixAdapter = new PixAdapter()

      // Act
      const resultado = await pixAdapter.verificarStatus(cobrancaId)

      // Assert
      expect(resultado.id).toBe(cobrancaId)
      expect(resultado.valor).toBe(0)
      expect(resultado.imagemQrCode).toBe('')
      expect(resultado.codigoPix).toBe('')
    })
  })

  describe('tratamento de erros', () => {
    it('deve lidar com valores muito grandes', async () => {
      // Arrange
      const valorGrande = 999999999 // ~10 milhões de reais
      const pedidoId = 'pedido-grande'
      pixAdapter = new PixAdapter()

      // Act
      const resultado = await pixAdapter.criarCobranca(valorGrande, pedidoId)

      // Assert
      expect(resultado).toBeDefined()
      expect(resultado.valor).toBe(999999999 / 100)
    })

    it('deve funcionar sem accessToken (usa env var ou default)', async () => {
      // Arrange
      pixAdapter = new PixAdapter(undefined, 'https://api.mercadopago.com')

      // Act
      const resultado = await pixAdapter.criarCobranca(1000, 'pedido-sem-token')

      // Assert
      expect(resultado).toBeDefined()
      expect(resultado.id).toContain('pedido-sem-token')
    })

    it('deve funcionar com valor mínimo (1 centavo)', async () => {
      // Arrange
      const valorMinimo = 1
      const pedidoId = 'pedido-minimo'
      pixAdapter = new PixAdapter()

      // Act
      const resultado = await pixAdapter.criarCobranca(valorMinimo, pedidoId)

      // Assert
      expect(resultado).toBeDefined()
      expect(resultado.valor).toBe(0.01)
    })
  })
})
