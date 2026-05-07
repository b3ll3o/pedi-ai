import { describe, it, expect, beforeEach } from 'vitest';
import { MesaRepository } from '@/infrastructure/persistence/mesa/MesaRepository';
import { Mesa } from '@/domain/mesa/entities/Mesa';
import { QRCodePayload } from '@/domain/mesa/value-objects/QRCodePayload';
import { createTestDatabase } from '../_test-helpers';

describe('MesaRepository', () => {
  let repository: MesaRepository;
  let db: ReturnType<typeof createTestDatabase>;

  beforeEach(async () => {
    db = createTestDatabase();
    await db.open();
    repository = new MesaRepository(db);
  });

  function criarMesaValida(overrides?: Partial<{ id: string; restauranteId: string; label: string; ativo: boolean }>): Mesa {
    const qrPayload = QRCodePayload.reconstruir({
      restauranteId: overrides?.restauranteId ?? 'rest-123',
      mesaId: overrides?.id ?? 'mesa-001',
      assinatura: 'dummy-signature',
    });
    return Mesa.criar({
      restauranteId: overrides?.restauranteId ?? 'rest-123',
      label: overrides?.label ?? 'Mesa 01',
      qrCodePayload: qrPayload,
      ativo: overrides?.ativo ?? true,
      id: overrides?.id,
    });
  }

  describe('create', () => {
    it('deve criar e retornar uma mesa', async () => {
      const mesa = criarMesaValida();

      const resultado = await repository.create(mesa);

      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(mesa.id);
      expect(resultado.label).toBe('Mesa 01');
    });

    it('deve persistir mesa no banco', async () => {
      const mesa = criarMesaValida();
      await repository.create(mesa);

      const existente = await db.mesas.get(mesa.id);
      expect(existente).not.toBeNull();
      expect(existente!.label).toBe('Mesa 01');
    });
  });

  describe('findById', () => {
    it('deve encontrar mesa por id', async () => {
      const mesa = criarMesaValida();
      await repository.create(mesa);

      const resultado = await repository.findById(mesa.id);

      expect(resultado).not.toBeNull();
      expect(resultado!.id).toBe(mesa.id);
    });

    it('deve retornar null quando mesa nao existe', async () => {
      const resultado = await repository.findById('id-inexistente');
      expect(resultado).toBeNull();
    });
  });

  describe('findByRestauranteId', () => {
    it('deve encontrar mesas por restauranteId', async () => {
      const m1 = criarMesaValida({ id: 'mesa-1', label: 'Mesa 1' });
      const m2 = criarMesaValida({ id: 'mesa-2', label: 'Mesa 2', restauranteId: 'rest-123' });
      const m3 = criarMesaValida({ id: 'mesa-3', label: 'Mesa 3', restauranteId: 'outro-rest' });
      await repository.create(m1);
      await repository.create(m2);
      await repository.create(m3);

      const resultado = await repository.findByRestauranteId('rest-123');

      expect(resultado).toHaveLength(2);
    });
  });

  describe('findByLabel', () => {
    it('deve encontrar mesa por label e restaurante', async () => {
      const mesa = criarMesaValida({ label: 'Mesa VIP' });
      await repository.create(mesa);

      const resultado = await repository.findByLabel('rest-123', 'Mesa VIP');

      expect(resultado).not.toBeNull();
      expect(resultado!.label).toBe('Mesa VIP');
    });

    it('deve retornar null quando label nao existe', async () => {
      const resultado = await repository.findByLabel('rest-123', 'Label Inexistente');
      expect(resultado).toBeNull();
    });
  });

  describe('update', () => {
    it('deve atualizar mesa', async () => {
      const mesa = criarMesaValida({ label: 'Antiga' });
      await repository.create(mesa);

      mesa['props'].label = 'Atualizada';
      const resultado = await repository.update(mesa);

      expect(resultado.label).toBe('Atualizada');

      const existente = await db.mesas.get(mesa.id);
      expect(existente!.label).toBe('Atualizada');
    });
  });

  describe('delete', () => {
    it('deve remover mesa do banco', async () => {
      const mesa = criarMesaValida();
      await repository.create(mesa);

      await repository.delete(mesa.id);

      const existente = await db.mesas.get(mesa.id);
      expect(existente).toBeUndefined();
    });
  });

  describe('findByQrCode', () => {
    it('deve encontrar mesa por QR code simples E2E-TABLE-XXX', async () => {
      const mesa = criarMesaValida({ id: 'mesa-001', label: 'Mesa 01' });
      await repository.create(mesa);

      const resultado = await repository.findByQrCode('E2E-TABLE-01', 'rest-123');

      expect(resultado).not.toBeNull();
    });
  });
});
