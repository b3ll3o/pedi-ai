import { describe, it, expect } from 'vitest';
import { UsuarioRestaurante, UsuarioRestauranteProps } from '@/domain/admin/entities/UsuarioRestaurante';

describe('UsuarioRestaurante', () => {
  describe('eDono', () => {
    it('deve retornar true quando papel é dono', () => {
      const props: Omit<UsuarioRestauranteProps, 'id' | 'criadoEm'> = {
        usuarioId: 'usuario-1',
        restauranteId: 'restaurante-1',
        papel: 'dono',
      };

      const usuarioRestaurante = UsuarioRestaurante.criar(props);

      expect(usuarioRestaurante.eDono()).toBe(true);
    });

    it('deve retornar false quando papel não é dono', () => {
      const props: Omit<UsuarioRestauranteProps, 'id' | 'criadoEm'> = {
        usuarioId: 'usuario-1',
        restauranteId: 'restaurante-1',
        papel: 'gerente',
      };

      const usuarioRestaurante = UsuarioRestaurante.criar(props);

      expect(usuarioRestaurante.eDono()).toBe(false);
    });
  });

  describe('eGerente', () => {
    it('deve retornar true quando papel é gerente', () => {
      const props: Omit<UsuarioRestauranteProps, 'id' | 'criadoEm'> = {
        usuarioId: 'usuario-1',
        restauranteId: 'restaurante-1',
        papel: 'gerente',
      };

      const usuarioRestaurante = UsuarioRestaurante.criar(props);

      expect(usuarioRestaurante.eGerente()).toBe(true);
    });

    it('deve retornar false quando papel não é gerente', () => {
      const props: Omit<UsuarioRestauranteProps, 'id' | 'criadoEm'> = {
        usuarioId: 'usuario-1',
        restauranteId: 'restaurante-1',
        papel: 'atendente',
      };

      const usuarioRestaurante = UsuarioRestaurante.criar(props);

      expect(usuarioRestaurante.eGerente()).toBe(false);
    });
  });

  describe('eFuncionario', () => {
    it('deve retornar true quando papel é atendente', () => {
      const props: Omit<UsuarioRestauranteProps, 'id' | 'criadoEm'> = {
        usuarioId: 'usuario-1',
        restauranteId: 'restaurante-1',
        papel: 'atendente',
      };

      const usuarioRestaurante = UsuarioRestaurante.criar(props);

      expect(usuarioRestaurante.eFuncionario()).toBe(true);
    });

    it('deve retornar false quando papel não é atendente', () => {
      const props: Omit<UsuarioRestauranteProps, 'id' | 'criadoEm'> = {
        usuarioId: 'usuario-1',
        restauranteId: 'restaurante-1',
        papel: 'dono',
      };

      const usuarioRestaurante = UsuarioRestaurante.criar(props);

      expect(usuarioRestaurante.eFuncionario()).toBe(false);
    });
  });

  describe('criar', () => {
    it('deve criar um UsuarioRestaurante com ID e data de criação', () => {
      const props: Omit<UsuarioRestauranteProps, 'id' | 'criadoEm'> = {
        usuarioId: 'usuario-1',
        restauranteId: 'restaurante-1',
        papel: 'dono',
      };

      const usuarioRestaurante = UsuarioRestaurante.criar(props);

      expect(usuarioRestaurante.id).toBeDefined();
      expect(usuarioRestaurante.usuarioId).toBe('usuario-1');
      expect(usuarioRestaurante.restauranteId).toBe('restaurante-1');
      expect(usuarioRestaurante.papel).toBe('dono');
      expect(usuarioRestaurante.criadoEm).toBeInstanceOf(Date);
    });
  });

  describe('reconstruir', () => {
    it('deve reconstruir um UsuarioRestaurante a partir de props completas', () => {
      const props: UsuarioRestauranteProps = {
        id: 'vinculo-1',
        usuarioId: 'usuario-1',
        restauranteId: 'restaurante-1',
        papel: 'gerente',
        criadoEm: new Date('2024-01-01'),
      };

      const usuarioRestaurante = UsuarioRestaurante.reconstruir(props);

      expect(usuarioRestaurante.id).toBe('vinculo-1');
      expect(usuarioRestaurante.usuarioId).toBe('usuario-1');
      expect(usuarioRestaurante.restauranteId).toBe('restaurante-1');
      expect(usuarioRestaurante.papel).toBe('gerente');
      expect(usuarioRestaurante.criadoEm).toEqual(new Date('2024-01-01'));
    });
  });
});
