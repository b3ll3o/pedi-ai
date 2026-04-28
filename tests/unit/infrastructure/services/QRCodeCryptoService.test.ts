import { describe, it, expect, beforeEach } from 'vitest'
import { QRCodeCryptoService } from '@/infrastructure/services/QRCodeCryptoService'

describe('QRCodeCryptoService', () => {
  let service: QRCodeCryptoService

  beforeEach(() => {
    service = new QRCodeCryptoService()
  })

  describe('gerarAssinatura', () => {
    it('deve gerar assinatura HMAC-SHA256', () => {
      const assinatura = service.gerarAssinatura(
        '550e8400-e29b-41d4-a716-446655440000',
        '660e8400-e29b-41d4-a716-446655440001',
        'secret-key'
      )

      expect(assinatura).toBeDefined()
      expect(typeof assinatura).toBe('string')
      expect(assinatura.length).toBe(64) // SHA256 hex = 64 chars
    })

    it('deve gerar mesma assinatura para mesmos parâmetros', () => {
      const sig1 = service.gerarAssinatura('rest-1', 'mesa-1', 'secret')
      const sig2 = service.gerarAssinatura('rest-1', 'mesa-1', 'secret')

      expect(sig1).toBe(sig2)
    })

    it('deve gerar assinaturas diferentes para segredos diferentes', () => {
      const sig1 = service.gerarAssinatura('rest-1', 'mesa-1', 'secret-1')
      const sig2 = service.gerarAssinatura('rest-1', 'mesa-1', 'secret-2')

      expect(sig1).not.toBe(sig2)
    })

    it('deve gerar assinaturas diferentes para mesas diferentes', () => {
      const sig1 = service.gerarAssinatura('rest-1', 'mesa-1', 'secret')
      const sig2 = service.gerarAssinatura('rest-1', 'mesa-2', 'secret')

      expect(sig1).not.toBe(sig2)
    })
  })

  describe('validarAssinatura', () => {
    it('deve retornar true para assinatura válida', () => {
      const restaurantId = '550e8400-e29b-41d4-a716-446655440000'
      const mesaId = '660e8400-e29b-41d4-a716-446655440001'
      const secret = 'my-secret-key'

      const assinatura = service.gerarAssinatura(restaurantId, mesaId, secret)

      const payload = {
        restauranteId: restaurantId,
        mesaId: mesaId,
        assinatura: assinatura,
      }

      expect(service.validarAssinatura(payload, secret)).toBe(true)
    })

    it('deve retornar false para assinatura inválida', () => {
      const payload = {
        restauranteId: '550e8400-e29b-41d4-a716-446655440000',
        mesaId: '660e8400-e29b-41d4-a716-446655440001',
        assinatura: 'assinatura-invalida-que-nao-corresponde',
      }

      expect(service.validarAssinatura(payload, 'secret')).toBe(false)
    })

    it('deve retornar false para segredo errado', () => {
      const restaurantId = '550e8400-e29b-41d4-a716-446655440000'
      const mesaId = '660e8400-e29b-41d4-a716-446655440001'

      const assinatura = service.gerarAssinatura(restaurantId, mesaId, 'correct-secret')

      const payload = {
        restauranteId: restaurantId,
        mesaId: mesaId,
        assinatura: assinatura,
      }

      expect(service.validarAssinatura(payload, 'wrong-secret')).toBe(false)
    })
  })
})
