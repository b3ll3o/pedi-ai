import { describe, it, expect, beforeEach } from 'vitest';

import { Combo } from '@/domain/cardapio/entities/Combo';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { ComboRepository } from '@/infrastructure/persistence/cardapio/ComboRepository';

import { createTestDatabase } from '../_test-helpers';

describe('ComboRepository', () => {
  let repository: ComboRepository;
  let db: ReturnType<typeof createTestDatabase>;

  beforeEach(async () => {
    db = createTestDatabase();
    await db.open();
    repository = new ComboRepository(db);
  });

  function criarComboValido(
    overrides?: Partial<{
      id: string;
      restauranteId: string;
      nome: string;
      ativo: boolean;
    }>
  ): Combo {
    return Combo.criar({
      restauranteId: overrides?.restauranteId ?? 'rest-123',
      nome: overrides?.nome ?? 'Combo Família',
      descricao: 'Promoção com hamburger e batata',
      precoBundle: Dinheiro.criar(3590, 'BRL'),
      imagemUrl: null,
      itens: [
        { produtoId: 'prod-1', quantidade: 1 },
        { produtoId: 'prod-2', quantidade: 1 },
      ],
      ativo: overrides?.ativo ?? true,
    });
  }

  describe('salvar', () => {
    it('deve salvar e retornar combo', async () => {
      const combo = criarComboValido();

      const resultado = await repository.salvar(combo);

      expect(resultado).toBeDefined();
      expect(resultado.nome).toBe('Combo Família');
    });

    it('deve persistir combo no banco', async () => {
      const combo = criarComboValido();
      await repository.salvar(combo);

      const existente = await db.combos.get(combo.id);
      expect(existente).not.toBeUndefined();
      expect(existente!.nome).toBe('Combo Família');
    });
  });

  describe('buscarPorId', () => {
    it('deve encontrar combo por id', async () => {
      const combo = criarComboValido();
      await repository.salvar(combo);

      const resultado = await repository.buscarPorId(combo.id);

      expect(resultado).not.toBeNull();
      expect(resultado!.id).toBe(combo.id);
      expect(resultado!.nome).toBe('Combo Família');
    });

    it('deve retornar null quando combo nao existe', async () => {
      const resultado = await repository.buscarPorId('id-inexistente');
      expect(resultado).toBeNull();
    });
  });

  describe('buscarPorRestaurante', () => {
    it('deve retornar todos os combos do restaurante', async () => {
      const c1 = criarComboValido({ id: 'combo-1', nome: 'Combo 1', restauranteId: 'rest-123' });
      const c2 = criarComboValido({ id: 'combo-2', nome: 'Combo 2', restauranteId: 'rest-123' });
      const c3 = criarComboValido({ id: 'combo-3', nome: 'Combo 3', restauranteId: 'rest-outro' });
      await repository.salvar(c1);
      await repository.salvar(c2);
      await repository.salvar(c3);

      const resultado = await repository.buscarPorRestaurante('rest-123');

      expect(resultado).toHaveLength(2);
      expect(resultado.map((c) => c.nome)).toContain('Combo 1');
      expect(resultado.map((c) => c.nome)).toContain('Combo 2');
    });

    it('deve retornar array vazio quando restaurante nao tem combos', async () => {
      const resultado = await repository.buscarPorRestaurante('rest-sem-combos');
      expect(resultado).toHaveLength(0);
    });
  });

  describe('buscarAtivos', () => {
    it('deve retornar apenas combos ativos do restaurante', async () => {
      const c1 = criarComboValido({ id: 'combo-1', nome: 'Ativo', ativo: true });
      const c2 = criarComboValido({ id: 'combo-2', nome: 'Inativo', ativo: false });
      await repository.salvar(c1);
      await repository.salvar(c2);

      const resultado = await repository.buscarAtivos('rest-123');

      expect(resultado).toHaveLength(1);
      expect(resultado[0].nome).toBe('Ativo');
      expect(resultado[0].ativo).toBe(true);
    });

    it('deve retornar array vazio quando nenhum combo ativo', async () => {
      const c = criarComboValido({ ativo: false });
      await repository.salvar(c);

      const resultado = await repository.buscarAtivos('rest-123');

      expect(resultado).toHaveLength(0);
    });
  });

  describe('excluir', () => {
    it('deve remover combo do banco', async () => {
      const combo = criarComboValido();
      await repository.salvar(combo);

      await repository.excluir(combo.id);

      const existente = await db.combos.get(combo.id);
      expect(existente).toBeUndefined();
    });

    it('deve permitir excluir id inexistente sem erro', async () => {
      await expect(repository.excluir('id-inexistente')).resolves.toBeUndefined();
    });
  });

  describe('reconstrucao de dados', () => {
    it('deve reconstruir precoBundle corretamente', async () => {
      const combo = criarComboValido({ nome: 'Combo Preço' });
      await repository.salvar(combo);

      const resultado = await repository.buscarPorId(combo.id);

      expect(resultado).not.toBeNull();
      expect(resultado!.precoBundle.valor).toBe(3590);
      expect(resultado!.precoBundle.moeda).toBe('BRL');
    });

    it('deve reconstruir itens do combo corretamente', async () => {
      const combo = criarComboValido();
      await repository.salvar(combo);

      const resultado = await repository.buscarPorId(combo.id);

      expect(resultado).not.toBeNull();
      expect(resultado!.itens).toHaveLength(2);
      expect(resultado!.itens[0]).toEqual({ produtoId: 'prod-1', quantidade: 1 });
      expect(resultado!.itens[1]).toEqual({ produtoId: 'prod-2', quantidade: 1 });
    });
  });
});
