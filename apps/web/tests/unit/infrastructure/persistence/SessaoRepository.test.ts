import { describe, it, expect, beforeEach } from 'vitest';
import { SessaoRepository } from '@/infrastructure/persistence/autenticacao/SessaoRepository';
import { Sessao } from '@/domain/autenticacao/entities/Sessao';
import { createTestDatabase } from '../_test-helpers';

describe('SessaoRepository', () => {
  let repository: SessaoRepository;
  let db: ReturnType<typeof createTestDatabase>;

  beforeEach(async () => {
    db = createTestDatabase();
    await db.open();
    repository = new SessaoRepository(db);
  });

  function criarSessaoValida(overrides?: Partial<{ id: string; usuarioId: string; token: string; dispositivo: string }>): Sessao {
    return Sessao.criar({
      usuarioId: overrides?.usuarioId ?? 'usuario-123',
      token: overrides?.token ?? 'token-abc-xyz',
      expiracao: new Date(Date.now() + 24 * 60 * 60 * 1000),
      dispositivo: overrides?.dispositivo ?? 'Chrome/Mobile',
      id: overrides?.id,
    });
  }

  describe('create', () => {
    it('deve criar e retornar uma sessao', async () => {
      const sessao = criarSessaoValida();

      const resultado = await repository.create(sessao);

      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(sessao.id);
      expect(resultado.token).toBe('token-abc-xyz');
    });

    it('deve persistir sessao no banco', async () => {
      const sessao = criarSessaoValida();

      await repository.create(sessao);

      const existente = await db.sessoes.get(sessao.id);
      expect(existente).not.toBeNull();
      expect(existente!.token).toBe('token-abc-xyz');
    });
  });

  describe('findById', () => {
    it('deve encontrar sessao por id', async () => {
      const sessao = criarSessaoValida();
      await repository.create(sessao);

      const resultado = await repository.findById(sessao.id);

      expect(resultado).not.toBeNull();
      expect(resultado!.id).toBe(sessao.id);
    });

    it('deve retornar null quando sessao nao existe', async () => {
      const resultado = await repository.findById('id-inexistente');
      expect(resultado).toBeNull();
    });
  });

  describe('findByToken', () => {
    it('deve encontrar sessao por token', async () => {
      const sessao = criarSessaoValida();
      await repository.create(sessao);

      const resultado = await repository.findByToken('token-abc-xyz');

      expect(resultado).not.toBeNull();
      expect(resultado!.token).toBe('token-abc-xyz');
    });

    it('deve retornar null quando token nao existe', async () => {
      const resultado = await repository.findByToken('token-inexistente');
      expect(resultado).toBeNull();
    });
  });

  describe('findByUsuarioId', () => {
    it('deve encontrar sessoes por usuarioId', async () => {
      const s1 = criarSessaoValida({ token: 'token-1', id: 'sessao-1', usuarioId: 'outro-usuario' });
      const s2 = criarSessaoValida({ token: 'token-2', id: 'sessao-2', usuarioId: 'usuario-123' });
      const s3 = criarSessaoValida({ token: 'token-3', id: 'sessao-3', usuarioId: 'outro-usuario' });
      await repository.create(s1);
      await repository.create(s2);
      await repository.create(s3);

      const resultado = await repository.findByUsuarioId('usuario-123');

      expect(resultado).toHaveLength(1);
      expect(resultado[0].token).toBe('token-2');
    });
  });

  describe('delete', () => {
    it('deve remover sessao do banco', async () => {
      const sessao = criarSessaoValida();
      await repository.create(sessao);

      await repository.delete(sessao.id);

      const existente = await db.sessoes.get(sessao.id);
      expect(existente).toBeUndefined();
    });
  });

  describe('deleteByUsuarioId', () => {
    it('deve remover todas as sessoes do usuario', async () => {
      const s1 = criarSessaoValida({ token: 'token-1', id: 'sessao-1', usuarioId: 'usuario-multi' });
      const s2 = criarSessaoValida({ token: 'token-2', id: 'sessao-2', usuarioId: 'usuario-multi' });
      await repository.create(s1);
      await repository.create(s2);

      await repository.deleteByUsuarioId('usuario-multi');

      const restantes = await db.sessoes.where('usuarioId').equals('usuario-multi').toArray();
      expect(restantes).toHaveLength(0);
    });
  });

  describe('deleteExpiradas', () => {
    it('deve remover sessoes expiradas', async () => {
      const sessaoExpirada = Sessao.criar({
        usuarioId: 'usuario-exp',
        token: 'token-exp',
        expiracao: new Date(Date.now() - 1000), // já expirou
        dispositivo: 'Chrome',
      });
      const sessaoValida = criarSessaoValida({ id: 'sessao-valida', usuarioId: 'usuario-valido' });
      await repository.create(sessaoExpirada);
      await repository.create(sessaoValida);

      await repository.deleteExpiradas();

      const restantes = await db.sessoes.toArray();
      expect(restantes).toHaveLength(1);
      expect(restantes[0].id).toBe('sessao-valida');
    });
  });
});
