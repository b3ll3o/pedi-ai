import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IQRCodeValidationService } from '@/domain/mesa/services/QRCodeValidationService'
import { QRCodePayload } from '@/domain/mesa/value-objects/QRCodePayload'

describe('QRCodeValidationService (interface contract)', () => {
  const mockService: IQRCodeValidationService = {
    validarAssinatura: vi.fn(),
    gerarAssinatura: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validarAssinatura', () => {
    it('deve retornar true para assinatura válida', () => {
      const payload = {
        restauranteId: 'rest-123',
        mesaId: 'mesa-456',
        assinatura: 'hmac-sha256-signature',
      }

      mockService.validarAssinatura.mockReturnValue(true)

      const result = mockService.validarAssinatura(payload, 'secret-key')

      expect(result).toBe(true)
      expect(mockService.validarAssinatura).toHaveBeenCalledWith(payload, 'secret-key')
    })

    it('deve retornar false para assinatura inválida', () => {
      const payload = {
        restauranteId: 'rest-123',
        mesaId: 'mesa-456',
        assinatura: 'invalid-signature',
      }

      mockService.validarAssinatura.mockReturnValue(false)

      const result = mockService.validarAssinatura(payload, 'wrong-secret')

      expect(result).toBe(false)
    })

    it('deve chamar com diferentes secrets', () => {
      const payload = {
        restauranteId: 'rest-123',
        mesaId: 'mesa-456',
        assinatura: 'hmac-signature',
      }

      mockService.validarAssinatura(payload, 'secret-1')
      mockService.validarAssinatura(payload, 'secret-2')

      expect(mockService.validarAssinatura).toHaveBeenCalledTimes(2)
      expect(mockService.validarAssinatura).toHaveBeenCalledWith(payload, 'secret-1')
      expect(mockService.validarAssinatura).toHaveBeenCalledWith(payload, 'secret-2')
    })
  })

  describe('gerarAssinatura', () => {
    it('deve gerar assinatura para restaurante e mesa', () => {
      mockService.gerarAssinatura.mockReturnValue('generated-hmac-signature')

      const result = mockService.gerarAssinatura('rest-123', 'mesa-456', 'secret')

      expect(result).toBe('generated-hmac-signature')
      expect(mockService.gerarAssinatura).toHaveBeenCalledWith('rest-123', 'mesa-456', 'secret')
    })

    it('deve gerar diferentes assinaturas para diferentes mesas', () => {
      mockService.gerarAssinatura
        .mockReturnValueOnce('signature-mesa-1')
        .mockReturnValueOnce('signature-mesa-2')

      const sig1 = mockService.gerarAssinatura('rest-1', 'mesa-1', 'secret')
      const sig2 = mockService.gerarAssinatura('rest-1', 'mesa-2', 'secret')

      expect(sig1).toBe('signature-mesa-1')
      expect(sig2).toBe('signature-mesa-2')
    })

    it('deve gerar diferentes assinaturas com diferentes secrets', () => {
      mockService.gerarAssinatura
        .mockReturnValueOnce('sig-with-secret-1')
        .mockReturnValueOnce('sig-with-secret-2')

      const sig1 = mockService.gerarAssinatura('rest-1', 'mesa-1', 'secret-1')
      const sig2 = mockService.gerarAssinatura('rest-1', 'mesa-1', 'secret-2')

      expect(sig1).toBe('sig-with-secret-1')
      expect(sig2).toBe('sig-with-secret-2')
    })
  })

  describe('integration with QRCodePayload', () => {
    it('deve validar assinatura usando QRCodePayload', () => {
      const payload = QRCodePayload.reconstruir({
        restauranteId: 'rest-123',
        mesaId: 'mesa-456',
        assinatura: 'valid-signature',
      })

      mockService.validarAssinatura.mockReturnValue(true)

      const result = mockService.validarAssinatura(
        {
          restauranteId: payload.restauranteId,
          mesaId: payload.mesaId,
          assinatura: payload.assinatura,
        },
        'secret'
      )

      expect(result).toBe(true)
    })

    it('deve rejeitar QRCodePayload com assinatura incorreta', () => {
      const payload = QRCodePayload.reconstruir({
        restauranteId: 'rest-123',
        mesaId: 'mesa-456',
        assinatura: 'wrong-signature',
      })

      mockService.validarAssinatura.mockReturnValue(false)

      const result = mockService.validarAssinatura(
        {
          restauranteId: payload.restauranteId,
          mesaId: payload.mesaId,
          assinatura: payload.assinatura,
        },
        'secret'
      )

      expect(result).toBe(false)
    })
  })
})