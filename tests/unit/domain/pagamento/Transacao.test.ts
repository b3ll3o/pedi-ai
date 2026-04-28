import { describe, it, expect } from 'vitest'
import { Transacao } from '@/domain/pagamento/entities/Transacao'

describe('Transacao', () => {
  describe('criar', () => {
    it('deve criar transação com status pending e createdAt', () => {
      const transacao = Transacao.criar({
        id: 'trans-123',
        pagamentoId: 'pag-456',
        tipo: 'charge',
        providerId: 'stripe-123',
        payload: { amount: 1000 },
      })

      expect(transacao.id).toBe('trans-123')
      expect(transacao.pagamentoId).toBe('pag-456')
      expect(transacao.tipo).toBe('charge')
      expect(transacao.providerId).toBe('stripe-123')
      expect(transacao.payload).toEqual({ amount: 1000 })
      expect(transacao.status).toBe('pending')
      expect(transacao.createdAt).toBeInstanceOf(Date)
    })
  })

  describe('reconstruir via new', () => {
    it('deve criar transação com props existentes', () => {
      const createdAt = new Date('2024-01-15')
      const transacao = new Transacao({
        id: 'trans-123',
        pagamentoId: 'pag-456',
        tipo: 'refund',
        providerId: 'stripe-789',
        status: 'success',
        payload: { refund_id: 're-123' },
        createdAt,
      })

      expect(transacao.id).toBe('trans-123')
      expect(transacao.pagamentoId).toBe('pag-456')
      expect(transacao.tipo).toBe('refund')
      expect(transacao.providerId).toBe('stripe-789')
      expect(transacao.status).toBe('success')
      expect(transacao.payload).toEqual({ refund_id: 're-123' })
      expect(transacao.createdAt).toEqual(createdAt)
    })
  })

  describe('getters', () => {
    it('deve retornar props corretos', () => {
      const transacao = Transacao.criar({
        id: 'trans-1',
        pagamentoId: 'pag-1',
        tipo: 'webhook',
        providerId: 'provider-1',
        payload: { key: 'value' },
      })

      expect(transacao.pagamentoId).toBe('pag-1')
      expect(transacao.tipo).toBe('webhook')
      expect(transacao.providerId).toBe('provider-1')
      expect(transacao.payload).toEqual({ key: 'value' })
    })

    it('deve retornar cópia do payload (imutabilidade)', () => {
      const transacao = Transacao.criar({
        id: 'trans-1',
        pagamentoId: 'pag-1',
        tipo: 'charge',
        providerId: 'p1',
        payload: { original: true },
      })

      const payload1 = transacao.payload
      const payload2 = transacao.payload

      expect(payload1).toEqual(payload2)
      expect(payload1).not.toBe(payload2) // cópia, não mesma referência
    })
  })

  describe('status helpers', () => {
    it('isPendente deve retornar true para pending', () => {
      const transacao = Transacao.criar({
        id: 'trans-1',
        pagamentoId: 'pag-1',
        tipo: 'charge',
        providerId: 'p1',
        payload: {},
      })

      expect(transacao.isPendente()).toBe(true)
      expect(transacao.isSucesso()).toBe(false)
      expect(transacao.isFalha()).toBe(false)
    })

    it('isSucesso deve retornar true para success', () => {
      const transacao = new Transacao({
        id: 'trans-1',
        pagamentoId: 'pag-1',
        tipo: 'charge',
        providerId: 'p1',
        status: 'success',
        payload: {},
        createdAt: new Date(),
      })

      expect(transacao.isPendente()).toBe(false)
      expect(transacao.isSucesso()).toBe(true)
      expect(transacao.isFalha()).toBe(false)
    })

    it('isFalha deve retornar true para failure', () => {
      const transacao = new Transacao({
        id: 'trans-1',
        pagamentoId: 'pag-1',
        tipo: 'charge',
        providerId: 'p1',
        status: 'failure',
        payload: {},
        createdAt: new Date(),
      })

      expect(transacao.isPendente()).toBe(false)
      expect(transacao.isSucesso()).toBe(false)
      expect(transacao.isFalha()).toBe(true)
    })
  })

  describe('marcarSucesso', () => {
    it('deve mudar status para success', () => {
      const transacao = Transacao.criar({
        id: 'trans-1',
        pagamentoId: 'pag-1',
        tipo: 'charge',
        providerId: 'p1',
        payload: {},
      })

      transacao.marcarSucesso()

      expect(transacao.status).toBe('success')
      expect(transacao.isSucesso()).toBe(true)
    })
  })

  describe('marcarFalha', () => {
    it('deve mudar status para failure', () => {
      const transacao = Transacao.criar({
        id: 'trans-1',
        pagamentoId: 'pag-1',
        tipo: 'charge',
        providerId: 'p1',
        payload: {},
      })

      transacao.marcarFalha()

      expect(transacao.status).toBe('failure')
      expect(transacao.isFalha()).toBe(true)
    })
  })

  describe('equals', () => {
    it('deve retornar true para transações com mesmo id', () => {
      const t1 = new Transacao({
        id: 'trans-igual',
        pagamentoId: 'pag-1',
        tipo: 'charge',
        providerId: 'p1',
        status: 'pending',
        payload: {},
        createdAt: new Date(),
      })

      const t2 = new Transacao({
        id: 'trans-igual',
        pagamentoId: 'pag-2',
        tipo: 'refund',
        providerId: 'p2',
        status: 'success',
        payload: { diferente: true },
        createdAt: new Date(),
      })

      expect(t1.equals(t2)).toBe(true)
    })

    it('deve retornar false para transações com id diferente', () => {
      const t1 = Transacao.criar({
        id: 'trans-1',
        pagamentoId: 'pag-1',
        tipo: 'charge',
        providerId: 'p1',
        payload: {},
      })

      const t2 = Transacao.criar({
        id: 'trans-2',
        pagamentoId: 'pag-1',
        tipo: 'charge',
        providerId: 'p1',
        payload: {},
      })

      expect(t1.equals(t2)).toBe(false)
    })
  })
})
