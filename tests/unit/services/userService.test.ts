import { describe, it, expect } from 'vitest'
import { canManageRole, getRoleLabel, getRoleColor } from '@/services/userService'
import type { UserRole } from '@/services/userService'

describe('User Service', () => {
  describe('canManageRole', () => {
    it('deve retornar true quando dono tenta gerenciar qualquer papel', () => {
      expect(canManageRole('dono', 'dono')).toBe(false) // igual não é gerenciar
      expect(canManageRole('dono', 'gerente')).toBe(true)
      expect(canManageRole('dono', 'atendente')).toBe(true)
      expect(canManageRole('dono', 'cliente')).toBe(true)
    })

    it('deve retornar true quando gerente tenta gerenciar atendente ou cliente', () => {
      expect(canManageRole('gerente', 'dono')).toBe(false)
      expect(canManageRole('gerente', 'gerente')).toBe(false)
      expect(canManageRole('gerente', 'atendente')).toBe(true)
      expect(canManageRole('gerente', 'cliente')).toBe(true)
    })

    it('deve retornar true quando atendente tenta gerenciar cliente', () => {
      expect(canManageRole('atendente', 'dono')).toBe(false)
      expect(canManageRole('atendente', 'gerente')).toBe(false)
      expect(canManageRole('atendente', 'atendente')).toBe(false)
      expect(canManageRole('atendente', 'cliente')).toBe(true)
    })

    it('deve retornar false quando cliente tenta gerenciar qualquer papel', () => {
      expect(canManageRole('cliente', 'dono')).toBe(false)
      expect(canManageRole('cliente', 'gerente')).toBe(false)
      expect(canManageRole('cliente', 'atendente')).toBe(false)
      expect(canManageRole('cliente', 'cliente')).toBe(false)
    })
  })

  describe('getRoleLabel', () => {
    it('deve retornar label correto para cada papel', () => {
      expect(getRoleLabel('dono')).toBe('Proprietário')
      expect(getRoleLabel('gerente')).toBe('Gerente')
      expect(getRoleLabel('atendente')).toBe('Funcionário')
      expect(getRoleLabel('cliente')).toBe('Cliente')
    })

    it('deve retornar o próprio valor para papel desconhecido', () => {
      expect(getRoleLabel('admin' as UserRole)).toBe('admin')
    })
  })

  describe('getRoleColor', () => {
    it('deve retornar cor correta para cada papel', () => {
      expect(getRoleColor('dono')).toBe('#dc2626')
      expect(getRoleColor('gerente')).toBe('#d97706')
      expect(getRoleColor('atendente')).toBe('#2563eb')
      expect(getRoleColor('cliente')).toBe('#6b7280')
    })

    it('deve retornar cor padrão para papel desconhecido', () => {
      expect(getRoleColor('admin' as UserRole)).toBe('#6b7280')
    })
  })
})
