import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ValidarQRCodeUseCase } from '@/application/mesa/services/ValidarQRCodeUseCase'
import type { IQRCodeValidationService } from '@/domain/mesa/services/QRCodeValidationService'
import type { IMesaRepository } from '@/domain/mesa/repositories/IMesaRepository'

describe('ValidarQRCodeUseCase', () => {
  let useCase: ValidarQRCodeUseCase
  let mockQrCodeValidationService: IQRCodeValidationService
  let mockMesaRepository: IMesaRepository
  let _mockSupabase: any

  const validPayload = {
    restauranteId: 'rest-123',
    mesaId: 'mesa-456',
    assinatura: 'valid-signature',
  }

  beforeEach(() => {
    mockQrCodeValidationService = {
      validarAssinatura: vi.fn().mockReturnValue(true),
      gerarAssinatura: vi.fn(),
    }

    mockMesaRepository = {
      findById: vi.fn(),
      findByRestauranteId: vi.fn(),
      findByLabel: vi.fn(),
      findByQrCode: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }

    _mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
      }),
    }
  })

  describe('QR Code formato completo (base64)', () => {
    it('deve validar QR code válido com assinatura correta', async () => {
      useCase = new ValidarQRCodeUseCase(mockQrCodeValidationService, mockMesaRepository)

      const qrCode = Buffer.from(JSON.stringify(validPayload)).toString('base64')

      const result = await useCase.execute({ qrCode, secret: 'secret-key' })

      expect(result.valido).toBe(true)
      expect(result.restauranteId).toBe(validPayload.restauranteId)
      expect(result.mesaId).toBe(validPayload.mesaId)
    })

    it('deve chamar validarAssinatura com QRCodePayload correto', async () => {
      useCase = new ValidarQRCodeUseCase(mockQrCodeValidationService, mockMesaRepository)

      const qrCode = Buffer.from(JSON.stringify(validPayload)).toString('base64')

      await useCase.execute({ qrCode, secret: 'secret-key' })

      expect(mockQrCodeValidationService.validarAssinatura).toHaveBeenCalledWith(
        expect.objectContaining({
          restauranteId: validPayload.restauranteId,
          mesaId: validPayload.mesaId,
          assinatura: validPayload.assinatura,
        }),
        'secret-key'
      )
    })

    it('deve retornar valido=false quando assinatura é inválida', async () => {
      mockQrCodeValidationService.validarAssinatura.mockReturnValue(false)
      useCase = new ValidarQRCodeUseCase(mockQrCodeValidationService, mockMesaRepository)

      const qrCode = Buffer.from(JSON.stringify(validPayload)).toString('base64')

      const result = await useCase.execute({ qrCode, secret: 'wrong-secret' })

      expect(result.valido).toBe(false)
    })

    it('deve falhar para QR code mal formado', async () => {
      useCase = new ValidarQRCodeUseCase(mockQrCodeValidationService, mockMesaRepository)

      const result = await useCase.execute({
        qrCode: 'not-valid-base64!@#$',
        secret: 'secret',
      })

      expect(result.valido).toBe(false)
    })

    it('deve falhar para JSON inválido', async () => {
      useCase = new ValidarQRCodeUseCase(mockQrCodeValidationService, mockMesaRepository)

      const invalidJson = Buffer.from('not-json').toString('base64')

      const result = await useCase.execute({
        qrCode: invalidJson,
        secret: 'secret',
      })

      expect(result.valido).toBe(false)
    })
  })

  describe('QR Code formato simples (E2E-TABLE)', () => {
    it('deve buscar mesa no repository quando QR code simples é fornecido', async () => {
      const mockMesa = {
        id: 'mesa-e2e-1',
        restauranteId: 'rest-e2e',
        label: 'Mesa E2E',
      }
      mockMesaRepository.findByQrCode.mockResolvedValue(mockMesa as any)
      useCase = new ValidarQRCodeUseCase(mockQrCodeValidationService, mockMesaRepository)

      const result = await useCase.execute({
        qrCode: 'E2E-TABLE-123',
        secret: 'secret',
      })

      expect(mockMesaRepository.findByQrCode).toHaveBeenCalledWith('E2E-TABLE-123')
      expect(result.valido).toBe(true)
      expect(result.mesaId).toBe('mesa-e2e-1')
      expect(result.restauranteId).toBe('rest-e2e')
    })

    it('deve retornar inválido quando mesa não é encontrada no repository', async () => {
      mockMesaRepository.findByQrCode.mockResolvedValue(null)
      useCase = new ValidarQRCodeUseCase(mockQrCodeValidationService, mockMesaRepository)

      const result = await useCase.execute({
        qrCode: 'E2E-TABLE-999',
        secret: 'secret',
      })

      expect(result.valido).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('deve retornar inválido para QR code vazio', async () => {
      useCase = new ValidarQRCodeUseCase(mockQrCodeValidationService, mockMesaRepository)

      const result = await useCase.execute({
        qrCode: '',
        secret: 'secret',
      })

      expect(result.valido).toBe(false)
    })
  })
})