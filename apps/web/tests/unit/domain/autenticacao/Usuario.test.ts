import { describe, it, expect } from 'vitest';
import { Usuario, UsuarioProps } from '@/domain/autenticacao/entities/Usuario';
import { Papel } from '@/domain/autenticacao/value-objects/Papel';

describe('Usuario', () => {
  describe('criar', () => {
    it('deve criar um usuário com ID e datas', () => {
      const props = {
        id: 'usuario-1',
        email: 'teste@exemplo.com',
        papel: Papel.DONO,
      };

      const usuario = Usuario.criar(props);

      expect(usuario.id).toBeDefined();
      expect(usuario.email).toBe('teste@exemplo.com');
      expect(usuario.papel).toEqual(Papel.DONO);
      expect(usuario.createdAt).toBeInstanceOf(Date);
      expect(usuario.updatedAt).toBeInstanceOf(Date);
    });

    it('deve criar usuário com restauranteId opcional', () => {
      const props = {
        id: 'usuario-1',
        email: 'teste@exemplo.com',
        papel: Papel.GERENTE,
        restauranteId: 'restaurante-1',
      };

      const usuario = Usuario.criar(props);

      expect(usuario.restauranteId).toBe('restaurante-1');
    });
  });

  describe('reconstruir', () => {
    it('deve reconstruir um usuário a partir de props completas', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');
      const props: UsuarioProps = {
        id: 'usuario-1',
        email: 'teste@exemplo.com',
        papel: Papel.CLIENTE,
        createdAt,
        updatedAt,
      };

      const usuario = Usuario.reconstruir(props);

      expect(usuario.id).toBe('usuario-1');
      expect(usuario.email).toBe('teste@exemplo.com');
      expect(usuario.papel).toEqual(Papel.CLIENTE);
      expect(usuario.createdAt).toEqual(createdAt);
      expect(usuario.updatedAt).toEqual(updatedAt);
    });
  });

  describe('eProprietario', () => {
    it('deve retornar true para dono', () => {
      const usuario = Usuario.criar({
        id: 'usuario-1',
        email: 'dono@exemplo.com',
        papel: Papel.DONO,
      });

      expect(usuario.eProprietario()).toBe(true);
    });

    it('deve retornar false para não-dono', () => {
      const usuario = Usuario.criar({
        id: 'usuario-1',
        email: 'gerente@exemplo.com',
        papel: Papel.GERENTE,
      });

      expect(usuario.eProprietario()).toBe(false);
    });
  });

  describe('eGerente', () => {
    it('deve retornar true para gerente', () => {
      const usuario = Usuario.criar({
        id: 'usuario-1',
        email: 'gerente@exemplo.com',
        papel: Papel.GERENTE,
      });

      expect(usuario.eGerente()).toBe(true);
    });
  });

  describe('eFuncionario', () => {
    it('deve retornar true para atendente', () => {
      const usuario = Usuario.criar({
        id: 'usuario-1',
        email: 'atendente@exemplo.com',
        papel: Papel.ATENDENTE,
      });

      expect(usuario.eFuncionario()).toBe(true);
    });
  });

  describe('eCliente', () => {
    it('deve retornar true para cliente', () => {
      const usuario = Usuario.criar({
        id: 'usuario-1',
        email: 'cliente@exemplo.com',
        papel: Papel.CLIENTE,
      });

      expect(usuario.eCliente()).toBe(true);
    });

    it('deve retornar false para não-cliente', () => {
      const usuario = Usuario.criar({
        id: 'usuario-1',
        email: 'dono@exemplo.com',
        papel: Papel.DONO,
      });

      expect(usuario.eCliente()).toBe(false);
    });
  });

  describe('podeAcessarRestaurante', () => {
    it('deve retornar false para cliente', () => {
      const usuario = Usuario.criar({
        id: 'usuario-1',
        email: 'cliente@exemplo.com',
        papel: Papel.CLIENTE,
      });

      expect(usuario.podeAcessarRestaurante('restaurante-1')).toBe(false);
    });

    it('deve retornar true para proprietario', () => {
      const usuario = Usuario.criar({
        id: 'usuario-1',
        email: 'dono@exemplo.com',
        papel: Papel.DONO,
      });

      expect(usuario.podeAcessarRestaurante('restaurante-1')).toBe(true);
      expect(usuario.podeAcessarRestaurante('restaurante-999')).toBe(true);
    });

    it('deve retornar true para usuário com restauranteId correspondente', () => {
      const usuario = Usuario.criar({
        id: 'usuario-1',
        email: 'gerente@exemplo.com',
        papel: Papel.GERENTE,
        restauranteId: 'restaurante-1',
      });

      expect(usuario.podeAcessarRestaurante('restaurante-1')).toBe(true);
      expect(usuario.podeAcessarRestaurante('restaurante-2')).toBe(false);
    });
  });

  describe('equals', () => {
    it('deve ser igual quando IDs são iguais', () => {
      const usuario1 = Usuario.criar({
        id: 'usuario-1',
        email: 'teste@exemplo.com',
        papel: Papel.CLIENTE,
      });

      const usuario2 = Usuario.reconstruir({
        id: 'usuario-1',
        email: 'outro@exemplo.com',
        papel: Papel.DONO,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(usuario1.equals(usuario2)).toBe(true);
    });

    it('deve ser diferente quando IDs são diferentes', () => {
      const usuario1 = Usuario.criar({
        id: 'usuario-1',
        email: 'teste@exemplo.com',
        papel: Papel.CLIENTE,
      });

      const usuario2 = Usuario.criar({
        id: 'usuario-2',
        email: 'teste@exemplo.com',
        papel: Papel.CLIENTE,
      });

      expect(usuario1.equals(usuario2)).toBe(false);
    });
  });

  describe('criadoEm e atualizadoEm (aliases)', () => {
    it('deve retornar createdAt como criadoEm', () => {
      const usuario = Usuario.criar({
        id: 'usuario-1',
        email: 'teste@exemplo.com',
        papel: Papel.CLIENTE,
      });

      expect(usuario.criadoEm).toEqual(usuario.createdAt);
    });

    it('deve retornar updatedAt como atualizadoEm', () => {
      const usuario = Usuario.criar({
        id: 'usuario-1',
        email: 'teste@exemplo.com',
        papel: Papel.CLIENTE,
      });

      expect(usuario.atualizadoEm).toEqual(usuario.updatedAt);
    });
  });
});
