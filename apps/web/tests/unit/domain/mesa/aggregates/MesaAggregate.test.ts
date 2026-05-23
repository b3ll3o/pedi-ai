import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MesaAggregate } from '@/domain/mesa/aggregates/MesaAggregate';
import { Mesa } from '@/domain/mesa/entities/Mesa';
import { EventDispatcher } from '@/domain/shared';
import { IMesaRepository } from '@/domain/mesa/repositories/IMesaRepository';
import { IQRCodeValidationService } from '@/domain/mesa/services/QRCodeValidationService';
import { QRCodePayload } from '@/domain/mesa/value-objects/QRCodePayload';

const mockRepository: Partial<IMesaRepository> = {
  findByLabel: vi.fn().mockResolvedValue(null),
  findById: vi.fn(),
  save: vi.fn(),
};

const mockEventDispatcher = {
  dispatch: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
};

const mockQRCodeValidationService: Partial<IQRCodeValidationService> = {
  gerarAssinatura: vi.fn().mockReturnValue('mock-assinatura'),
  validarAssinatura: vi.fn().mockReturnValue(true),
};

describe('MesaAggregate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('deve criar MesaAggregate com mesa válida', () => {
      const mesa = Mesa.criar({
        id: 'mesa-1',
        label: 'Mesa 1',
        restauranteId: 'rest-1',
        ativo: true,
        qrCodePayload: QRCodePayload.reconstruir({
          restauranteId: 'rest-1',
          mesaId: 'mesa-1',
          assinatura: 'test',
        }),
      });

      const aggregate = new MesaAggregate(
        mesa,
        mockRepository as IMesaRepository,
        mockEventDispatcher as unknown as EventDispatcher,
        mockQRCodeValidationService as IQRCodeValidationService
      );

      expect(aggregate.id).toBe('mesa-1');
      expect(aggregate.label).toBe('Mesa 1');
      expect(aggregate.ativo).toBe(true);
    });

    it('deve lançar erro se label for vazio', () => {
      const mesa = Mesa.criar({
        id: 'mesa-1',
        label: '',
        restauranteId: 'rest-1',
        qrCodePayload: QRCodePayload.reconstruir({
          restauranteId: 'rest-1',
          mesaId: 'mesa-1',
          assinatura: 'test',
        }),
      });

      expect(() => {
        new MesaAggregate(
          mesa,
          mockRepository as IMesaRepository,
          mockEventDispatcher as unknown as EventDispatcher,
          mockQRCodeValidationService as IQRCodeValidationService
        );
      }).toThrow('Label da mesa não pode ser vazio');
    });

    it('deve lançar erro se restauranteId for vazio', () => {
      const mesa = Mesa.criar({
        id: 'mesa-1',
        label: 'Mesa 1',
        restauranteId: '',
        qrCodePayload: QRCodePayload.reconstruir({
          restauranteId: '',
          mesaId: 'mesa-1',
          assinatura: 'test',
        }),
      });

      expect(() => {
        new MesaAggregate(
          mesa,
          mockRepository as IMesaRepository,
          mockEventDispatcher as unknown as EventDispatcher,
          mockQRCodeValidationService as IQRCodeValidationService
        );
      }).toThrow('RestauranteId da mesa não pode ser vazio');
    });
  });

  describe('desativar', () => {
    it('deve desativar mesa e dispatchar evento', () => {
      const mesa = Mesa.criar({
        id: 'mesa-1',
        label: 'Mesa 1',
        restauranteId: 'rest-1',
        ativo: true,
        qrCodePayload: QRCodePayload.reconstruir({
          restauranteId: 'rest-1',
          mesaId: 'mesa-1',
          assinatura: 'test',
        }),
      });

      const aggregate = new MesaAggregate(
        mesa,
        mockRepository as IMesaRepository,
        mockEventDispatcher as unknown as EventDispatcher,
        mockQRCodeValidationService as IQRCodeValidationService
      );

      aggregate.desativar();

      expect(aggregate.ativo).toBe(false);
      expect(mockEventDispatcher.dispatch).toHaveBeenCalled();
    });

    it('não deve fazer nada se mesa já estiver desativada', () => {
      const mesa = Mesa.criar({
        id: 'mesa-1',
        label: 'Mesa 1',
        restauranteId: 'rest-1',
        ativo: false,
        qrCodePayload: QRCodePayload.reconstruir({
          restauranteId: 'rest-1',
          mesaId: 'mesa-1',
          assinatura: 'test',
        }),
      });

      const aggregate = new MesaAggregate(
        mesa,
        mockRepository as IMesaRepository,
        mockEventDispatcher as unknown as EventDispatcher,
        mockQRCodeValidationService as IQRCodeValidationService
      );

      mockEventDispatcher.dispatch.mockClear();
      aggregate.desativar();

      expect(mockEventDispatcher.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('gerarQRCodePayload', () => {
    it('deve gerar QR code payload com assinatura', () => {
      const mesa = Mesa.criar({
        id: 'mesa-1',
        label: 'Mesa 1',
        restauranteId: 'rest-1',
        qrCodePayload: QRCodePayload.reconstruir({
          restauranteId: 'rest-1',
          mesaId: 'mesa-1',
          assinatura: 'original',
        }),
      });

      const aggregate = new MesaAggregate(
        mesa,
        mockRepository as IMesaRepository,
        mockEventDispatcher as unknown as EventDispatcher,
        mockQRCodeValidationService as IQRCodeValidationService
      );

      const payload = aggregate.gerarQRCodePayload('secret');

      expect(mockQRCodeValidationService.gerarAssinatura).toHaveBeenCalledWith(
        'rest-1',
        'mesa-1',
        'secret'
      );
      expect(payload.restauranteId).toBe('rest-1');
      expect(payload.mesaId).toBe('mesa-1');
    });
  });

  describe('criar', () => {
    it('deve criar mesa com QR code e dispatchar evento', async () => {
      const result = await MesaAggregate.criar(
        {
          id: 'mesa-2',
          label: 'Mesa 2',
          restauranteId: 'rest-1',
          ativo: true,
        },
        mockRepository as IMesaRepository,
        mockEventDispatcher as unknown as EventDispatcher,
        'secret',
        mockQRCodeValidationService as IQRCodeValidationService
      );

      expect(result.id).toBe('mesa-2');
      expect(result.label).toBe('Mesa 2');
      expect(mockEventDispatcher.dispatch).toHaveBeenCalled();
    });

    it('deve lançar erro se já existir mesa com mesmo label', async () => {
      (mockRepository.findByLabel as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'existing',
        label: 'Mesa 2',
      });

      await expect(
        MesaAggregate.criar(
          {
            id: 'mesa-2',
            label: 'Mesa 2',
            restauranteId: 'rest-1',
            ativo: true,
          },
          mockRepository as IMesaRepository,
          mockEventDispatcher as unknown as EventDispatcher,
          'secret',
          mockQRCodeValidationService as IQRCodeValidationService
        )
      ).rejects.toThrow('Já existe uma mesa com o label "Mesa 2" neste restaurante');
    });
  });

  describe('validarDuplicidadeLabel', () => {
    it('deve retornar false se não existir mesa com label', async () => {
      const result = await MesaAggregate.validarDuplicidadeLabel(
        'rest-1',
        'Mesa Nova',
        null,
        mockRepository as IMesaRepository
      );

      expect(result).toBe(false);
    });

    it('deve retornar true se existir mesa com mesmo label', async () => {
      (mockRepository.findByLabel as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'mesa-existing',
        label: 'Mesa 1',
      });

      const result = await MesaAggregate.validarDuplicidadeLabel(
        'rest-1',
        'Mesa 1',
        null,
        mockRepository as IMesaRepository
      );

      expect(result).toBe(true);
    });

    it('deve retornar false se existir mesa mas for a mesma mesa (edição)', async () => {
      (mockRepository.findByLabel as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'mesa-1',
        label: 'Mesa 1',
      });

      const result = await MesaAggregate.validarDuplicidadeLabel(
        'rest-1',
        'Mesa 1',
        'mesa-1',
        mockRepository as IMesaRepository
      );

      expect(result).toBe(false);
    });
  });

  describe('reconstruir', () => {
    it('deve reconstruir aggregate a partir de props', () => {
      const props = {
        id: 'mesa-1',
        label: 'Mesa 1',
        restauranteId: 'rest-1',
        ativo: true,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        deletedAt: null,
        version: 1,
        qrCodePayload: QRCodePayload.reconstruir({
          restauranteId: 'rest-1',
          mesaId: 'mesa-1',
          assinatura: 'test',
        }),
      };

      const aggregate = MesaAggregate.reconstruir(
        props,
        mockRepository as IMesaRepository,
        mockEventDispatcher as unknown as EventDispatcher,
        mockQRCodeValidationService as IQRCodeValidationService
      );

      expect(aggregate.id).toBe('mesa-1');
      expect(aggregate.label).toBe('Mesa 1');
    });
  });
});
