import { describe, it, expect } from 'vitest'
import { Usuario } from '@/domain/autenticacao/entities/Usuario'
import { Papel } from '@/domain/autenticacao/value-objects/Papel'

describe('Usuario', () => {
  describe('criar', () => {
    it('deve criar Usuario com props válidas', () => {
      const props = {
        id: 'user-123',
        email: 'usuario@exemplo.com',
        papel: Papel.DONO,
        restauranteId: 'rest-456',
      }

      const usuario = Usuario.criar(props)

      expect(usuario.id).toBe('user-123')
      expect(usuario.email).toBe('usuario@exemplo.com')
      expect(usuario.papel).toBe(Papel.DONO)
      expect(usuario.restauranteId).toBe('rest-456')
      expect(usuario.createdAt).toBeInstanceOf(Date)
      expect(usuario.updatedAt).toBeInstanceOf(Date)
      expect(usuario.criadoEm).toEqual(usuario.createdAt)
      expect(usuario.atualizadoEm).toEqual(usuario.updatedAt)
    })

    it('deve criar Usuario sem restauranteId', () => {
      const props = {
        id: 'user-789',
        email: 'cliente@exemplo.com',
        papel: Papel.CLIENTE,
      }

      const usuario = Usuario.criar(props)

      expect(usuario.id).toBe('user-789')
      expect(usuario.email).toBe('cliente@exemplo.com')
      expect(usuario.papel).toBe(Papel.CLIENTE)
      expect(usuario.restauranteId).toBeUndefined()
    })

    it('deve definir createdAt e updatedAt com a mesma data na criação', () => {
      const before = new Date()
      const props = {
        id: 'user-time',
        email: 'test@exemplo.com',
        papel: Papel.ATENDENTE,
      }

      const usuario = Usuario.criar(props)
      const after = new Date()

      expect(usuario.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(usuario.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
      expect(usuario.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(usuario.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('reconstruir', () => {
    it('deve reconstruir Usuario a partir de props existentes', () => {
      const existingDate = new Date('2024-01-15T10:00:00Z')
      const props = {
        id: 'user-existing',
        email: 'reconstruido@exemplo.com',
        papel: Papel.GERENTE,
        restauranteId: 'rest-999',
        createdAt: existingDate,
        updatedAt: existingDate,
      }

      const usuario = Usuario.reconstruir(props)

      expect(usuario.id).toBe('user-existing')
      expect(usuario.email).toBe('reconstruido@exemplo.com')
      expect(usuario.papel).toBe(Papel.GERENTE)
      expect(usuario.restauranteId).toBe('rest-999')
      expect(usuario.createdAt).toEqual(existingDate)
      expect(usuario.updatedAt).toEqual(existingDate)
    })
  })

  describe('email', () => {
    it('deve retornar email correto', () => {
      const props = {
        id: 'user-email',
        email: 'teste@dominio.com.br',
        papel: Papel.CLIENTE,
      }

      const usuario = Usuario.criar(props)

      expect(usuario.email).toBe('teste@dominio.com.br')
    })
  })

  describe('papel', () => {
    it('deve retornar o papel correto como value object', () => {
      const props = {
        id: 'user-papel',
        email: 'admin@exemplo.com',
        papel: Papel.DONO,
      }

      const usuario = Usuario.criar(props)

      expect(usuario.papel).toBe(Papel.DONO)
      expect(usuario.papel.value).toBe('dono')
    })

    it('deve permitir todos os tipos de papel', () => {
      const Papeis = [Papel.DONO, Papel.GERENTE, Papel.ATENDENTE, Papel.CLIENTE]
      const emails = ['dono@x.com', 'gerente@x.com', 'atendente@x.com', 'cliente@x.com']

      Papeis.forEach((papel, index) => {
        const props = {
          id: `user-${index}`,
          email: emails[index],
          papel,
        }

        const usuario = Usuario.criar(props)
        expect(usuario.papel).toBe(papel)
      })
    })
  })

  describe('id', () => {
    it('deve retornar id correto', () => {
      const props = {
        id: 'meu-id-unico',
        email: 'id@exemplo.com',
        papel: Papel.CLIENTE,
      }

      const usuario = Usuario.criar(props)

      expect(usuario.id).toBe('meu-id-unico')
    })

    it('deve ter id imutável (sem setter)', () => {
      const props = {
        id: 'user-imutavel',
        email: 'imutavel@exemplo.com',
        papel: Papel.DONO,
      }

      const usuario = Usuario.criar(props)

      // id não deve ter setter - tentativa de modificação não deve alterar o valor
      expect(Object.getOwnPropertyDescriptor(usuario, 'id')?.set).toBeUndefined()
      expect(usuario.id).toBe('user-imutavel')
    })
  })

  describe('métodos de verificação de papel', () => {
    it('eProprietario deve retornar true para DONO', () => {
      const usuario = Usuario.criar({
        id: 'user-dono',
        email: 'dono@exemplo.com',
        papel: Papel.DONO,
      })

      expect(usuario.eProprietario()).toBe(true)
      expect(usuario.eGerente()).toBe(false)
      expect(usuario.eFuncionario()).toBe(false)
      expect(usuario.eCliente()).toBe(false)
    })

    it('eGerente deve retornar true para GERENTE', () => {
      const usuario = Usuario.criar({
        id: 'user-gerente',
        email: 'gerente@exemplo.com',
        papel: Papel.GERENTE,
      })

      expect(usuario.eProprietario()).toBe(false)
      expect(usuario.eGerente()).toBe(true)
      expect(usuario.eFuncionario()).toBe(false)
      expect(usuario.eCliente()).toBe(false)
    })

    it('eFuncionario deve retornar true para ATENDENTE', () => {
      const usuario = Usuario.criar({
        id: 'user-atendente',
        email: 'atendente@exemplo.com',
        papel: Papel.ATENDENTE,
      })

      expect(usuario.eProprietario()).toBe(false)
      expect(usuario.eGerente()).toBe(false)
      expect(usuario.eFuncionario()).toBe(true)
      expect(usuario.eCliente()).toBe(false)
    })

    it('eCliente deve retornar true para CLIENTE', () => {
      const usuario = Usuario.criar({
        id: 'user-cliente',
        email: 'cliente@exemplo.com',
        papel: Papel.CLIENTE,
      })

      expect(usuario.eProprietario()).toBe(false)
      expect(usuario.eGerente()).toBe(false)
      expect(usuario.eFuncionario()).toBe(false)
      expect(usuario.eCliente()).toBe(true)
    })
  })

  describe('podeAcessarRestaurante', () => {
    it('deve retornar false para cliente', () => {
      const usuario = Usuario.criar({
        id: 'user-cli',
        email: 'cliente@exemplo.com',
        papel: Papel.CLIENTE,
        restauranteId: 'rest-123',
      })

      expect(usuario.podeAcessarRestaurante('rest-123')).toBe(false)
      expect(usuario.podeAcessarRestaurante('rest-456')).toBe(false)
    })

    it('deve retornar true para dono independente do restauranteId', () => {
      const usuario = Usuario.criar({
        id: 'user-dono',
        email: 'dono@exemplo.com',
        papel: Papel.DONO,
        restauranteId: 'rest-123',
      })

      expect(usuario.podeAcessarRestaurante('rest-123')).toBe(true)
      expect(usuario.podeAcessarRestaurante('rest-456')).toBe(true)
      expect(usuario.podeAcessarRestaurante('qualquer')).toBe(true)
    })

    it('deve retornar true para gerente/atendente quando restauranteId corresponde', () => {
      const gerente = Usuario.criar({
        id: 'user-ger',
        email: 'gerente@exemplo.com',
        papel: Papel.GERENTE,
        restauranteId: 'rest-abc',
      })

      const atendente = Usuario.criar({
        id: 'user-aten',
        email: 'atendente@exemplo.com',
        papel: Papel.ATENDENTE,
        restauranteId: 'rest-abc',
      })

      expect(gerente.podeAcessarRestaurante('rest-abc')).toBe(true)
      expect(gerente.podeAcessarRestaurante('rest-outro')).toBe(false)
      expect(atendente.podeAcessarRestaurante('rest-abc')).toBe(true)
      expect(atendente.podeAcessarRestaurante('rest-outro')).toBe(false)
    })
  })

  describe('equals', () => {
    it('deve retornar true para usuários com mesmo id', () => {
      const usuario1 = Usuario.criar({
        id: 'user-same',
        email: 'usuario1@exemplo.com',
        papel: Papel.CLIENTE,
      })

      const usuario2 = Usuario.criar({
        id: 'user-same',
        email: 'usuario2@exemplo.com',
        papel: Papel.DONO,
      })

      expect(usuario1.equals(usuario2)).toBe(true)
    })

    it('deve retornar false para usuários com id diferente', () => {
      const usuario1 = Usuario.criar({
        id: 'user-1',
        email: 'mesmo@exemplo.com',
        papel: Papel.CLIENTE,
      })

      const usuario2 = Usuario.criar({
        id: 'user-2',
        email: 'mesmo@exemplo.com',
        papel: Papel.CLIENTE,
      })

      expect(usuario1.equals(usuario2)).toBe(false)
    })

    it('deve retornar false para objetos que não são Usuario', () => {
      const usuario = Usuario.criar({
        id: 'user-test',
        email: 'test@exemplo.com',
        papel: Papel.CLIENTE,
      })

      expect(usuario.equals({ id: 'user-test' } as any)).toBe(false)
      expect(usuario.equals(null)).toBe(false)
      expect(usuario.equals(undefined)).toBe(false)
    })
  })
})
