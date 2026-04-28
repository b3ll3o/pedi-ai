import { describe, it, expect } from 'vitest'
import { Sessao } from '@/domain/autenticacao/entities/Sessao'

describe('Sessao', () => {
  describe('criar', () => {
    it('deve criar sessão com props e id gerado', () => {
      const props = {
        usuarioId: 'user-123',
        token: 'jwt-token-abc',
        expiracao: new Date(Date.now() + 86400000), // 24h no futuro
        dispositivo: 'Chrome on Windows',
      }

      const sessao = Sessao.criar(props)

      expect(sessao.id).toBeDefined()
      expect(sessao.usuarioId).toBe('user-123')
      expect(sessao.token).toBe('jwt-token-abc')
      expect(sessao.dispositivo).toBe('Chrome on Windows')
    })

    it('deve usar id fornecido se disponível', () => {
      const props = {
        id: 'sessao-custom-id',
        usuarioId: 'user-123',
        token: 'token',
        expiracao: new Date(),
        dispositivo: 'Mobile',
      }

      const sessao = Sessao.criar(props)

      expect(sessao.id).toBe('sessao-custom-id')
    })
  })

  describe('reconstruir', () => {
    it('deve reconstruir sessão com props existentes', () => {
      const props = {
        id: 'sessao-123',
        usuarioId: 'user-456',
        token: 'token-xyz',
        expiracao: new Date('2024-12-31'),
        dispositivo: 'Safari on Mac',
      }

      const sessao = Sessao.reconstruir(props)

      expect(sessao.id).toBe('sessao-123')
      expect(sessao.usuarioId).toBe('user-456')
      expect(sessao.token).toBe('token-xyz')
      expect(sessao.dispositivo).toBe('Safari on Mac')
    })
  })

  describe('getters', () => {
    it('deve retornar props corretos', () => {
      const expiracao = new Date(Date.now() + 3600000)
      const sessao = Sessao.criar({
        usuarioId: 'user-1',
        token: 'token-test',
        expiracao,
        dispositivo: 'App iOS',
      })

      expect(sessao.usuarioId).toBe('user-1')
      expect(sessao.token).toBe('token-test')
      expect(sessao.expiracao).toEqual(expiracao)
      expect(sessao.dispositivo).toBe('App iOS')
    })
  })

  describe('estaExpirada', () => {
    it('deve retornar false para sessão não expirada', () => {
      const sessao = Sessao.criar({
        usuarioId: 'user-1',
        token: 'token',
        expiracao: new Date(Date.now() + 86400000), // futuro
        dispositivo: 'Web',
      })

      expect(sessao.estaExpirada).toBe(false)
    })

    it('deve retornar true para sessão expirada', () => {
      const sessao = Sessao.criar({
        usuarioId: 'user-1',
        token: 'token',
        expiracao: new Date(Date.now() - 1000), // passado
        dispositivo: 'Web',
      })

      expect(sessao.estaExpirada).toBe(true)
    })
  })

  describe('equals', () => {
    it('deve retornar true para sessões com mesmo id', () => {
      const sessao1 = Sessao.reconstruir({
        id: 'sessao-igual',
        usuarioId: 'user-1',
        token: 'token-1',
        expiracao: new Date(),
        dispositivo: 'Web',
      })

      const sessao2 = Sessao.reconstruir({
        id: 'sessao-igual',
        usuarioId: 'user-2',
        token: 'token-2',
        expiracao: new Date(),
        dispositivo: 'Mobile',
      })

      expect(sessao1.equals(sessao2)).toBe(true)
    })

    it('deve retornar false para sessões com id diferente', () => {
      const sessao1 = Sessao.criar({
        usuarioId: 'user-1',
        token: 'token',
        expiracao: new Date(),
        dispositivo: 'Web',
      })

      const sessao2 = Sessao.criar({
        usuarioId: 'user-1',
        token: 'token',
        expiracao: new Date(),
        dispositivo: 'Web',
      })

      expect(sessao1.equals(sessao2)).toBe(false)
    })

    it('deve retornar false para objetos que não são Sessao', () => {
      const sessao = Sessao.criar({
        usuarioId: 'user-1',
        token: 'token',
        expiracao: new Date(),
        dispositivo: 'Web',
      })

      expect(sessao.equals({ id: sessao.id } as any)).toBe(false)
    })
  })
})
