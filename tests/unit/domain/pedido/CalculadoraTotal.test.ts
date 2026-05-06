import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CalculadoraTotal } from '@/domain/pedido/services/CalculadoraTotal'
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro'
import type { ItemPedido } from '@/domain/pedido/entities/ItemPedido'

// Mock do ItemPedido
function createMockItemPedido(valorEmCentavos: number): ItemPedido {
  return {
    id: 'item-1',
    pedidoId: 'pedido-1',
    produtoId: 'produto-1',
    nome: 'Item Teste',
    precoUnitario: Dinheiro.criar(valorEmCentavos),
    quantidade: 1,
    modificadoresSelecionados: [],
    subtotal: Dinheiro.criar(valorEmCentavos),
    observacao: null,
  } as unknown as ItemPedido
}

describe('CalculadoraTotal', () => {
  let calculadora: CalculadoraTotal

  beforeEach(() => {
    calculadora = new CalculadoraTotal()
  })

  describe('calcular', () => {
    it('deve retornar zeros para lista vazia', () => {
      const resultado = calculadora.calcular([])

      expect(resultado.subtotal).toEqual(Dinheiro.ZERO)
      expect(resultado.tax).toEqual(Dinheiro.ZERO)
      expect(resultado.total).toEqual(Dinheiro.ZERO)
    })

    it('deve calcular subtotal sem taxa', () => {
      const itens = [
        createMockItemPedido(1000), // R$ 10,00
        createMockItemPedido(2500), // R$ 25,00
      ]

      const resultado = calculadora.calcular(itens)

      expect(resultado.subtotal.valor).toBe(3500)
      expect(resultado.tax.valor).toBe(0)
      expect(resultado.total.valor).toBe(3500)
    })

    it('deve calcular com taxa de serviço de 10%', () => {
      const itens = [createMockItemPedido(1000)] // R$ 10,00

      const resultado = calculadora.calcular(itens, 0.1)

      expect(resultado.subtotal.valor).toBe(1000)
      expect(resultado.tax.valor).toBe(100) // 10% de 1000 = 100
      expect(resultado.total.valor).toBe(1100)
    })

    it('deve calcular com taxa de serviço personalizada', () => {
      const itens = [createMockItemPedido(2000)] // R$ 20,00

      const resultado = calculadora.calcular(itens, 0.05) // 5%

      expect(resultado.subtotal.valor).toBe(2000)
      expect(resultado.tax.valor).toBe(100) // 5% de 2000 = 100
      expect(resultado.total.valor).toBe(2100)
    })

    it('deve arredondar taxa para cima', () => {
      const itens = [createMockItemPedido(333)] // R$ 3,33

      const resultado = calculadora.calcular(itens, 0.1) // 10%

      expect(resultado.subtotal.valor).toBe(333)
      expect(resultado.tax.valor).toBe(33) // Math.round(333 * 0.1) = 33
      expect(resultado.total.valor).toBe(366)
    })
  })

  describe('calcularSubtotal', () => {
    it('deve retornar ZERO para lista vazia', () => {
      const resultado = calculadora.calcularSubtotal([])

      expect(resultado).toEqual(Dinheiro.ZERO)
    })

    it('deve somar todos os itens', () => {
      const itens = [
        createMockItemPedido(500),
        createMockItemPedido(300),
        createMockItemPedido(200),
      ]

      const resultado = calculadora.calcularSubtotal(itens)

      expect(resultado.valor).toBe(1000)
    })
  })

  describe('calcularTaxa', () => {
    it('deve calcular taxa de 10%', () => {
      const subtotal = Dinheiro.criar(1000) // R$ 10,00

      const resultado = calculadora.calcularTaxa(subtotal, 0.1)

      expect(resultado.valor).toBe(100)
    })

    it('deve arredondar taxa', () => {
      const subtotal = Dinheiro.criar(333)

      const resultado = calculadora.calcularTaxa(subtotal, 0.1)

      expect(resultado.valor).toBe(33)
    })

    it('deve manter a moeda do subtotal', () => {
      const subtotal = Dinheiro.criar(1000, 'USD')

      const resultado = calculadora.calcularTaxa(subtotal, 0.1)

      expect(resultado.moeda).toBe('USD')
    })
  })
})
