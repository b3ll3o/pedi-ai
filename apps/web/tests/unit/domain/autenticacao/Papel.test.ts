import { describe, it, expect } from 'vitest'
import { Papel } from '@/domain/autenticacao/value-objects/Papel'

describe('Papel', () => {
  describe('valores estáticos', () => {
    it('deve ter DONO como "dono"', () => {
      expect(Papel.DONO.props).toBe('dono')
    })

    it('deve ter GERENTE como "gerente"', () => {
      expect(Papel.GERENTE.props).toBe('gerente')
    })

    it('deve ter ATENDENTE como "atendente"', () => {
      expect(Papel.ATENDENTE.props).toBe('atendente')
    })

    it('deve ter CLIENTE como "cliente"', () => {
      expect(Papel.CLIENTE.props).toBe('cliente')
    })
  })

  describe('value getter', () => {
    it('deve retornar o valor do papel', () => {
      expect(Papel.DONO.value).toBe('dono')
      expect(Papel.GERENTE.value).toBe('gerente')
      expect(Papel.ATENDENTE.value).toBe('atendente')
      expect(Papel.CLIENTE.value).toBe('cliente')
    })
  })

  describe('fromValue', () => {
    it('deve retornar o papel correto para valor válido', () => {
      expect(Papel.fromValue('dono')).toBe(Papel.DONO)
      expect(Papel.fromValue('gerente')).toBe(Papel.GERENTE)
      expect(Papel.fromValue('atendente')).toBe(Papel.ATENDENTE)
      expect(Papel.fromValue('cliente')).toBe(Papel.CLIENTE)
    })

    it('deve lançar erro para valor inválido', () => {
      expect(() => Papel.fromValue('administrador')).toThrow('Papel inválido: administrador')
    })

    it('deve lançar erro para string vazia', () => {
      expect(() => Papel.fromValue('')).toThrow('Papel inválido: ')
    })
  })

  describe('métodos de verificação', () => {
    it('isDono deve retornar true apenas para DONO', () => {
      expect(Papel.isDono(Papel.DONO)).toBe(true)
      expect(Papel.isDono(Papel.GERENTE)).toBe(false)
      expect(Papel.isDono(Papel.ATENDENTE)).toBe(false)
      expect(Papel.isDono(Papel.CLIENTE)).toBe(false)
    })

    it('isGerente deve retornar true apenas para GERENTE', () => {
      expect(Papel.isGerente(Papel.DONO)).toBe(false)
      expect(Papel.isGerente(Papel.GERENTE)).toBe(true)
      expect(Papel.isGerente(Papel.ATENDENTE)).toBe(false)
      expect(Papel.isGerente(Papel.CLIENTE)).toBe(false)
    })

    it('isAtendente deve retornar true apenas para ATENDENTE', () => {
      expect(Papel.isAtendente(Papel.DONO)).toBe(false)
      expect(Papel.isAtendente(Papel.GERENTE)).toBe(false)
      expect(Papel.isAtendente(Papel.ATENDENTE)).toBe(true)
      expect(Papel.isAtendente(Papel.CLIENTE)).toBe(false)
    })

    it('isCliente deve retornar true apenas para CLIENTE', () => {
      expect(Papel.isCliente(Papel.DONO)).toBe(false)
      expect(Papel.isCliente(Papel.GERENTE)).toBe(false)
      expect(Papel.isCliente(Papel.ATENDENTE)).toBe(false)
      expect(Papel.isCliente(Papel.CLIENTE)).toBe(true)
    })
  })

  describe('equals', () => {
    it('deve retornar true para papéis iguais', () => {
      expect(Papel.DONO.equals(Papel.DONO)).toBe(true)
      expect(Papel.GERENTE.equals(Papel.GERENTE)).toBe(true)
    })

    it('deve retornar false para papéis diferentes', () => {
      expect(Papel.DONO.equals(Papel.GERENTE)).toBe(false)
      expect(Papel.GERENTE.equals(Papel.ATENDENTE)).toBe(false)
    })

    it('deve retornar false para objetos que não são Papel', () => {
      expect(Papel.DONO.equals({ props: 'dono' } as any)).toBe(false)
      expect(Papel.DONO.equals(null)).toBe(false)
    })
  })

  describe('toString', () => {
    it('deve retornar string do valor', () => {
      expect(Papel.DONO.toString()).toBe('dono')
      expect(Papel.GERENTE.toString()).toBe('gerente')
      expect(Papel.ATENDENTE.toString()).toBe('atendente')
      expect(Papel.CLIENTE.toString()).toBe('cliente')
    })
  })
})
