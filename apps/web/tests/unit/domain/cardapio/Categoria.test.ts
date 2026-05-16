import { describe, it, expect } from 'vitest'
import { Categoria } from '@/domain/cardapio/entities/Categoria'

describe('Categoria', () => {
  describe('criar', () => {
    it('deve criar categoria com props e id gerado', () => {
      const props = {
        restauranteId: 'rest-123',
        nome: 'Bebidas',
        descricao: 'Todas as bebidas',
        imagemUrl: 'https://exemplo.com/bebidas.jpg',
        ordemExibicao: 1,
        ativo: true,
      }

      const categoria = Categoria.criar(props)

      expect(categoria.id).toBeDefined()
      expect(categoria.restauranteId).toBe('rest-123')
      expect(categoria.nome).toBe('Bebidas')
      expect(categoria.descricao).toBe('Todas as bebidas')
      expect(categoria.imagemUrl).toBe('https://exemplo.com/bebidas.jpg')
      expect(categoria.ordemExibicao).toBe(1)
      expect(categoria.ativo).toBe(true)
    })

    it('deve criar categoria com descricao null', () => {
      const props = {
        restauranteId: 'rest-123',
        nome: 'Bebidas',
        descricao: null,
        imagemUrl: null,
        ordemExibicao: 1,
        ativo: true,
      }

      const categoria = Categoria.criar(props)

      expect(categoria.descricao).toBeNull()
      expect(categoria.imagemUrl).toBeNull()
    })
  })

  describe('reconstruir', () => {
    it('deve reconstruir categoria com props existentes', () => {
      const props = {
        id: 'cat-123',
        restauranteId: 'rest-456',
        nome: 'Sobremesas',
        descricao: 'Doces e sobremesas',
        imagemUrl: 'https://exemplo.com/sobremesas.jpg',
        ordemExibicao: 2,
        ativo: false,
      }

      const categoria = Categoria.reconstruir(props)

      expect(categoria.id).toBe('cat-123')
      expect(categoria.restauranteId).toBe('rest-456')
      expect(categoria.nome).toBe('Sobremesas')
      expect(categoria.ativo).toBe(false)
    })
  })

  describe('getters', () => {
    it('deve retornar props corretos', () => {
      const categoria = Categoria.criar({
        restauranteId: 'rest-1',
        nome: 'Teste',
        descricao: 'Desc',
        imagemUrl: 'url',
        ordemExibicao: 5,
        ativo: true,
      })

      expect(categoria.restauranteId).toBe('rest-1')
      expect(categoria.nome).toBe('Teste')
      expect(categoria.descricao).toBe('Desc')
      expect(categoria.imagemUrl).toBe('url')
      expect(categoria.ordemExibicao).toBe(5)
      expect(categoria.ativo).toBe(true)
    })
  })

  describe('ativar/desativar', () => {
    it('deve ativar categoria inativa', () => {
      const categoria = Categoria.criar({
        restauranteId: 'rest-1',
        nome: 'Teste',
        descricao: null,
        imagemUrl: null,
        ordemExibicao: 1,
        ativo: false,
      })

      categoria.ativar()

      expect(categoria.ativo).toBe(true)
    })

    it('deve desativar categoria ativa', () => {
      const categoria = Categoria.criar({
        restauranteId: 'rest-1',
        nome: 'Teste',
        descricao: null,
        imagemUrl: null,
        ordemExibicao: 1,
        ativo: true,
      })

      categoria.desativar()

      expect(categoria.ativo).toBe(false)
    })
  })

  describe('atualizarNome', () => {
    it('deve atualizar nome da categoria', () => {
      const categoria = Categoria.criar({
        restauranteId: 'rest-1',
        nome: 'Antigo Nome',
        descricao: null,
        imagemUrl: null,
        ordemExibicao: 1,
        ativo: true,
      })

      categoria.atualizarNome('Novo Nome')

      expect(categoria.nome).toBe('Novo Nome')
    })
  })

  describe('atualizarDescricao', () => {
    it('deve atualizar descricao', () => {
      const categoria = Categoria.criar({
        restauranteId: 'rest-1',
        nome: 'Teste',
        descricao: 'Desc Antiga',
        imagemUrl: null,
        ordemExibicao: 1,
        ativo: true,
      })

      categoria.atualizarDescricao('Nova Descrição')

      expect(categoria.descricao).toBe('Nova Descrição')
    })

    it('deve permitir descricao null', () => {
      const categoria = Categoria.criar({
        restauranteId: 'rest-1',
        nome: 'Teste',
        descricao: 'Desc',
        imagemUrl: null,
        ordemExibicao: 1,
        ativo: true,
      })

      categoria.atualizarDescricao(null)

      expect(categoria.descricao).toBeNull()
    })
  })

  describe('atualizarOrdem', () => {
    it('deve atualizar ordem de exibição', () => {
      const categoria = Categoria.criar({
        restauranteId: 'rest-1',
        nome: 'Teste',
        descricao: null,
        imagemUrl: null,
        ordemExibicao: 1,
        ativo: true,
      })

      categoria.atualizarOrdem(10)

      expect(categoria.ordemExibicao).toBe(10)
    })
  })

  describe('equals', () => {
    it('deve retornar true para categorias com mesmo id', () => {
      const cat1 = Categoria.reconstruir({
        id: 'cat-123',
        restauranteId: 'rest-1',
        nome: 'Nome 1',
        descricao: null,
        imagemUrl: null,
        ordemExibicao: 1,
        ativo: true,
      })

      const cat2 = Categoria.reconstruir({
        id: 'cat-123',
        restauranteId: 'rest-2',
        nome: 'Nome 2',
        descricao: 'Diferente',
        imagemUrl: 'url',
        ordemExibicao: 5,
        ativo: false,
      })

      expect(cat1.equals(cat2)).toBe(true)
    })

    it('deve retornar false para categorias com id diferente', () => {
      const cat1 = Categoria.criar({
        restauranteId: 'rest-1',
        nome: 'Nome',
        descricao: null,
        imagemUrl: null,
        ordemExibicao: 1,
        ativo: true,
      })

      const cat2 = Categoria.criar({
        restauranteId: 'rest-1',
        nome: 'Nome',
        descricao: null,
        imagemUrl: null,
        ordemExibicao: 1,
        ativo: true,
      })

      expect(cat1.equals(cat2)).toBe(false)
    })
  })
})
