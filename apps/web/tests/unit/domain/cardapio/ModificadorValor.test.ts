import { describe, it, expect } from 'vitest'
import { ModificadorValor } from '@/domain/cardapio/entities/ModificadorValor'
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro'

describe('ModificadorValor', () => {
  describe('criar', () => {
    it('deve criar modificador com props e id gerado', () => {
      const modificador = ModificadorValor.criar({
        modificadorGrupoId: 'grupo-1',
        nome: 'Extra Bacon',
        ajustePreco: Dinheiro.criar(350),
        ativo: true,
      })

      expect(modificador.id).toBeDefined()
      expect(modificador.modificadorGrupoId).toBe('grupo-1')
      expect(modificador.nome).toBe('Extra Bacon')
      expect(modificador.ajustePreco.valor).toBe(350)
      expect(modificador.ativo).toBe(true)
    })
  })

  describe('reconstruir', () => {
    it('deve reconstruir modificador com props existentes', () => {
      const props = {
        id: 'mod-123',
        modificadorGrupoId: 'grupo-1',
        restauranteId: 'rest-456',
        nome: 'Sem Cebola',
        ajustePreco: Dinheiro.criar(0),
        ativo: false,
      }

      const modificador = ModificadorValor.reconstruir(props)

      expect(modificador.id).toBe('mod-123')
      expect(modificador.modificadorGrupoId).toBe('grupo-1')
      expect(modificador.nome).toBe('Sem Cebola')
      expect(modificador.ativo).toBe(false)
    })
  })

  describe('ativar/desativar', () => {
    it('deve ativar modificador inativo', () => {
      const modificador = ModificadorValor.criar({
        modificadorGrupoId: 'grupo-1',
        nome: 'Teste',
        ajustePreco: Dinheiro.ZERO,
        ativo: false,
      })

      modificador.ativar()

      expect(modificador.ativo).toBe(true)
    })

    it('deve desativar modificador ativo', () => {
      const modificador = ModificadorValor.criar({
        modificadorGrupoId: 'grupo-1',
        nome: 'Teste',
        ajustePreco: Dinheiro.ZERO,
        ativo: true,
      })

      modificador.desativar()

      expect(modificador.ativo).toBe(false)
    })
  })

  describe('atualizarNome', () => {
    it('deve atualizar nome do modificador', () => {
      const modificador = ModificadorValor.criar({
        modificadorGrupoId: 'grupo-1',
        nome: 'Nome Antigo',
        ajustePreco: Dinheiro.ZERO,
        ativo: true,
      })

      modificador.atualizarNome('Nome Novo')

      expect(modificador.nome).toBe('Nome Novo')
    })
  })

  describe('atualizarAjustePreco', () => {
    it('deve atualizar ajuste de preço', () => {
      const modificador = ModificadorValor.criar({
        modificadorGrupoId: 'grupo-1',
        nome: 'Teste',
        ajustePreco: Dinheiro.criar(100),
        ativo: true,
      })

      modificador.atualizarAjustePreco(Dinheiro.criar(500))

      expect(modificador.ajustePreco.valor).toBe(500)
    })
  })

  describe('equals', () => {
    it('deve retornar true para modificadores com mesmo id', () => {
      const m1 = ModificadorValor.reconstruir({
        id: 'mod-igual',
        modificadorGrupoId: 'g1',
        nome: 'Nome 1',
        ajustePreco: Dinheiro.ZERO,
        ativo: true,
      })

      const m2 = ModificadorValor.reconstruir({
        id: 'mod-igual',
        modificadorGrupoId: 'g2',
        nome: 'Nome 2',
        ajustePreco: Dinheiro.criar(500),
        ativo: false,
      })

      expect(m1.equals(m2)).toBe(true)
    })

    it('deve retornar false para modificadores com id diferente', () => {
      const m1 = ModificadorValor.criar({
        modificadorGrupoId: 'g1',
        nome: 'Nome',
        ajustePreco: Dinheiro.ZERO,
        ativo: true,
      })

      const m2 = ModificadorValor.criar({
        modificadorGrupoId: 'g1',
        nome: 'Nome',
        ajustePreco: Dinheiro.ZERO,
        ativo: true,
      })

      expect(m1.equals(m2)).toBe(false)
    })
  })
})
