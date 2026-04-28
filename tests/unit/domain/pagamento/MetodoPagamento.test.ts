import { describe, it, expect } from 'vitest'
import { MetodoPagamento } from '@/domain/pagamento/value-objects/MetodoPagamento'

describe('MetodoPagamento (pagamento)', () => {
  describe('valores estáticos', () => {
    it('deve ter PIX como "pix"', () => {
      expect(MetodoPagamento.PIX.props).toBe('pix')
    })
  })

  describe('fromValue', () => {
    it('deve retornar método correto para valor válido', () => {
      expect(MetodoPagamento.fromValue('pix')).toBe(MetodoPagamento.PIX)
    })

    it('deve lançar erro para método inválido', () => {
      expect(() => MetodoPagamento.fromValue('dinheiro')).toThrow('MetodoPagamento inválido: dinheiro')
    })

    it('deve lançar erro para string vazia', () => {
      expect(() => MetodoPagamento.fromValue('')).toThrow('MetodoPagamento inválido: ')
    })
  })

  describe('equals', () => {
    it('deve retornar true para métodos iguais', () => {
      expect(MetodoPagamento.PIX.equals(MetodoPagamento.PIX)).toBe(true)
    })

    it('deve retornar false para objetos que não são MetodoPagamento', () => {
      expect(MetodoPagamento.PIX.equals({ props: 'pix' } as any)).toBe(false)
    })
  })

  describe('toString', () => {
    it('deve retornar string do valor', () => {
      expect(MetodoPagamento.PIX.toString()).toBe('pix')
    })
  })
})
