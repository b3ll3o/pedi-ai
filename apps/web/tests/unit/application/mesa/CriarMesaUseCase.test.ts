import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CriarMesaUseCase } from '@/application/mesa/services/CriarMesaUseCase'
import type { IMesaRepository } from '@/domain/mesa/repositories/IMesaRepository'
import type { IQRCodeValidationService } from '@/domain/mesa/services/QRCodeValidationService'
import type { EventDispatcher } from '@/domain/shared'
import type { Mesa } from '@/domain/mesa/entities/Mesa'

describe('CriarMesaUseCase', () => {
  let useCase: CriarMesaUseCase
  let mockMesaRepo: IMesaRepository
  let mockEventDispatcher: EventDispatcher
  let mockQrCodeValidationService: IQRCodeValidationService

  const mockQrCodeSecret = 'test-secret-key'

  beforeEach(() => {
    mockMesaRepo = {
      findById: vi.fn(),
      findByRestauranteId: vi.fn(),
      findByLabel: vi.fn(),
      create: vi.fn().mockResolvedValue({} as Mesa),
      update: vi.fn(),
      delete: vi.fn(),
    }

    mockEventDispatcher = {
      dispatch: vi.fn(),
      registerHandler: vi.fn(),
      unregisterHandler: vi.fn(),
    }

    mockQrCodeValidationService = {
      validarAssinatura: vi.fn().mockReturnValue(true),
      gerarAssinatura: vi.fn().mockReturnValue('mock-signature'),
    }
  })

  describe('execute', () => {
    it('deve criar mesa com ID único', async () => {
      useCase = new CriarMesaUseCase(
        mockMesaRepo,
        mockEventDispatcher,
        mockQrCodeValidationService,
        mockQrCodeSecret
      )

      const result = await useCase.execute({
        restauranteId: 'rest-123',
        label: 'Mesa 1',
      })

      expect(result.id).toBeDefined()
      expect(result.restauranteId).toBe('rest-123')
      expect(result.label).toBe('Mesa 1')
      expect(result.ativo).toBe(true)
    })

    it('deve chamar qrCodeValidationService.gerarAssinatura', async () => {
      useCase = new CriarMesaUseCase(
        mockMesaRepo,
        mockEventDispatcher,
        mockQrCodeValidationService,
        mockQrCodeSecret
      )

      await useCase.execute({
        restauranteId: 'rest-123',
        label: 'Mesa 1',
      })

      expect(mockQrCodeValidationService.gerarAssinatura).toHaveBeenCalledWith(
        'rest-123',
        expect.any(String),
        mockQrCodeSecret
      )
    })

    it('deve chamar mesaRepo.create', async () => {
      useCase = new CriarMesaUseCase(
        mockMesaRepo,
        mockEventDispatcher,
        mockQrCodeValidationService,
        mockQrCodeSecret
      )

      await useCase.execute({
        restauranteId: 'rest-123',
        label: 'Mesa 1',
      })

      expect(mockMesaRepo.create).toHaveBeenCalled()
    })

    it('deve usar QR code secret padrão quando não fornecido', async () => {
      useCase = new CriarMesaUseCase(
        mockMesaRepo,
        mockEventDispatcher,
        mockQrCodeValidationService
      )

      await useCase.execute({
        restauranteId: 'rest-123',
        label: 'Mesa 1',
      })

      expect(mockQrCodeValidationService.gerarAssinatura).toHaveBeenCalledWith(
        'rest-123',
        expect.any(String),
        'default-secret'
      )
    })

    it('deve criar mesa com QRCodePayload correto', async () => {
      useCase = new CriarMesaUseCase(
        mockMesaRepo,
        mockEventDispatcher,
        mockQrCodeValidationService,
        mockQrCodeSecret
      )

      const result = await useCase.execute({
        restauranteId: 'rest-123',
        label: 'Mesa VIP',
      })

      expect(result.qrCodePayload).toBeDefined()
      expect(result.qrCodePayload.restauranteId).toBe('rest-123')
      expect(result.qrCodePayload.mesaId).toBe(result.id)
      expect(result.qrCodePayload.assinatura).toBe('mock-signature')
    })
  })
})