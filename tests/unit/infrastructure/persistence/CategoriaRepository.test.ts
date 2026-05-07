import { describe, it, expect, beforeEach } from 'vitest';
import { CategoriaRepository } from '@/infrastructure/persistence/cardapio/CategoriaRepository';
import { Categoria } from '@/domain/cardapio/entities/Categoria';
import { createTestDatabase } from '../_test-helpers';

describe('CategoriaRepository', () => {
  let repository: CategoriaRepository;
  let db: ReturnType<typeof createTestDatabase>;

  beforeEach(async () => {
    db = createTestDatabase();
    await db.open();
    repository = new CategoriaRepository(db);
  });

  function criarCategoriaValida(overrides?: Partial<{ id: string; restauranteId: string; nome: string; ativo: boolean }>): Categoria {
    return Categoria.criar({
      restauranteId: overrides?.restauranteId ?? 'rest-123',
      nome: overrides?.nome ?? 'Bebidas',
      descricao: 'Descrição da categoria',
      imagemUrl: null,
      ordemExibicao: 1,
      ativo: overrides?.ativo ?? true,
      id: overrides?.id,
    });
  }

  describe('salvar', () => {
    it('deve salvar e retornar categoria', async () => {
      const categoria = criarCategoriaValida();

      const resultado = await repository.salvar(categoria);

      expect(resultado).toBeDefined();
      expect(resultado.nome).toBe('Bebidas');
    });

    it('deve persistir categoria no banco', async () => {
      const categoria = criarCategoriaValida();
      await repository.salvar(categoria);

      const existente = await db.categorias.get(categoria.id);
      expect(existente).not.toBeNull();
      expect(existente!.nome).toBe('Bebidas');
    });
  });

  describe('buscarPorId', () => {
    it('deve encontrar categoria por id', async () => {
      const categoria = criarCategoriaValida();
      await repository.salvar(categoria);

      const resultado = await repository.buscarPorId(categoria.id);

      expect(resultado).not.toBeNull();
      expect(resultado!.id).toBe(categoria.id);
    });

    it('deve retornar null quando categoria nao existe', async () => {
      const resultado = await repository.buscarPorId('id-inexistente');
      expect(resultado).toBeNull();
    });
  });

  describe('buscarPorRestaurante', () => {
    it('deve retornar todas as categorias do restaurante', async () => {
      const c1 = criarCategoriaValida({ id: 'cat-1', nome: 'Bebidas' });
      const c2 = criarCategoriaValida({ id: 'cat-2', nome: 'Pratos' });
      const c3 = criarCategoriaValida({ id: 'cat-3', nome: 'Sobremesas', restauranteId: 'outro-rest' });
      await repository.salvarMany([c1, c2, c3]);

      const resultado = await repository.buscarPorRestaurante('rest-123');

      expect(resultado).toHaveLength(2);
    });
  });

  describe('buscarAtivas', () => {
    it('deve retornar apenas categorias ativas', async () => {
      const c1 = criarCategoriaValida({ id: 'cat-1', nome: 'Ativa', ativo: true });
      const c2 = criarCategoriaValida({ id: 'cat-2', nome: 'Inativa', ativo: false });
      await repository.salvarMany([c1, c2]);

      const resultado = await repository.buscarAtivas('rest-123');

      expect(resultado).toHaveLength(1);
      expect(resultado[0].nome).toBe('Ativa');
    });
  });

  describe('salvarMany', () => {
    it('deve salvar múltiplas categorias', async () => {
      const c1 = criarCategoriaValida({ id: 'cat-1', nome: 'Bebidas' });
      const c2 = criarCategoriaValida({ id: 'cat-2', nome: 'Pratos' });
      await repository.salvarMany([c1, c2]);

      const todas = await repository.buscarPorRestaurante('rest-123');
      expect(todas).toHaveLength(2);
    });
  });

  describe('excluir', () => {
    it('deve remover categoria do banco', async () => {
      const categoria = criarCategoriaValida();
      await repository.salvar(categoria);

      await repository.excluir(categoria.id);

      const existente = await db.categorias.get(categoria.id);
      expect(existente).toBeUndefined();
    });
  });
});
