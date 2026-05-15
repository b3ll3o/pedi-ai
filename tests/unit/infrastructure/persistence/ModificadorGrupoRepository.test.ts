import { describe, it, expect, beforeEach } from 'vitest';
import { ModificadorGrupoRepository } from '@/infrastructure/persistence/cardapio/ModificadorGrupoRepository';
import { ModificadorGrupo } from '@/domain/cardapio/entities/ModificadorGrupo';
import { ModificadorValor } from '@/domain/cardapio/entities/ModificadorValor';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { createTestDatabase } from '../_test-helpers';

describe('ModificadorGrupoRepository', () => {
  let repository: ModificadorGrupoRepository;
  let db: ReturnType<typeof createTestDatabase>;

  beforeEach(async () => {
    db = createTestDatabase();
    await db.open();
    repository = new ModificadorGrupoRepository(db);
  });

  function criarModificadorValido(overrides?: Partial<{ id: string; nome: string; ativo: boolean; restauranteId: string }>): ModificadorGrupo {
    const valor = ModificadorValor.criar({
      nome: 'Borda Recheada',
      ajustePreco: Dinheiro.criar(500, 'BRL'),
    });
    return ModificadorGrupo.criar({
      restauranteId: overrides?.restauranteId ?? 'rest-123',
      nome: overrides?.nome ?? 'Adicionais',
      obrigatorio: false,
      minSelecoes: 0,
      maxSelecoes: 3,
      valores: [valor],
      ativo: overrides?.ativo ?? true,
      id: overrides?.id ?? 'mod-grupo-001',
    });
  }

  describe('salvar', () => {
    it('deve salvar e retornar grupo', async () => {
      const grupo = criarModificadorValido();

      const resultado = await repository.salvar(grupo);

      expect(resultado).toBeDefined();
      expect(resultado.nome).toBe('Adicionais');
    });

    it('deve persistir grupo no banco', async () => {
      const grupo = criarModificadorValido();
      await repository.salvar(grupo);

      const existente = await db.modificadores_grupo.get(grupo.id);
      expect(existente).not.toBeNull();
      expect(existente!.nome).toBe('Adicionais');
    });
  });

  describe('buscarPorId', () => {
    it('deve encontrar grupo por id', async () => {
      const grupo = criarModificadorValido();
      await repository.salvar(grupo);

      const resultado = await repository.buscarPorId(grupo.id);

      expect(resultado).not.toBeNull();
      expect(resultado!.id).toBe(grupo.id);
    });

    it('deve retornar null quando grupo nao existe', async () => {
      const resultado = await repository.buscarPorId('id-inexistente');
      expect(resultado).toBeNull();
    });
  });

  describe('buscarPorRestaurante', () => {
    it('deve retornar grupos do restaurante', async () => {
      const g1 = criarModificadorValido({ id: 'g1', nome: 'Grupo 1' });
      const g2 = criarModificadorValido({ id: 'g2', nome: 'Grupo 2', restauranteId: 'outro-rest' });
      await repository.salvarMany([g1, g2]);

      const resultado = await repository.buscarPorRestaurante('rest-123');

      expect(resultado).toHaveLength(1);
      expect(resultado[0].nome).toBe('Grupo 1');
    });
  });

  describe('salvarMany', () => {
    it('deve salvar múltiplos grupos', async () => {
      const g1 = criarModificadorValido({ id: 'g1' });
      const g2 = criarModificadorValido({ id: 'g2' });
      await repository.salvarMany([g1, g2]);

      const resultado = await repository.buscarPorRestaurante('rest-123');
      expect(resultado).toHaveLength(2);
    });
  });

  describe('excluir', () => {
    it('deve remover grupo do banco', async () => {
      const grupo = criarModificadorValido();
      await repository.salvar(grupo);

      await repository.excluir(grupo.id);

      const existente = await db.modificadores_grupo.get(grupo.id);
      expect(existente).toBeUndefined();
    });
  });
});
