import { describe, it, expect } from 'vitest'
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro'

describe('Dinheiro', () => {
  describe('constantes', () => {
    it('deve ter ZERO com valor 0 e moeda BRL', () => {
      expect(Dinheiro.ZERO.valor).toBe(0)
      expect(Dinheiro.ZERO.moeda).toBe('BRL')
    })

    it('deve ter BRL como "BRL"', () => {
      expect(Dinheiro.BRL).toBe('BRL')
    })
  })

  describe('criar', () => {
    it('deve criar Dinheiro com valor em centavos', () => {
      const dinheiro = Dinheiro.criar(1500)

      expect(dinheiro.valor).toBe(1500)
      expect(dinheiro.moeda).toBe('BRL')
    })

    it('deve criar Dinheiro com moeda customizada', () => {
      const dinheiro = Dinheiro.criar(2000, 'USD')

      expect(dinheiro.valor).toBe(2000)
      expect(dinheiro.moeda).toBe('USD')
    })
  })

  describe('criarDeReais', () => {
    it('deve criar Dinheiro a partir de reais', () => {
      const dinheiro = Dinheiro.criarDeReais(15.50)

      expect(dinheiro.valor).toBe(1550)
      expect(dinheiro.moeda).toBe('BRL')
    })

    it('deve arredondar valores com muitas casas decimais', () => {
      const dinheiro = Dinheiro.criarDeReais(10.999)

      expect(dinheiro.valor).toBe(1100)
    })

    it('deve criar com moeda customizada', () => {
      const dinheiro = Dinheiro.criarDeReais(20.00, 'EUR')

      expect(dinheiro.valor).toBe(2000)
      expect(dinheiro.moeda).toBe('EUR')
    })
  })

  describe('reais getter', () => {
    it('deve converter valor em centavos para reais', () => {
      const dinheiro = Dinheiro.criar(1550)

      expect(dinheiro.reais).toBe(15.50)
    })

    it('deve retornar 0 para ZERO', () => {
      expect(Dinheiro.ZERO.reais).toBe(0)
    })
  })

  describe('somar', () => {
    it('deve somar dois Dinheiros com mesma moeda', () => {
      const a = Dinheiro.criar(1000)
      const b = Dinheiro.criar(500)

      const resultado = a.somar(b)

      expect(resultado.valor).toBe(1500)
      expect(resultado.moeda).toBe('BRL')
    })

    it('deve lançar erro ao somar moedas diferentes', () => {
      const a = Dinheiro.criar(1000, 'BRL')
      const b = Dinheiro.criar(500, 'USD')

      expect(() => a.somar(b)).toThrow('Não é possível somar moedas diferentes')
    })
  })

  describe('subtrair', () => {
    it('deve subtrair dois Dinheiros com mesma moeda', () => {
      const a = Dinheiro.criar(1000)
      const b = Dinheiro.criar(300)

      const resultado = a.subtrair(b)

      expect(resultado.valor).toBe(700)
      expect(resultado.moeda).toBe('BRL')
    })

    it('deve lançar erro ao subtrair moedas diferentes', () => {
      const a = Dinheiro.criar(1000, 'BRL')
      const b = Dinheiro.criar(500, 'EUR')

      expect(() => a.subtrair(b)).toThrow('Não é possível subtrair moedas diferentes')
    })
  })

  describe('multiplicar', () => {
    it('deve multiplicar Dinheiro por fator', () => {
      const dinheiro = Dinheiro.criar(1000)

      const resultado = dinheiro.multiplicar(2.5)

      expect(resultado.valor).toBe(2500)
    })

    it('deve arredondar resultado da multiplicação', () => {
      const dinheiro = Dinheiro.criar(999)

      const resultado = dinheiro.multiplicar(1.5)

      expect(resultado.valor).toBe(1499) // 999 * 1.5 = 1498.5 -> rounds to 1499
    })

    it('deve retornar ZERO ao multiplicar por 0', () => {
      const dinheiro = Dinheiro.criar(1000)

      const resultado = dinheiro.multiplicar(0)

      expect(resultado.valor).toBe(0)
    })
  })

  describe('equals', () => {
    it('deve retornar true para Dinheiros iguais', () => {
      const a = Dinheiro.criar(1000, 'BRL')
      const b = Dinheiro.criar(1000, 'BRL')

      expect(a.equals(b)).toBe(true)
    })

    it('deve retornar false para valores diferentes', () => {
      const a = Dinheiro.criar(1000, 'BRL')
      const b = Dinheiro.criar(2000, 'BRL')

      expect(a.equals(b)).toBe(false)
    })

    it('deve retornar false para moedas diferentes', () => {
      const a = Dinheiro.criar(1000, 'BRL')
      const b = Dinheiro.criar(1000, 'USD')

      expect(a.equals(b)).toBe(false)
    })

    it('deve retornar false para objetos que não são Dinheiro', () => {
      const dinheiro = Dinheiro.criar(1000)

      expect(dinheiro.equals({ valor: 1000 } as any)).toBe(false)
    })
  })
})
