import { describe, it, expect } from 'vitest';
import { TipoItemCardapio } from '@/domain/cardapio/value-objects/TipoItemCardapio';

describe('TipoItemCardapio', () => {
  describe('constantes', () => {
    it('deve ter PRODUTO com valor "produto"', () => {
      expect(TipoItemCardapio.PRODUTO.toString()).toBe('produto');
    });

    it('deve ter COMBO com valor "combo"', () => {
      expect(TipoItemCardapio.COMBO.toString()).toBe('combo');
    });
  });

  describe('fromValue', () => {
    it('deve criar PRODUTO a partir de "produto"', () => {
      expect(TipoItemCardapio.fromValue('produto')).toBe(TipoItemCardapio.PRODUTO);
    });

    it('deve criar COMBO a partir de "combo"', () => {
      expect(TipoItemCardapio.fromValue('combo')).toBe(TipoItemCardapio.COMBO);
    });

    it('deve lançar erro para valor inválido', () => {
      expect(() => TipoItemCardapio.fromValue('tipo-invalido')).toThrow(
        'TipoItemCardapio inválido: tipo-invalido'
      );
    });
  });

  describe('isProduto', () => {
    it('deve retornar true para PRODUTO', () => {
      expect(TipoItemCardapio.PRODUTO.isProduto()).toBe(true);
    });

    it('deve retornar false para COMBO', () => {
      expect(TipoItemCardapio.COMBO.isProduto()).toBe(false);
    });
  });

  describe('isCombo', () => {
    it('deve retornar true para COMBO', () => {
      expect(TipoItemCardapio.COMBO.isCombo()).toBe(true);
    });

    it('deve retornar false para PRODUTO', () => {
      expect(TipoItemCardapio.PRODUTO.isCombo()).toBe(false);
    });
  });

  describe('equals', () => {
    it('deve retornar true para mesmo tipo', () => {
      expect(TipoItemCardapio.PRODUTO.equals(TipoItemCardapio.PRODUTO)).toBe(true);
    });

    it('deve retornar false para tipos diferentes', () => {
      expect(TipoItemCardapio.PRODUTO.equals(TipoItemCardapio.COMBO)).toBe(false);
    });
  });

  describe('toString', () => {
    it('deve retornar o valor do tipo', () => {
      expect(TipoItemCardapio.PRODUTO.toString()).toBe('produto');
      expect(TipoItemCardapio.COMBO.toString()).toBe('combo');
    });
  });
});
