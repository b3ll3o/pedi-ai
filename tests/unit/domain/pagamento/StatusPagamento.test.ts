import { describe, it, expect } from 'vitest'
import { StatusPagamento } from '@/domain/pagamento/value-objects/StatusPagamento'

describe('StatusPagamento', () => {
  describe('valores estáticos', () => {
    it('deve ter PENDING como "pending"', () => {
      expect(StatusPagamento.PENDING.props).toBe('pending')
    })

    it('deve ter CONFIRMED como "confirmed"', () => {
      expect(StatusPagamento.CONFIRMED.props).toBe('confirmed')
    })

    it('deve ter FAILED como "failed"', () => {
      expect(StatusPagamento.FAILED.props).toBe('failed')
    })

    it('deve ter REFUNDED como "refunded"', () => {
      expect(StatusPagamento.REFUNDED.props).toBe('refunded')
    })

    it('deve ter CANCELLED como "cancelled"', () => {
      expect(StatusPagamento.CANCELLED.props).toBe('cancelled')
    })
  })

  describe('fromValue', () => {
    it('deve retornar status correto para valor válido', () => {
      expect(StatusPagamento.fromValue('pending')).toBe(StatusPagamento.PENDING)
      expect(StatusPagamento.fromValue('confirmed')).toBe(StatusPagamento.CONFIRMED)
      expect(StatusPagamento.fromValue('failed')).toBe(StatusPagamento.FAILED)
      expect(StatusPagamento.fromValue('refunded')).toBe(StatusPagamento.REFUNDED)
      expect(StatusPagamento.fromValue('cancelled')).toBe(StatusPagamento.CANCELLED)
    })

    it('deve lançar erro para status inválido', () => {
      expect(() => StatusPagamento.fromValue('approved')).toThrow('StatusPagamento inválido: approved')
    })

    it('deve lançar erro para string vazia', () => {
      expect(() => StatusPagamento.fromValue('')).toThrow('StatusPagamento inválido: ')
    })
  })

  describe('isFinal', () => {
    it('deve retornar true para status finais', () => {
      expect(StatusPagamento.CONFIRMED.isFinal()).toBe(true)
      expect(StatusPagamento.FAILED.isFinal()).toBe(true)
      expect(StatusPagamento.REFUNDED.isFinal()).toBe(true)
      expect(StatusPagamento.CANCELLED.isFinal()).toBe(true)
    })

    it('deve retornar false para PENDING', () => {
      expect(StatusPagamento.PENDING.isFinal()).toBe(false)
    })
  })

  describe('isPendente', () => {
    it('deve retornar true para PENDING', () => {
      expect(StatusPagamento.PENDING.isPendente()).toBe(true)
    })

    it('deve retornar false para outros status', () => {
      expect(StatusPagamento.CONFIRMED.isPendente()).toBe(false)
      expect(StatusPagamento.FAILED.isPendente()).toBe(false)
    })
  })

  describe('isConfirmado', () => {
    it('deve retornar true para CONFIRMED', () => {
      expect(StatusPagamento.CONFIRMED.isConfirmado()).toBe(true)
    })

    it('deve retornar false para outros status', () => {
      expect(StatusPagamento.PENDING.isConfirmado()).toBe(false)
    })
  })

  describe('isFalhou', () => {
    it('deve retornar true para FAILED', () => {
      expect(StatusPagamento.FAILED.isFalhou()).toBe(true)
    })

    it('deve retornar false para outros status', () => {
      expect(StatusPagamento.PENDING.isFalhou()).toBe(false)
    })
  })

  describe('isReembolsado', () => {
    it('deve retornar true para REFUNDED', () => {
      expect(StatusPagamento.REFUNDED.isReembolsado()).toBe(true)
    })

    it('deve retornar false para outros status', () => {
      expect(StatusPagamento.PENDING.isReembolsado()).toBe(false)
    })
  })

  describe('isCancelado', () => {
    it('deve retornar true para CANCELLED', () => {
      expect(StatusPagamento.CANCELLED.isCancelado()).toBe(true)
    })

    it('deve retornar false para outros status', () => {
      expect(StatusPagamento.PENDING.isCancelado()).toBe(false)
    })
  })

  describe('equals', () => {
    it('deve retornar true para status iguais', () => {
      expect(StatusPagamento.PENDING.equals(StatusPagamento.PENDING)).toBe(true)
    })

    it('deve retornar false para status diferentes', () => {
      expect(StatusPagamento.PENDING.equals(StatusPagamento.CONFIRMED)).toBe(false)
    })

    it('deve retornar false para objetos que não são StatusPagamento', () => {
      expect(StatusPagamento.PENDING.equals({ props: 'pending' } as any)).toBe(false)
    })
  })

  describe('toString', () => {
    it('deve retornar string do valor', () => {
      expect(StatusPagamento.PENDING.toString()).toBe('pending')
      expect(StatusPagamento.CONFIRMED.toString()).toBe('confirmed')
    })
  })
})
