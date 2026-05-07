import { describe, it, expect, beforeEach } from 'vitest';
import { PedidoRepository } from '@/infrastructure/persistence/pedido/PedidoRepository';
import { Pedido } from '@/domain/pedido/entities/Pedido';
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { createTestDatabase } from '../_test-helpers';

describe('PedidoRepository', () => {
  let repository: PedidoRepository;
  let db: ReturnType<typeof createTestDatabase>;

  beforeEach(async () => {
    db = createTestDatabase();
    await db.open();
    repository = new PedidoRepository(db);
  });

  function criarPedidoValido(overrides?: Partial<{ id: string; restauranteId: string; status: StatusPedido }>): Pedido {
    return Pedido.criar({
      restauranteId: overrides?.restauranteId ?? 'rest-123',
      itens: [],
      status: overrides?.status ?? StatusPedido.RECEIVED,
      id: overrides?.id,
    });
  }

  describe('create', () => {
    it('deve criar e retornar pedido', async () => {
      const pedido = criarPedidoValido();

      const resultado = await repository.create(pedido);

      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(pedido.id);
    });

    it('deve persistir pedido no banco', async () => {
      const pedido = criarPedidoValido();
      await repository.create(pedido);

      const existente = await db.pedidos.get(pedido.id);
      expect(existente).not.toBeNull();
      expect(existente!.restauranteId).toBe('rest-123');
    });
  });

  describe('findById', () => {
    it('deve encontrar pedido por id', async () => {
      const pedido = criarPedidoValido();
      await repository.create(pedido);

      const resultado = await repository.findById(pedido.id);

      expect(resultado).not.toBeNull();
      expect(resultado!.id).toBe(pedido.id);
    });

    it('deve retornar null quando pedido nao existe', async () => {
      const resultado = await repository.findById('id-inexistente');
      expect(resultado).toBeNull();
    });
  });

  describe('findByClienteId', () => {
    it('deve encontrar pedidos por clienteId', async () => {
      const p1 = criarPedidoValido({ id: 'p1' });
      p1['props'].clienteId = 'cliente-123';
      await repository.create(p1);

      const resultado = await repository.findByClienteId('cliente-123');

      expect(resultado).toHaveLength(1);
    });
  });

  describe('findByMesaId', () => {
    it('deve encontrar pedidos por mesaId', async () => {
      const p1 = criarPedidoValido({ id: 'p1' });
      p1['props'].mesaId = 'mesa-001';
      await repository.create(p1);

      const resultado = await repository.findByMesaId('mesa-001');

      expect(resultado).toHaveLength(1);
    });
  });

  describe('findByRestauranteId', () => {
    it('deve encontrar pedidos por restauranteId', async () => {
      const p1 = criarPedidoValido({ id: 'p1', restauranteId: 'rest-123' });
      const p2 = criarPedidoValido({ id: 'p2', restauranteId: 'outro-rest' });
      await repository.create(p1);
      await repository.create(p2);

      const resultado = await repository.findByRestauranteId('rest-123');

      expect(resultado).toHaveLength(1);
      expect(resultado[0].restauranteId).toBe('rest-123');
    });
  });

  describe('update', () => {
    it('deve atualizar pedido', async () => {
      const pedido = criarPedidoValido();
      await repository.create(pedido);

      pedido['props'].status = StatusPedido.PREPARING;
      const resultado = await repository.update(pedido);

      expect(resultado.status.toString()).toBe('preparing');
    });
  });

  describe('delete', () => {
    it('deve remover pedido do banco', async () => {
      const pedido = criarPedidoValido();
      await repository.create(pedido);

      await repository.delete(pedido.id);

      const existente = await db.pedidos.get(pedido.id);
      expect(existente).toBeUndefined();
    });
  });
});
