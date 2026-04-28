import { describe, it, expect } from 'vitest'
import { MetodoPagamento } from '@/domain/pedido/value-objects/MetodoPagamento'

describe('MetodoPagamento', () => {
  describe('valores estáticos', () => {
    it('deve ter PIX como "pix"', () => {
      expect(MetodoPagamento.PIX.props).toBe('pix')
    })

    it('deve ter CREDITO como "credito"', () => {
      expect(MetodoPagamento.CREDITO.props).toBe('credito')
    })

    it('deve ter DEBITO como "debito"', () => {
      expect(MetodoPagamento.DEBITO.props).toBe('debito')
    })
  })

  describe('fromValue', () => {
    it('deve retornar método correto para valor válido', () => {
      expect(MetodoPagamento.fromValue('pix')).toBe(MetodoPagamento.PIX)
      expect(MetodoPagamento.fromValue('credito')).toBe(MetodoPagamento.CREDITO)
      expect(MetodoPagamento.fromValue('debito')).toBe(MetodoPagamento.DEBITO)
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
      expect(MetodoPagamento.CREDITO.equals(MetodoPagamento.CREDITO)).toBe(true)
    })

    it('deve retornar false para métodos diferentes', () => {
      expect(MetodoPagamento.PIX.equals(MetodoPagamento.CREDITO)).toBe(false)
    })

    it('deve retornar false para objetos que não são MetodoPagamento', () => {
      expect(MetodoPagamento.PIX.equals({ props: 'pix' } as any)).toBe(false)
    })
  })

  describe('toString', () => {
    it('deve retornar string do valor', () => {
      expect(MetodoPagamento.PIX.toString()).toBe('pix')
      expect(MetodoPagamento.CREDITO.toString()).toBe('credito')
      expect(MetodoPagamento.DEBITO.toString()).toBe('debito')
    })
  })
})
