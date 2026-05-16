import { describe, it, expect } from 'vitest'
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido'

describe('StatusPedido', () => {
  describe('valores estáticos', () => {
    it('deve ter todos os status definidos', () => {
      expect(StatusPedido.PENDING_PAYMENT.props).toBe('pending_payment')
      expect(StatusPedido.PAID.props).toBe('paid')
      expect(StatusPedido.RECEIVED.props).toBe('received')
      expect(StatusPedido.PREPARING.props).toBe('preparing')
      expect(StatusPedido.READY.props).toBe('ready')
      expect(StatusPedido.DELIVERED.props).toBe('delivered')
      expect(StatusPedido.REJECTED.props).toBe('rejected')
      expect(StatusPedido.CANCELLED.props).toBe('cancelled')
      expect(StatusPedido.REFUNDED.props).toBe('refunded')
    })
  })

  describe('fromValue', () => {
    it('deve retornar status correto para valor válido', () => {
      expect(StatusPedido.fromValue('pending_payment')).toBe(StatusPedido.PENDING_PAYMENT)
      expect(StatusPedido.fromValue('paid')).toBe(StatusPedido.PAID)
      expect(StatusPedido.fromValue('received')).toBe(StatusPedido.RECEIVED)
      expect(StatusPedido.fromValue('preparing')).toBe(StatusPedido.PREPARING)
      expect(StatusPedido.fromValue('ready')).toBe(StatusPedido.READY)
      expect(StatusPedido.fromValue('delivered')).toBe(StatusPedido.DELIVERED)
      expect(StatusPedido.fromValue('rejected')).toBe(StatusPedido.REJECTED)
      expect(StatusPedido.fromValue('cancelled')).toBe(StatusPedido.CANCELLED)
      expect(StatusPedido.fromValue('refunded')).toBe(StatusPedido.REFUNDED)
    })

    it('deve lançar erro para status inválido', () => {
      expect(() => StatusPedido.fromValue('invalid_status')).toThrow('StatusPedido inválido: invalid_status')
    })

    it('deve lançar erro para string vazia', () => {
      expect(() => StatusPedido.fromValue('')).toThrow('StatusPedido inválido: ')
    })
  })

  describe('equals', () => {
    it('deve retornar true para status iguais', () => {
      expect(StatusPedido.PAID.equals(StatusPedido.PAID)).toBe(true)
    })

    it('deve retornar false para status diferentes', () => {
      expect(StatusPedido.PAID.equals(StatusPedido.PENDING_PAYMENT)).toBe(false)
    })

    it('deve retornar false para objetos que não são StatusPedido', () => {
      expect(StatusPedido.PAID.equals({ props: 'paid' } as any)).toBe(false)
    })
  })

  describe('toString', () => {
    it('deve retornar string do valor', () => {
      expect(StatusPedido.PENDING_PAYMENT.toString()).toBe('pending_payment')
      expect(StatusPedido.PAID.toString()).toBe('paid')
      expect(StatusPedido.DELIVERED.toString()).toBe('delivered')
    })
  })
})
