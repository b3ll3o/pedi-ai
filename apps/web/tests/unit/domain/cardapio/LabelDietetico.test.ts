import { describe, it, expect } from 'vitest'
import { LabelDietetico } from '@/domain/cardapio/value-objects/LabelDietetico'

describe('LabelDietetico', () => {
  describe('valores estáticos', () => {
    it('deve ter VEGETARIANO como "vegetariano"', () => {
      expect(LabelDietetico.VEGETARIANO.props).toBe('vegetariano')
    })

    it('deve ter VEGANO como "vegano"', () => {
      expect(LabelDietetico.VEGANO.props).toBe('vegano')
    })

    it('deve ter GLUTEN_FREE como "glutenFree"', () => {
      expect(LabelDietetico.GLUTEN_FREE.props).toBe('glutenFree')
    })

    it('deve ter SUGAR_FREE como "sugarFree"', () => {
      expect(LabelDietetico.SUGAR_FREE.props).toBe('sugarFree')
    })

    it('deve ter DAIRY_FREE como "dairyFree"', () => {
      expect(LabelDietetico.DAIRY_FREE.props).toBe('dairyFree')
    })

    it('deve ter ORGANIC como "organic"', () => {
      expect(LabelDietetico.ORGANIC.props).toBe('organic')
    })

    it('deve ter SPICY como "spicy"', () => {
      expect(LabelDietetico.SPICY.props).toBe('spicy')
    })

    it('deve ter LOW_CARB como "lowCarb"', () => {
      expect(LabelDietetico.LOW_CARB.props).toBe('lowCarb')
    })
  })

  describe('fromValue', () => {
    it('deve retornar label correto para valor válido', () => {
      expect(LabelDietetico.fromValue('vegetariano')).toBe(LabelDietetico.VEGETARIANO)
      expect(LabelDietetico.fromValue('vegano')).toBe(LabelDietetico.VEGANO)
      expect(LabelDietetico.fromValue('glutenFree')).toBe(LabelDietetico.GLUTEN_FREE)
      expect(LabelDietetico.fromValue('sugarFree')).toBe(LabelDietetico.SUGAR_FREE)
      expect(LabelDietetico.fromValue('dairyFree')).toBe(LabelDietetico.DAIRY_FREE)
      expect(LabelDietetico.fromValue('organic')).toBe(LabelDietetico.ORGANIC)
      expect(LabelDietetico.fromValue('spicy')).toBe(LabelDietetico.SPICY)
      expect(LabelDietetico.fromValue('lowCarb')).toBe(LabelDietetico.LOW_CARB)
    })

    it('deve lançar erro para label inválido', () => {
      expect(() => LabelDietetico.fromValue('keto')).toThrow('LabelDietetico inválido: keto')
    })

    it('deve lançar erro para string vazia', () => {
      expect(() => LabelDietetico.fromValue('')).toThrow('LabelDietetico inválido: ')
    })
  })

  describe('fromArray', () => {
    it('deve converter array de valores para array de labels', () => {
      const result = LabelDietetico.fromArray(['vegetariano', 'vegano'])

      expect(result).toHaveLength(2)
      expect(result[0]).toBe(LabelDietetico.VEGETARIANO)
      expect(result[1]).toBe(LabelDietetico.VEGANO)
    })

    it('deve lançar erro se qualquer valor for inválido', () => {
      expect(() => LabelDietetico.fromArray(['vegetariano', 'keto'])).toThrow('LabelDietetico inválido: keto')
    })

    it('deve retornar array vazio para array vazio', () => {
      const result = LabelDietetico.fromArray([])
      expect(result).toHaveLength(0)
    })
  })

  describe('equals', () => {
    it('deve retornar true para labels iguais', () => {
      expect(LabelDietetico.VEGETARIANO.equals(LabelDietetico.VEGETARIANO)).toBe(true)
      expect(LabelDietetico.VEGANO.equals(LabelDietetico.VEGANO)).toBe(true)
    })

    it('deve retornar false para labels diferentes', () => {
      expect(LabelDietetico.VEGETARIANO.equals(LabelDietetico.VEGANO)).toBe(false)
    })

    it('deve retornar false para objetos que não são LabelDietetico', () => {
      expect(LabelDietetico.VEGETARIANO.equals({ props: 'vegetariano' } as any)).toBe(false)
    })
  })

  describe('toString', () => {
    it('deve retornar string do valor', () => {
      expect(LabelDietetico.VEGETARIANO.toString()).toBe('vegetariano')
      expect(LabelDietetico.GLUTEN_FREE.toString()).toBe('glutenFree')
      expect(LabelDietetico.LOW_CARB.toString()).toBe('lowCarb')
    })
  })
})
