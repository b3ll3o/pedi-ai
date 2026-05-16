import { describe, it, expect } from 'vitest'
import { TipoItemCardapio } from '@/domain/cardapio/value-objects/TipoItemCardapio'

describe('TipoItemCardapio', () => {
  describe('valores estáticos', () => {
    it('deve ter PRODUTO como "produto"', () => {
      expect(TipoItemCardapio.PRODUTO.props).toBe('produto')
    })

    it('deve ter COMBO como "combo"', () => {
      expect(TipoItemCardapio.COMBO.props).toBe('combo')
    })
  })

  describe('fromValue', () => {
    it('deve retornar PRODUTO para valor válido "produto"', () => {
      expect(TipoItemCardapio.fromValue('produto')).toBe(TipoItemCardapio.PRODUTO)
    })

    it('deve retornar COMBO para valor válido "combo"', () => {
      expect(TipoItemCardapio.fromValue('combo')).toBe(TipoItemCardapio.COMBO)
    })

    it('deve lançar erro para valor inválido', () => {
      expect(() => TipoItemCardapio.fromValue('kombo')).toThrow('TipoItemCardapio inválido: kombo')
    })

    it('deve lançar erro para string vazia', () => {
      expect(() => TipoItemCardapio.fromValue('')).toThrow('TipoItemCardapio inválido: ')
    })
  })

  describe('isProduto', () => {
    it('deve retornar true para PRODUTO', () => {
      expect(TipoItemCardapio.PRODUTO.isProduto()).toBe(true)
    })

    it('deve retornar false para COMBO', () => {
      expect(TipoItemCardapio.COMBO.isProduto()).toBe(false)
    })
  })

  describe('isCombo', () => {
    it('deve retornar true para COMBO', () => {
      expect(TipoItemCardapio.COMBO.isCombo()).toBe(true)
    })

    it('deve retornar false para PRODUTO', () => {
      expect(TipoItemCardapio.PRODUTO.isCombo()).toBe(false)
    })
  })

  describe('equals', () => {
    it('deve retornar true para tipos iguais', () => {
      expect(TipoItemCardapio.PRODUTO.equals(TipoItemCardapio.PRODUTO)).toBe(true)
      expect(TipoItemCardapio.COMBO.equals(TipoItemCardapio.COMBO)).toBe(true)
    })

    it('deve retornar false para tipos diferentes', () => {
      expect(TipoItemCardapio.PRODUTO.equals(TipoItemCardapio.COMBO)).toBe(false)
    })

    it('deve retornar false para objetos que não são TipoItemCardapio', () => {
      expect(TipoItemCardapio.PRODUTO.equals({ props: 'produto' } as any)).toBe(false)
    })
  })

  describe('toString', () => {
    it('deve retornar string do valor', () => {
      expect(TipoItemCardapio.PRODUTO.toString()).toBe('produto')
      expect(TipoItemCardapio.COMBO.toString()).toBe('combo')
    })
  })
})
