import { describe, it, expect } from 'vitest'
import { ModificadorSelecionado } from '@/domain/pedido/value-objects/ModificadorSelecionado'

describe('ModificadorSelecionado', () => {
  describe('criação via construtor', () => {
    it('deve criar com props corretos', () => {
      const props = {
        grupoId: 'grupo-1',
        grupoNome: 'Bebidas',
        modificadorId: 'mod-1',
        modificadorNome: 'Coca-Cola',
        precoAdicional: 500, // 500 centavos = R$ 5,00
      }

      const mod = new ModificadorSelecionado(props)

      expect(mod.grupoId).toBe('grupo-1')
      expect(mod.grupoNome).toBe('Bebidas')
      expect(mod.modificadorId).toBe('mod-1')
      expect(mod.modificadorNome).toBe('Coca-Cola')
      expect(mod.precoAdicional).toBe(500)
    })
  })

  describe('getters', () => {
    it('deve retornar grupoId', () => {
      const mod = new ModificadorSelecionado({
        grupoId: 'grupo-abc',
        grupoNome: 'Sobremesas',
        modificadorId: 'mod-xyz',
        modificadorNome: 'Pudim',
        precoAdicional: 750,
      })

      expect(mod.grupoId).toBe('grupo-abc')
    })

    it('deve retornar grupoNome', () => {
      const mod = new ModificadorSelecionado({
        grupoId: 'g1',
        grupoNome: 'Entradas',
        modificadorId: 'm1',
        modificadorNome: 'Paozão',
        precoAdicional: 0,
      })

      expect(mod.grupoNome).toBe('Entradas')
    })

    it('deve retornar modificadorId', () => {
      const mod = new ModificadorSelecionado({
        grupoId: 'g1',
        grupoNome: 'Nome',
        modificadorId: 'mod-123',
        modificadorNome: 'Nome',
        precoAdicional: 0,
      })

      expect(mod.modificadorId).toBe('mod-123')
    })

    it('deve retornar modificadorNome', () => {
      const mod = new ModificadorSelecionado({
        grupoId: 'g1',
        grupoNome: 'Nome',
        modificadorId: 'm1',
        modificadorNome: 'Suco de Laranja',
        precoAdicional: 300,
      })

      expect(mod.modificadorNome).toBe('Suco de Laranja')
    })

    it('deve retornar precoAdicional', () => {
      const mod = new ModificadorSelecionado({
        grupoId: 'g1',
        grupoNome: 'Nome',
        modificadorId: 'm1',
        modificadorNome: 'Nome',
        precoAdicional: 1999,
      })

      expect(mod.precoAdicional).toBe(1999)
    })
  })

  describe('equals', () => {
    it('deve retornar true para mesmo modificadorId', () => {
      const mod1 = new ModificadorSelecionado({
        grupoId: 'grupo-1',
        grupoNome: 'Bebidas',
        modificadorId: 'mod-1',
        modificadorNome: 'Coca-Cola',
        precoAdicional: 500,
      })

      const mod2 = new ModificadorSelecionado({
        grupoId: 'grupo-2',
        grupoNome: 'Bebidas 2',
        modificadorId: 'mod-1', // mesmo id
        modificadorNome: 'Pepsi', // nome diferente, mas id igual
        precoAdicional: 400,
      })

      expect(mod1.equals(mod2)).toBe(true)
    })

    it('deve retornar false para modificadorId diferente', () => {
      const mod1 = new ModificadorSelecionado({
        grupoId: 'grupo-1',
        grupoNome: 'Bebidas',
        modificadorId: 'mod-1',
        modificadorNome: 'Coca-Cola',
        precoAdicional: 500,
      })

      const mod2 = new ModificadorSelecionado({
        grupoId: 'grupo-1',
        grupoNome: 'Bebidas',
        modificadorId: 'mod-2', // id diferente
        modificadorNome: 'Coca-Cola',
        precoAdicional: 500,
      })

      expect(mod1.equals(mod2)).toBe(false)
    })

    it('deve retornar false para objeto que não é ModificadorSelecionado', () => {
      const mod = new ModificadorSelecionado({
        grupoId: 'g1',
        grupoNome: 'Nome',
        modificadorId: 'm1',
        modificadorNome: 'Nome',
        precoAdicional: 0,
      })

      expect(mod.equals({ props: { grupoId: 'g1' } } as any)).toBe(false)
      expect(mod.equals(null)).toBe(false)
    })
  })
})
