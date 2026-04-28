import { describe, it, expect } from 'vitest';
import { Sessao, SessaoProps } from '@/domain/autenticacao/entities/Sessao';

describe('Sessao', () => {
  describe('criar', () => {
    it('deve criar uma sessão com ID gerado', () => {
      const props = {
        usuarioId: 'usuario-1',
        token: 'token-teste',
        expiracao: new Date(Date.now() + 3600000),
        dispositivo: 'Chrome',
      };

      const sessao = Sessao.criar(props);

      expect(sessao.id).toBeDefined();
      expect(sessao.usuarioId).toBe('usuario-1');
      expect(sessao.token).toBe('token-teste');
      expect(sessao.dispositivo).toBe('Chrome');
    });

    it('deve criar sessão com ID fornecido', () => {
      const props = {
        id: 'sessao-1',
        usuarioId: 'usuario-1',
        token: 'token-teste',
        expiracao: new Date(Date.now() + 3600000),
        dispositivo: 'Firefox',
      };

      const sessao = Sessao.criar(props);

      expect(sessao.id).toBe('sessao-1');
    });
  });

  describe('reconstruir', () => {
    it('deve reconstruir uma sessão a partir de props completas', () => {
      const props: SessaoProps = {
        id: 'sessao-1',
        usuarioId: 'usuario-1',
        token: 'token-teste',
        expiracao: new Date('2024-01-01'),
        dispositivo: 'Safari',
      };

      const sessao = Sessao.reconstruir(props);

      expect(sessao.id).toBe('sessao-1');
      expect(sessao.usuarioId).toBe('usuario-1');
      expect(sessao.token).toBe('token-teste');
      expect(sessao.dispositivo).toBe('Safari');
      expect(sessao.expiracao).toEqual(new Date('2024-01-01'));
    });
  });

  describe('estaExpirada', () => {
    it('deve retornar false para sessão não expirada', () => {
      const sessao = Sessao.criar({
        usuarioId: 'usuario-1',
        token: 'token-teste',
        expiracao: new Date(Date.now() + 3600000),
        dispositivo: 'Chrome',
      });

      expect(sessao.estaExpirada).toBe(false);
    });

    it('deve retornar true para sessão expirada', () => {
      const sessao = Sessao.criar({
        usuarioId: 'usuario-1',
        token: 'token-teste',
        expiracao: new Date(Date.now() - 1000),
        dispositivo: 'Chrome',
      });

      expect(sessao.estaExpirada).toBe(true);
    });
  });

  describe('equals', () => {
    it('deve ser igual quando IDs são iguais', () => {
      const sessao1 = Sessao.criar({
        id: 'sessao-1',
        usuarioId: 'usuario-1',
        token: 'token-1',
        expiracao: new Date(Date.now() + 3600000),
        dispositivo: 'Chrome',
      });

      const sessao2 = Sessao.reconstruir({
        id: 'sessao-1',
        usuarioId: 'usuario-2',
        token: 'token-2',
        expiracao: new Date(Date.now() + 7200000),
        dispositivo: 'Firefox',
      });

      expect(sessao1.equals(sessao2)).toBe(true);
    });

    it('deve ser diferente quando IDs são diferentes', () => {
      const sessao1 = Sessao.criar({
        usuarioId: 'usuario-1',
        token: 'token-teste',
        expiracao: new Date(Date.now() + 3600000),
        dispositivo: 'Chrome',
      });

      const sessao2 = Sessao.criar({
        usuarioId: 'usuario-1',
        token: 'token-teste',
        expiracao: new Date(Date.now() + 3600000),
        dispositivo: 'Chrome',
      });

      expect(sessao1.equals(sessao2)).toBe(false);
    });
  });
});
