import { describe, it, expect } from 'vitest';
import { LabelDietetico } from '@/domain/cardapio/value-objects/LabelDietetico';

describe('LabelDietetico', () => {
  describe('constantes', () => {
    it('deve ter VEGETARIANO com valor "vegetariano"', () => {
      expect(LabelDietetico.VEGETARIANO.toString()).toBe('vegetariano');
    });

    it('deve ter VEGANO com valor "vegano"', () => {
      expect(LabelDietetico.VEGANO.toString()).toBe('vegano');
    });

    it('deve ter GLUTEN_FREE com valor "glutenFree"', () => {
      expect(LabelDietetico.GLUTEN_FREE.toString()).toBe('glutenFree');
    });

    it('deve ter SUGAR_FREE com valor "sugarFree"', () => {
      expect(LabelDietetico.SUGAR_FREE.toString()).toBe('sugarFree');
    });

    it('deve ter DAIRY_FREE com valor "dairyFree"', () => {
      expect(LabelDietetico.DAIRY_FREE.toString()).toBe('dairyFree');
    });

    it('deve ter ORGANIC com valor "organic"', () => {
      expect(LabelDietetico.ORGANIC.toString()).toBe('organic');
    });

    it('deve ter SPICY com valor "spicy"', () => {
      expect(LabelDietetico.SPICY.toString()).toBe('spicy');
    });

    it('deve ter LOW_CARB com valor "lowCarb"', () => {
      expect(LabelDietetico.LOW_CARB.toString()).toBe('lowCarb');
    });
  });

  describe('fromValue', () => {
    it('deve criar label a partir de string válida', () => {
      expect(LabelDietetico.fromValue('vegetariano')).toBe(LabelDietetico.VEGETARIANO);
      expect(LabelDietetico.fromValue('vegano')).toBe(LabelDietetico.VEGANO);
      expect(LabelDietetico.fromValue('glutenFree')).toBe(LabelDietetico.GLUTEN_FREE);
      expect(LabelDietetico.fromValue('sugarFree')).toBe(LabelDietetico.SUGAR_FREE);
      expect(LabelDietetico.fromValue('dairyFree')).toBe(LabelDietetico.DAIRY_FREE);
      expect(LabelDietetico.fromValue('organic')).toBe(LabelDietetico.ORGANIC);
      expect(LabelDietetico.fromValue('spicy')).toBe(LabelDietetico.SPICY);
      expect(LabelDietetico.fromValue('lowCarb')).toBe(LabelDietetico.LOW_CARB);
    });

    it('deve lançar erro para valor inválido', () => {
      expect(() => LabelDietetico.fromValue('label-invalido')).toThrow(
        'LabelDietetico inválido: label-invalido'
      );
    });
  });

  describe('fromArray', () => {
    it('deve criar array de labels a partir de strings', () => {
      const labels = LabelDietetico.fromArray(['vegetariano', 'vegano', 'glutenFree']);

      expect(labels).toHaveLength(3);
      expect(labels[0]).toBe(LabelDietetico.VEGETARIANO);
      expect(labels[1]).toBe(LabelDietetico.VEGANO);
      expect(labels[2]).toBe(LabelDietetico.GLUTEN_FREE);
    });

    it('deve lançar erro se array contém valor inválido', () => {
      expect(() => LabelDietetico.fromArray(['vegetariano', 'invalido'])).toThrow();
    });
  });

  describe('equals', () => {
    it('deve retornar true para mesmo label', () => {
      expect(LabelDietetico.VEGETARIANO.equals(LabelDietetico.VEGETARIANO)).toBe(true);
    });

    it('deve retornar false para labels diferentes', () => {
      expect(LabelDietetico.VEGETARIANO.equals(LabelDietetico.VEGANO)).toBe(false);
    });
  });

  describe('toString', () => {
    it('deve retornar o valor do label', () => {
      expect(LabelDietetico.VEGETARIANO.toString()).toBe('vegetariano');
      expect(LabelDietetico.VEGANO.toString()).toBe('vegano');
    });
  });
});
