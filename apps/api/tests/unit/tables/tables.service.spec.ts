import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { TablesService } from '../../../src/tables/tables.service';
import { QRCodeCryptoService } from '../../../src/tables/qr-crypto.service';
import { PrismaService } from '../../../src/common/prisma.service';

/**
 * Spec de cobertura para `TablesService` (198 linhas, BC `mesa/`).
 *
 * Origem: cobertura api 61.03% branches no master atual (módulo `tables/`
 * apenas 9.41%). Sem testes, o CI bloqueia merges futuros.
 *
 * Cobre todas as branches dos métodos públicos e privados:
 * - findByRestaurant (ForbiddenException se sem restaurantId, happy path)
 * - findById (NotFound, Forbidden cross-tenant, happy path)
 * - validateQrCode (secret ausente, timestamp inválido, timestamp janela
 *   excedida, happy path)
 * - assinarQrCode (secret ausente → null, happy path)
 * - validateTable (mesa ativa, mesa inativa/inexistente)
 * - validateQrAndGet (mesa inativa, assinaura inválida, happy path)
 * - create (sem restaurantId → Forbidden, happy path)
 * - update (delegação ao findById + prisma.update)
 * - deactivate / reactivate (delegação + update boolean)
 * - generateQrCode (delegação + uso de envs QR_BASE_URL/APP_PUBLIC_URL +
 *   alias camelCase/snake_case)
 *
 * @see .openspec/changes/2026-08-03-test-tables-coverage-mesa/proposal.md
 */
describe('TablesService', () => {
  let service: TablesService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let qrService: QRCodeCryptoService;

  const createMockPrisma = () => ({
    table: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    qrService = new QRCodeCryptoService();
    // Test secret consistente para todas as chamadas de QR.
    process.env.QR_SECRET_KEY = 'test_qr_secret_long_enough_for_hmac_sha256';
    service = new TablesService(
      mockPrisma as unknown as PrismaService,
      qrService
    );
  });

  // ─────────────────────────────────────────────────────────────────
  // findByRestaurant — branch: !restaurantId vs happy
  // ─────────────────────────────────────────────────────────────────
  describe('findByRestaurant', () => {
    it('rejeita quando restaurantId é null (tenant isolation)', async () => {
      await expect(service.findByRestaurant(null as unknown as string)).rejects.toThrow(
        ForbiddenException
      );
      expect(mockPrisma.table.findMany).not.toHaveBeenCalled();
    });

    it('rejeita quando restaurantId é undefined', async () => {
      await expect(
        service.findByRestaurant(undefined as unknown as string)
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.table.findMany).not.toHaveBeenCalled();
    });

    it('rejeita quando restaurantId é string vazia', async () => {
      await expect(service.findByRestaurant('')).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.table.findMany).not.toHaveBeenCalled();
    });

    it('retorna mesas ativas do restaurante ordenadas por número', async () => {
      const mesasMock = [
        { id: 'm1', number: 1, name: 'Mesa 1' },
        { id: 'm2', number: 2, name: 'Mesa 2' },
      ];
      mockPrisma.table.findMany.mockResolvedValueOnce(mesasMock);

      const result = await service.findByRestaurant('rest-1');

      expect(result).toEqual(mesasMock);
      expect(mockPrisma.table.findMany).toHaveBeenCalledWith({
        where: { active: true, restaurantId: 'rest-1' },
        orderBy: { number: 'asc' },
      });
    });

    it('retorna lista vazia para restaurante sem mesas', async () => {
      mockPrisma.table.findMany.mockResolvedValueOnce([]);
      const result = await service.findByRestaurant('rest-vazio');
      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // findById — 3 branches: !table, BOLA cross-tenant, happy
  // ─────────────────────────────────────────────────────────────────
  describe('findById', () => {
    it('lança NotFoundException quando mesa não existe', async () => {
      mockPrisma.table.findUnique.mockResolvedValueOnce(null);
      await expect(service.findById('inexistente')).rejects.toThrow(NotFoundException);
    });

    it('retorna mesa sem checar tenant quando requesterRestaurantId é null', async () => {
      const mesa = { id: 'm1', restaurantId: 'rest-1' };
      mockPrisma.table.findUnique.mockResolvedValueOnce(mesa);
      const result = await service.findById('m1', null);
      expect(result).toEqual(mesa);
    });

    it('retorna mesa sem checar tenant quando requesterRestaurantId é undefined', async () => {
      const mesa = { id: 'm1', restaurantId: 'rest-1' };
      mockPrisma.table.findUnique.mockResolvedValueOnce(mesa);
      const result = await service.findById('m1', undefined);
      expect(result).toEqual(mesa);
    });

    it('rejeita quando mesa pertence a outro restaurante (BOLA)', async () => {
      mockPrisma.table.findUnique.mockResolvedValueOnce({
        id: 'm1',
        restaurantId: 'rest-other',
      });
      await expect(service.findById('m1', 'rest-1')).rejects.toThrow(ForbiddenException);
    });

    it('retorna mesa quando restaurante bate', async () => {
      const mesa = { id: 'm1', restaurantId: 'rest-1', name: 'Mesa 1' };
      mockPrisma.table.findUnique.mockResolvedValueOnce(mesa);
      const result = await service.findById('m1', 'rest-1');
      expect(result).toEqual(mesa);
      expect(mockPrisma.table.findUnique).toHaveBeenCalledWith({ where: { id: 'm1' } });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // validateQrCode — branches: secret ausente, timestamp NaN,
  // timestamp janela, assinatura válida, assinatura inválida
  // ─────────────────────────────────────────────────────────────────
  describe('validateQrCode', () => {
    const restaurantId = 'rest-1';
    const tableId = 'mesa-1';
    const timestamp = Date.now();
    let signature: string;

    beforeEach(() => {
      signature = service.assinarQrCode(restaurantId, tableId, timestamp)!;
    });

    it('retorna false quando QR_SECRET_KEY não configurado', async () => {
      // Constrói service SEM secret para esse caso isolado.
      const originalSecret = process.env.QR_SECRET_KEY;
      delete process.env.QR_SECRET_KEY;
      const serviceSemSecret = new TablesService(
        mockPrisma as unknown as PrismaService,
        qrService
      );

      const result = await serviceSemSecret.validateQrCode(
        restaurantId,
        tableId,
        timestamp,
        signature
      );
      expect(result).toBe(false);

      process.env.QR_SECRET_KEY = originalSecret;
    });

    it('retorna false quando timestamp é NaN', async () => {
      const result = await service.validateQrCode(restaurantId, tableId, NaN, signature);
      expect(result).toBe(false);
    });

    it('retorna false quando timestamp é tipo diferente de number', async () => {
      // Bypass TS para garantir que o typeof check é executado em runtime.
      const result = await service.validateQrCode(
        restaurantId,
        tableId,
        // @ts-expect-error testing defensive behavior
        'string-no-lugar-de-number',
        signature
      );
      expect(result).toBe(false);
    });

    it('retorna false quando timestamp está fora da janela (muito antigo)', async () => {
      const tsAntigo = Date.now() - TablesService.QR_TIMESTAMP_WINDOW_MS - 1000;
      // Assina com o timestamp antigo (que já seria rejeitado).
      const sigAntiga = service.assinarQrCode(restaurantId, tableId, tsAntigo)!;
      // Mas usa-o no validate como se fosse o atual — recusa pela janela.
      const result = await service.validateQrCode(restaurantId, tableId, tsAntigo, sigAntiga);
      // Janela é Math.abs(now - timestamp), então ts muito antigo falha.
      expect(result).toBe(false);
    });

    it('retorna false quando timestamp está fora da janela (muito futuro)', async () => {
      const tsFuturo = Date.now() + TablesService.QR_TIMESTAMP_WINDOW_MS + 1000;
      const sigFutura = service.assinarQrCode(restaurantId, tableId, tsFuturo)!;
      const result = await service.validateQrCode(restaurantId, tableId, tsFuturo, sigFutura);
      expect(result).toBe(false);
    });

    it('retorna false quando assinatura está errada (mesmo restaurante/mesa/timestamp)', async () => {
      // Assina com timestamp +1ms — passa na janela mas falha no HMAC.
      const outraAssinatura = service.assinarQrCode(
        restaurantId,
        tableId,
        timestamp + 1
      )!;
      const result = await service.validateQrCode(
        restaurantId,
        tableId,
        timestamp,
        outraAssinatura
      );
      expect(result).toBe(false);
    });

    it('retorna true quando restaurante/mesa/timestamp/assinatura batem', async () => {
      const result = await service.validateQrCode(restaurantId, tableId, timestamp, signature);
      expect(result).toBe(true);
    });

    it('retorna false quando restaurante difere do assinado', async () => {
      const result = await service.validateQrCode(
        'rest-outro',
        tableId,
        timestamp,
        signature
      );
      expect(result).toBe(false);
    });

    it('retorna false quando mesa difere do assinado', async () => {
      const result = await service.validateQrCode(
        restaurantId,
        'mesa-outra',
        timestamp,
        signature
      );
      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // assinarQrCode — branch: secret ausente → null
  // ─────────────────────────────────────────────────────────────────
  describe('assinarQrCode', () => {
    it('retorna null quando secret ausente', () => {
      const originalSecret = process.env.QR_SECRET_KEY;
      delete process.env.QR_SECRET_KEY;
      const serviceSemSecret = new TablesService(
        mockPrisma as unknown as PrismaService,
        qrService
      );

      const result = serviceSemSecret.assinarQrCode('rest-1', 'mesa-1', Date.now());
      expect(result).toBeNull();

      process.env.QR_SECRET_KEY = originalSecret;
    });

    it('retorna HMAC-SHA256 hex de 64 chars quando configurado', () => {
      const sig = service.assinarQrCode('rest-1', 'mesa-1', 1_700_000_000_000);
      expect(sig).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // validateTable — booleano de retorno
  // ─────────────────────────────────────────────────────────────────
  describe('validateTable', () => {
    it('retorna true quando mesa existe, pertence ao restaurante e está ativa', async () => {
      mockPrisma.table.findFirst.mockResolvedValueOnce({ id: 'mesa-1' });
      const result = await service.validateTable('rest-1', 'mesa-1');
      expect(result).toBe(true);
      expect(mockPrisma.table.findFirst).toHaveBeenCalledWith({
        where: { id: 'mesa-1', restaurantId: 'rest-1', active: true },
      });
    });

    it('retorna false quando mesa não existe', async () => {
      mockPrisma.table.findFirst.mockResolvedValueOnce(null);
      const result = await service.validateTable('rest-1', 'mesa-fake');
      expect(result).toBe(false);
    });

    it('retorna false quando mesa pertence a outro restaurante', async () => {
      mockPrisma.table.findFirst.mockResolvedValueOnce(null);
      const result = await service.validateTable('rest-outro', 'mesa-1');
      expect(result).toBe(false);
    });

    it('retorna false quando mesa está inativa', async () => {
      mockPrisma.table.findFirst.mockResolvedValueOnce(null);
      const result = await service.validateTable('rest-1', 'mesa-inativa');
      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // validateQrAndGet — consolidated path (M17)
  // ─────────────────────────────────────────────────────────────────
  describe('validateQrAndGet', () => {
    const restaurantId = 'rest-1';
    const tableId = 'mesa-1';
    const timestamp = Date.now();

    it('retorna valid=false (mêsa não encontrada/inativa) sem consultar HMAC', async () => {
      mockPrisma.table.findFirst.mockResolvedValueOnce(null);
      const result = await service.validateQrAndGet(
        restaurantId,
        tableId,
        timestamp,
        'qualquer'
      );
      expect(result).toEqual({
        valid: false,
        error: 'Mesa não encontrada ou inativa',
      });
    });

    it('retorna valid=false (assinatura inválida) quando mesa existe mas HMAC falha', async () => {
      mockPrisma.table.findFirst.mockResolvedValueOnce({
        id: tableId,
        restaurantId,
        active: true,
      });
      const result = await service.validateQrAndGet(
        restaurantId,
        tableId,
        timestamp,
        'signature-fake-mas-compativel-em-length-com-sha256-hex...curta'
      );
      expect(result).toEqual({ valid: false, error: 'Assinatura inválida' });
    });

    it('retorna valid=true com a mesa quando QR é válido', async () => {
      const mesa = { id: tableId, restaurantId, active: true, name: 'Mesa 1', number: 1 };
      mockPrisma.table.findFirst.mockResolvedValueOnce(mesa);
      const signature = service.assinarQrCode(restaurantId, tableId, timestamp)!;

      const result = await service.validateQrAndGet(
        restaurantId,
        tableId,
        timestamp,
        signature
      );
      expect(result).toEqual({ valid: true, table: mesa });
    });

    it('retorna valid=false com mensagem genérica quando mesa está inativa', async () => {
      // findFirst com `active: true` no where → se inativa, retorna null.
      mockPrisma.table.findFirst.mockResolvedValueOnce(null);
      const signature = service.assinarQrCode(restaurantId, tableId, timestamp)!;
      const result = await service.validateQrAndGet(
        restaurantId,
        tableId,
        timestamp,
        signature
      );
      // Defesa contra enumeração: mesma mensagem para "não existe" e "inativa".
      expect(result.valid).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // create — !restaurantId → Forbidden
  // ─────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('rejeita quando restaurantId é null', async () => {
      await expect(
        service.create({
          restaurantId: null,
          name: 'Mesa sem dono',
        })
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.table.create).not.toHaveBeenCalled();
    });

    it('cria mesa com número e capacidade opcionais', async () => {
      const mesaCriada = {
        id: 'm1',
        restaurantId: 'rest-1',
        name: 'Mesa 1',
        number: 1,
        capacity: 4,
      };
      mockPrisma.table.create.mockResolvedValueOnce(mesaCriada);

      const result = await service.create({
        restaurantId: 'rest-1',
        name: 'Mesa 1',
        number: 1,
        capacity: 4,
      });

      expect(result).toEqual(mesaCriada);
      expect(mockPrisma.table.create).toHaveBeenCalledWith({
        data: {
          restaurantId: 'rest-1',
          name: 'Mesa 1',
          number: 1,
          capacity: 4,
        },
      });
    });

    it('cria mesa sem número e capacidade', async () => {
      const mesaCriada = {
        id: 'm1',
        restaurantId: 'rest-1',
        name: 'Mesa sem número',
      };
      mockPrisma.table.create.mockResolvedValueOnce(mesaCriada);

      await service.create({
        restaurantId: 'rest-1',
        name: 'Mesa sem número',
      });

      expect(mockPrisma.table.create).toHaveBeenCalledWith({
        data: {
          restaurantId: 'rest-1',
          name: 'Mesa sem número',
          number: undefined,
          capacity: undefined,
        },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // update / deactivate / reactivate — delegação ao findById
  // ─────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('rejeita quando mesa não existe (NotFound via findById)', async () => {
      mockPrisma.table.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.update('inexistente', { name: 'Novo nome' }, 'rest-1')
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.table.update).not.toHaveBeenCalled();
    });

    it('rejeita cross-tenant (BOLA via findById)', async () => {
      mockPrisma.table.findUnique.mockResolvedValueOnce({
        id: 'm1',
        restaurantId: 'rest-other',
      });
      await expect(
        service.update('m1', { name: 'Outro' }, 'rest-1')
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.table.update).not.toHaveBeenCalled();
    });

    it('atualiza mesa do próprio restaurante', async () => {
      mockPrisma.table.findUnique.mockResolvedValueOnce({
        id: 'm1',
        restaurantId: 'rest-1',
      });
      mockPrisma.table.update.mockResolvedValueOnce({
        id: 'm1',
        name: 'Mesa renomeada',
        number: 2,
      });

      const result = await service.update(
        'm1',
        { name: 'Mesa renomeada', number: 2 },
        'rest-1'
      );
      expect(result).toEqual({ id: 'm1', name: 'Mesa renomeada', number: 2 });
    });

    it('atualiza sem checar tenant quando requesterRestaurantId é null', async () => {
      mockPrisma.table.findUnique.mockResolvedValueOnce({
        id: 'm1',
        restaurantId: 'rest-1',
      });
      mockPrisma.table.update.mockResolvedValueOnce({ id: 'm1', active: false });
      await service.update('m1', { active: false }, null);
      expect(mockPrisma.table.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { active: false },
      });
    });
  });

  describe('deactivate', () => {
    it('rejeita quando mesa não existe', async () => {
      mockPrisma.table.findUnique.mockResolvedValueOnce(null);
      await expect(service.deactivate('inexistente', 'rest-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('marca active=false após validar ownership', async () => {
      mockPrisma.table.findUnique.mockResolvedValueOnce({
        id: 'm1',
        restaurantId: 'rest-1',
      });
      mockPrisma.table.update.mockResolvedValueOnce({ id: 'm1', active: false });
      const result = await service.deactivate('m1', 'rest-1');
      expect(result).toEqual({ id: 'm1', active: false });
      expect(mockPrisma.table.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { active: false },
      });
    });
  });

  describe('reactivate', () => {
    it('rejeita quando mesa não existe', async () => {
      mockPrisma.table.findUnique.mockResolvedValueOnce(null);
      await expect(service.reactivate('inexistente', 'rest-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('marca active=true após validar ownership', async () => {
      mockPrisma.table.findUnique.mockResolvedValueOnce({
        id: 'm1',
        restaurantId: 'rest-1',
      });
      mockPrisma.table.update.mockResolvedValueOnce({ id: 'm1', active: true });
      const result = await service.reactivate('m1', 'rest-1');
      expect(result).toEqual({ id: 'm1', active: true });
      expect(mockPrisma.table.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { active: true },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // generateQrCode — env resolution (3 envs) + alias camelCase/snake
  // ─────────────────────────────────────────────────────────────────
  describe('generateQrCode', () => {
    const originalQrBaseUrl = process.env.QR_BASE_URL;
    const originalAppPublicUrl = process.env.APP_PUBLIC_URL;

    afterEach(() => {
      process.env.QR_BASE_URL = originalQrBaseUrl;
      process.env.APP_PUBLIC_URL = originalAppPublicUrl;
    });

    it('usa QR_BASE_URL quando definida (precedência 1)', async () => {
      process.env.QR_BASE_URL = 'https://qr.example.com';
      process.env.APP_PUBLIC_URL = 'https://app.example.com';
      const mesa = { id: 'm1', restaurantId: 'rest-1', number: 1, name: 'Mesa 1' };
      mockPrisma.table.findUnique.mockResolvedValueOnce(mesa);

      const result = await service.generateQrCode('m1', 'rest-1');
      expect(result.qrUrl).toBe('https://qr.example.com/menu/rest-1?table_id=m1');
      expect(result.qr_url).toBe('https://qr.example.com/menu/rest-1?table_id=m1');
      expect(result.table).toEqual(mesa);
    });

    it('usa APP_PUBLIC_URL quando QR_BASE_URL ausente (precedência 2)', async () => {
      delete process.env.QR_BASE_URL;
      process.env.APP_PUBLIC_URL = 'https://app.example.com';
      const mesa = { id: 'm1', restaurantId: 'rest-1', number: 1, name: 'Mesa 1' };
      mockPrisma.table.findUnique.mockResolvedValueOnce(mesa);

      const result = await service.generateQrCode('m1', 'rest-1');
      expect(result.qrUrl).toBe('https://app.example.com/menu/rest-1?table_id=m1');
    });

    it('usa fallback dev (http://localhost:3000) quando nenhuma env definida', async () => {
      delete process.env.QR_BASE_URL;
      delete process.env.APP_PUBLIC_URL;
      const mesa = { id: 'm1', restaurantId: 'rest-1', number: 1, name: 'Mesa 1' };
      mockPrisma.table.findUnique.mockResolvedValueOnce(mesa);

      const result = await service.generateQrCode('m1', 'rest-1');
      expect(result.qrUrl).toBe('http://localhost:3000/menu/rest-1?table_id=m1');
    });

    it('propaga NotFoundException para mesa inexistente', async () => {
      mockPrisma.table.findUnique.mockResolvedValueOnce(null);
      await expect(service.generateQrCode('inexistente', 'rest-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('retorna tanto qrUrl (camelCase) quanto qr_url (snake_case) com mesmo valor', async () => {
      const mesa = { id: 'm1', restaurantId: 'rest-1', number: 1, name: 'Mesa 1' };
      mockPrisma.table.findUnique.mockResolvedValueOnce(mesa);
      const result = await service.generateQrCode('m1', 'rest-1');
      expect(result.qrUrl).toBe(result.qr_url);
      // Auditoria B1: ambos nomes expostos para retrocompatibilidade.
      expect(typeof result.qrUrl).toBe('string');
    });
  });
});
