import { describe, it, expect } from 'vitest';
import { Papel } from '@/domain/autenticacao/value-objects/Papel';

describe('Papel', () => {
  describe('constantes', () => {
    it('deve ter DONO com valor "dono"', () => {
      expect(Papel.DONO.value).toBe('dono');
    });

    it('deve ter GERENTE com valor "gerente"', () => {
      expect(Papel.GERENTE.value).toBe('gerente');
    });

    it('deve ter ATENDENTE com valor "atendente"', () => {
      expect(Papel.ATENDENTE.value).toBe('atendente');
    });

    it('deve ter CLIENTE com valor "cliente"', () => {
      expect(Papel.CLIENTE.value).toBe('cliente');
    });
  });

  describe('fromValue', () => {
    it('deve criar DONO a partir do valor "dono"', () => {
      const papel = Papel.fromValue('dono');
      expect(papel).toBe(Papel.DONO);
    });

    it('deve criar GERENTE a partir do valor "gerente"', () => {
      const papel = Papel.fromValue('gerente');
      expect(papel).toBe(Papel.GERENTE);
    });

    it('deve criar ATENDENTE a partir do valor "atendente"', () => {
      const papel = Papel.fromValue('atendente');
      expect(papel).toBe(Papel.ATENDENTE);
    });

    it('deve criar CLIENTE a partir do valor "cliente"', () => {
      const papel = Papel.fromValue('cliente');
      expect(papel).toBe(Papel.CLIENTE);
    });

    it('deve lançar erro para valor inválido', () => {
      expect(() => Papel.fromValue('papel-invalido')).toThrow('Papel inválido: papel-invalido');
    });
  });

  describe('isDono', () => {
    it('deve retornar true para DONO', () => {
      expect(Papel.isDono(Papel.DONO)).toBe(true);
    });

    it('deve retornar false para outros papéis', () => {
      expect(Papel.isDono(Papel.GERENTE)).toBe(false);
      expect(Papel.isDono(Papel.ATENDENTE)).toBe(false);
      expect(Papel.isDono(Papel.CLIENTE)).toBe(false);
    });
  });

  describe('isGerente', () => {
    it('deve retornar true para GERENTE', () => {
      expect(Papel.isGerente(Papel.GERENTE)).toBe(true);
    });

    it('deve retornar false para outros papéis', () => {
      expect(Papel.isGerente(Papel.DONO)).toBe(false);
      expect(Papel.isGerente(Papel.ATENDENTE)).toBe(false);
      expect(Papel.isGerente(Papel.CLIENTE)).toBe(false);
    });
  });

  describe('isAtendente', () => {
    it('deve retornar true para ATENDENTE', () => {
      expect(Papel.isAtendente(Papel.ATENDENTE)).toBe(true);
    });

    it('deve retornar false para outros papéis', () => {
      expect(Papel.isAtendente(Papel.DONO)).toBe(false);
      expect(Papel.isAtendente(Papel.GERENTE)).toBe(false);
      expect(Papel.isAtendente(Papel.CLIENTE)).toBe(false);
    });
  });

  describe('isCliente', () => {
    it('deve retornar true para CLIENTE', () => {
      expect(Papel.isCliente(Papel.CLIENTE)).toBe(true);
    });

    it('deve retornar false para outros papéis', () => {
      expect(Papel.isCliente(Papel.DONO)).toBe(false);
      expect(Papel.isCliente(Papel.GERENTE)).toBe(false);
      expect(Papel.isCliente(Papel.ATENDENTE)).toBe(false);
    });
  });

  describe('equals', () => {
    it('deve retornar true para mesmo papel', () => {
      expect(Papel.DONO.equals(Papel.DONO)).toBe(true);
    });

    it('deve retornar false para papéis diferentes', () => {
      expect(Papel.DONO.equals(Papel.GERENTE)).toBe(false);
    });
  });

  describe('toString', () => {
    it('deve retornar o valor do papel', () => {
      expect(Papel.DONO.toString()).toBe('dono');
      expect(Papel.GERENTE.toString()).toBe('gerente');
      expect(Papel.ATENDENTE.toString()).toBe('atendente');
      expect(Papel.CLIENTE.toString()).toBe('cliente');
    });
  });
});
