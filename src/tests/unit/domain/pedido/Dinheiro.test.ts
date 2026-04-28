import { describe, it, expect } from 'vitest';
import { Dinheiro } from '@/domain/pedido/value-objects/Dinheiro';

describe('Dinheiro', () => {
  describe('criar', () => {
    it('deve criar um Dinheiro com valor em centavos', () => {
      const dinheiro = Dinheiro.criar(1500, 'BRL');
      expect(dinheiro.reais).toBe(15);
      expect(dinheiro.moeda).toBe('BRL');
    });

    it('deve criar Dinheiro com valor zero', () => {
      const dinheiro = Dinheiro.criar(0, 'BRL');
      expect(dinheiro.valor).toBe(0);
    });
  });

  describe('criarDeReais', () => {
    it('deve criar um Dinheiro a partir de reais', () => {
      const dinheiro = Dinheiro.criarDeReais(15.50, 'BRL');
      expect(dinheiro.reais).toBe(15.5);
      expect(dinheiro.valor).toBe(1550);
    });
  });

  describe('somar', () => {
    it('deve somar dois Dinheiros', () => {
      const d1 = Dinheiro.criar(1000, 'BRL');
      const d2 = Dinheiro.criar(500, 'BRL');
      const resultado = d1.somar(d2);
      expect(resultado.valor).toBe(1500);
    });

    it('deve lançar erro ao somar moedas diferentes', () => {
      const d1 = Dinheiro.criar(1000, 'BRL');
      const d2 = Dinheiro.criar(500, 'USD');
      expect(() => d1.somar(d2)).toThrow('Não é possível somar moedas diferentes');
    });
  });

  describe('subtrair', () => {
    it('deve subtrair dois Dinheiros', () => {
      const d1 = Dinheiro.criar(1000, 'BRL');
      const d2 = Dinheiro.criar(300, 'BRL');
      const resultado = d1.subtrair(d2);
      expect(resultado.valor).toBe(700);
    });
  });

  describe('multiplicar', () => {
    it('deve multiplicar Dinheiro por fator', () => {
      const dinheiro = Dinheiro.criar(1000, 'BRL');
      const resultado = dinheiro.multiplicar(2);
      expect(resultado.valor).toBe(2000);
    });

    it('deve arredondar resultado da multiplicação', () => {
      const dinheiro = Dinheiro.criar(333, 'BRL');
      const resultado = dinheiro.multiplicar(3);
      expect(resultado.valor).toBe(999);
    });
  });

  describe('equals', () => {
    it('deve ser igual quando valores e moedas são iguais', () => {
      const d1 = Dinheiro.criar(1000, 'BRL');
      const d2 = Dinheiro.criar(1000, 'BRL');
      expect(d1.equals(d2)).toBe(true);
    });

    it('deve ser diferente quando valores são diferentes', () => {
      const d1 = Dinheiro.criar(1000, 'BRL');
      const d2 = Dinheiro.criar(2000, 'BRL');
      expect(d1.equals(d2)).toBe(false);
    });

    it('deve ser diferente quando moedas são diferentes', () => {
      const d1 = Dinheiro.criar(1000, 'BRL');
      const d2 = Dinheiro.criar(1000, 'USD');
      expect(d1.equals(d2)).toBe(false);
    });
  });

  describe('ZERO', () => {
    it('deve ter valor zero', () => {
      expect(Dinheiro.ZERO.valor).toBe(0);
      expect(Dinheiro.ZERO.moeda).toBe('BRL');
    });
  });
});
