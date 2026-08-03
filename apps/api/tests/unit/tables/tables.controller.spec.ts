import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TablesController } from '../../../src/tables/tables.controller';
import { TablesService } from '../../../src/tables/tables.service';

/**
 * Spec de cobertura para `TablesController` (150 linhas, 8 endpoints).
 *
 * Cobre todas as branches: 5 endpoints autenticados (`findByRestaurant`,
 * `findById`, `create`, `update`, `deactivate`, `reactivate`, `generateQr`)
 * + 1 endpoint público com rate-limit (`validateQrCode`).
 *
 * Foco: validar que cada endpoint delega corretamente ao service,
 * que mensagens de erro do `validateQrAndGet` são unificadas
 * (defesa contra enumeração) e que o formato de retorno de QR
 * inclui `qrUrl` + `qr_url`.
 *
 * @see .openspec/changes/2026-08-03-test-tables-coverage-mesa/proposal.md
 */
describe('TablesController', () => {
  let controller: TablesController;
  let mockService: ReturnType<typeof createMockService>;

  const createMockService = () => ({
    findByRestaurant: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
    reactivate: vi.fn(),
    generateQrCode: vi.fn(),
    validateQrAndGet: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = createMockService();
    controller = new TablesController(mockService as unknown as TablesService);
  });

  // ─────────────────────────────────────────────────────────────────
  // findByRestaurant (GET /tables)
  // ─────────────────────────────────────────────────────────────────
  describe('GET /tables (findByRestaurant)', () => {
    it('delega para o service com restaurantId do JWT', async () => {
      const mesas = [{ id: 'm1', number: 1 }];
      mockService.findByRestaurant.mockResolvedValueOnce(mesas);

      const result = await controller.findByRestaurant({
        user: { id: 'u1', restaurantId: 'rest-1', role: 'gerente' },
      } as never);

      expect(result).toBe(mesas);
      expect(mockService.findByRestaurant).toHaveBeenCalledWith('rest-1');
    });

    it('passa restaurantId null quando JWT não tem (será ForbiddenException no service)', async () => {
      mockService.findByRestaurant.mockRejectedValueOnce(new Error('Forbidden'));
      await expect(
        controller.findByRestaurant({
          user: { id: 'u1', restaurantId: null, role: 'atendente' },
        } as never)
      ).rejects.toThrow();
      expect(mockService.findByRestaurant).toHaveBeenCalledWith(null);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // findById (GET /tables/:id)
  // ─────────────────────────────────────────────────────────────────
  describe('GET /tables/:id (findById)', () => {
    it('delega com id do path + restaurantId do JWT', async () => {
      const mesa = { id: 'm1', number: 1, restaurantId: 'rest-1' };
      mockService.findById.mockResolvedValueOnce(mesa);

      const result = await controller.findById(
        { user: { id: 'u1', restaurantId: 'rest-1', role: 'gerente' } } as never,
        'm1'
      );

      expect(result).toBe(mesa);
      expect(mockService.findById).toHaveBeenCalledWith('m1', 'rest-1');
    });

    it('propaga NotFoundException do service', async () => {
      mockService.findById.mockRejectedValueOnce(new Error('NotFound'));
      await expect(
        controller.findById(
          { user: { id: 'u1', restaurantId: 'rest-1', role: 'gerente' } } as never,
          'inexistente'
        )
      ).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // create (POST /tables)
  // ─────────────────────────────────────────────────────────────────
  describe('POST /tables (create)', () => {
    it('sobrescreve restaurantId do body com o do JWT (BOLA defense)', async () => {
      const mesa = { id: 'm1', name: 'Mesa 1' };
      mockService.create.mockResolvedValueOnce(mesa);

      const result = await controller.create(
        { user: { id: 'u1', restaurantId: 'rest-jwt', role: 'dono' } } as never,
        { name: 'Mesa 1', number: 1, capacity: 4, restaurantId: 'rest-other' } as never
      );

      expect(result).toBe(mesa);
      expect(mockService.create).toHaveBeenCalledWith({
        name: 'Mesa 1',
        number: 1,
        capacity: 4,
        restaurantId: 'rest-jwt',
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // update (PATCH /tables/:id)
  // ─────────────────────────────────────────────────────────────────
  describe('PATCH /tables/:id (update)', () => {
    it('delega para o service com id + dados + tenant do JWT', async () => {
      const mesaAtualizada = { id: 'm1', name: 'Renomeada' };
      mockService.update.mockResolvedValueOnce(mesaAtualizada);

      const result = await controller.update(
        { user: { id: 'u1', restaurantId: 'rest-1', role: 'gerente' } } as never,
        'm1',
        { name: 'Renomeada' } as never
      );

      expect(result).toBe(mesaAtualizada);
      expect(mockService.update).toHaveBeenCalledWith(
        'm1',
        { name: 'Renomeada' },
        'rest-1'
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // deactivate (DELETE /tables/:id) — apenas dono
  // ─────────────────────────────────────────────────────────────────
  describe('DELETE /tables/:id (deactivate)', () => {
    it('delega e retorna { success: true }', async () => {
      mockService.deactivate.mockResolvedValueOnce({ id: 'm1', active: false });

      const result = await controller.deactivate(
        { user: { id: 'u1', restaurantId: 'rest-1', role: 'dono' } } as never,
        'm1'
      );

      expect(result).toEqual({ success: true });
      expect(mockService.deactivate).toHaveBeenCalledWith('m1', 'rest-1');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // reactivate (POST /tables/:id/reactivate)
  // ─────────────────────────────────────────────────────────────────
  describe('POST /tables/:id/reactivate', () => {
    it('delega e retorna { success: true }', async () => {
      mockService.reactivate.mockResolvedValueOnce({ id: 'm1', active: true });

      const result = await controller.reactivate(
        { user: { id: 'u1', restaurantId: 'rest-1', role: 'gerente' } } as never,
        'm1'
      );

      expect(result).toEqual({ success: true });
      expect(mockService.reactivate).toHaveBeenCalledWith('m1', 'rest-1');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // generateQr (GET /tables/:id/qr)
  // ─────────────────────────────────────────────────────────────────
  describe('GET /tables/:id/qr (generateQr)', () => {
    it('delega para o service', async () => {
      const qrResult = {
        table: { id: 'm1', number: 1 },
        qrUrl: 'https://app.example.com/menu/rest-1?table_id=m1',
        qr_url: 'https://app.example.com/menu/rest-1?table_id=m1',
      };
      mockService.generateQrCode.mockResolvedValueOnce(qrResult);

      const result = await controller.generateQr(
        { user: { id: 'u1', restaurantId: 'rest-1', role: 'dono' } } as never,
        'm1'
      );

      expect(result).toBe(qrResult);
      expect(mockService.generateQrCode).toHaveBeenCalledWith('m1', 'rest-1');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // validateQrCode (POST /tables/validate) — Público + rate-limit
  // Mensagem unificada contra enumeração (ACHADO-38)
  // ─────────────────────────────────────────────────────────────────
  describe('POST /tables/validate (validateQrCode)', () => {
    const validBody = {
      restaurant_id: 'rest-1',
      table_id: 'mesa-1',
      timestamp: Date.now(),
      signature: 'a'.repeat(64),
    };

    it('retorna { valid: true, table } no happy path', async () => {
      mockService.validateQrAndGet.mockResolvedValueOnce({
        valid: true,
        table: { id: 'mesa-1', name: 'Mesa 1', number: 1, restaurantId: 'rest-1' },
      });

      const result = await controller.validateQrCode(validBody);

      expect(result).toEqual({
        valid: true,
        table: {
          id: 'mesa-1',
          name: 'Mesa 1',
          number: 1,
        },
      });
    });

    it('usa nome "Mesa <n>" quando name é null', async () => {
      mockService.validateQrAndGet.mockResolvedValueOnce({
        valid: true,
        table: { id: 'mesa-1', name: null, number: 7, restaurantId: 'rest-1' },
      });

      const result = await controller.validateQrCode(validBody);
      expect(result).toMatchObject({
        valid: true,
        table: { name: 'Mesa 7', number: 7 },
      });
    });

    it('retorna mensagem genérica "QR code inválido ou expirado" para mesa não encontrada', async () => {
      mockService.validateQrAndGet.mockResolvedValueOnce({
        valid: false,
        error: 'Mesa não encontrada ou inativa',
      });

      const result = await controller.validateQrCode(validBody);
      // ACHADO-38: mensagem unificada contra enumeração.
      expect(result).toEqual({
        valid: false,
        error: 'QR code inválido ou expirado',
      });
    });

    it('retorna mensagem genérica "QR code inválido ou expirado" para assinatura inválida', async () => {
      mockService.validateQrAndGet.mockResolvedValueOnce({
        valid: false,
        error: 'Assinatura inválida',
      });

      const result = await controller.validateQrCode(validBody);
      expect(result).toEqual({
        valid: false,
        error: 'QR code inválido ou expirado',
      });
    });

    it('log warning estruturado quando validação falha', async () => {
      const loggerWarn = vi.spyOn(controller['logger'], 'warn').mockImplementation(() => undefined as never);
      mockService.validateQrAndGet.mockResolvedValueOnce({
        valid: false,
        error: 'Assinatura inválida',
      });

      await controller.validateQrCode({
        restaurant_id: 'rest-1',
        table_id: 'mesa-1',
        timestamp: 1_700_000_000_000,
        signature: 'b'.repeat(64),
      });

      expect(loggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('[validate]')
      );
      expect(loggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('motivo=Assinatura inválida')
      );
      loggerWarn.mockRestore();
    });

    it('passa todos os campos do body ao service', async () => {
      mockService.validateQrAndGet.mockResolvedValueOnce({
        valid: false,
        error: 'qualquer',
      });

      await controller.validateQrCode({
        restaurant_id: 'rest-X',
        table_id: 'mesa-Y',
        timestamp: 1_700_000_000_001,
        signature: 'c'.repeat(64),
      });

      expect(mockService.validateQrAndGet).toHaveBeenCalledWith(
        'rest-X',
        'mesa-Y',
        1_700_000_000_001,
        'c'.repeat(64)
      );
    });
  });
});
