import { describe, it, expect } from 'vitest'
import { PapelRestaurante, PapelRestauranteHelpers } from '@/domain/admin/value-objects/PapelRestaurante'

describe('PapelRestaurante', () => {
  describe('tipo PapelRestaurante', () => {
    it('deve permitir valores válidos', () => {
      const dono: PapelRestaurante = 'dono'
      const gerente: PapelRestaurante = 'gerente'
      const atendente: PapelRestaurante = 'atendente'

      expect(dono).toBe('dono')
      expect(gerente).toBe('gerente')
      expect(atendente).toBe('atendente')
    })
  })

  describe('PapelRestauranteHelpers', () => {
    describe('isOwner', () => {
      it('deve retornar true para "dono"', () => {
        expect(PapelRestauranteHelpers.isOwner('dono')).toBe(true)
      })

      it('deve retornar false para outros papéis', () => {
        expect(PapelRestauranteHelpers.isOwner('gerente')).toBe(false)
        expect(PapelRestauranteHelpers.isOwner('atendente')).toBe(false)
      })
    })

    describe('isManager', () => {
      it('deve retornar true para "gerente"', () => {
        expect(PapelRestauranteHelpers.isManager('gerente')).toBe(true)
      })

      it('deve retornar false para outros papéis', () => {
        expect(PapelRestauranteHelpers.isManager('dono')).toBe(false)
        expect(PapelRestauranteHelpers.isManager('atendente')).toBe(false)
      })
    })

    describe('isStaff', () => {
      it('deve retornar true para "atendente"', () => {
        expect(PapelRestauranteHelpers.isStaff('atendente')).toBe(true)
      })

      it('deve retornar false para outros papéis', () => {
        expect(PapelRestauranteHelpers.isStaff('dono')).toBe(false)
        expect(PapelRestauranteHelpers.isStaff('gerente')).toBe(false)
      })
    })
  })
})
