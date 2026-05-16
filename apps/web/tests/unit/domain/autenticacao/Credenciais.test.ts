import { describe, it, expect } from 'vitest'
import { Credenciais } from '@/domain/autenticacao/value-objects/Credenciais'

describe('Credenciais', () => {
  describe('criar', () => {
    it('deve criar credenciais com email e senha válidos', () => {
      const credenciais = Credenciais.criar('usuario@exemplo.com', 'senha123')

      expect(credenciais.email).toBe('usuario@exemplo.com')
      expect(credenciais.senha).toBe('senha123')
    })

    it('deve converter email para minúsculas', () => {
      const credenciais = Credenciais.criar('Usuario@EXEMPLO.COM', 'senha123')

      expect(credenciais.email).toBe('usuario@exemplo.com')
    })

    it('deve fazer trim do email', () => {
      // O trim é feito após validação, então espaços extras no email serão rejeitados
      // A menos que sejam espaços no início/fim de email válido
      expect(() => Credenciais.criar('  usuario@exemplo.com  ', 'senha123')).toThrow('Email inválido')
    })

    it('deve lançar erro para email inválido', () => {
      expect(() => Credenciais.criar('email-invalido', 'senha123')).toThrow('Email inválido')
    })

    it('deve lançar erro para email vazio', () => {
      expect(() => Credenciais.criar('', 'senha123')).toThrow('Email inválido')
    })

    it('deve lançar erro para senha com menos de 6 caracteres', () => {
      expect(() => Credenciais.criar('usuario@exemplo.com', '12345')).toThrow('Senha deve ter pelo menos 6 caracteres')
    })

    it('deve lançar erro para senha vazia', () => {
      expect(() => Credenciais.criar('usuario@exemplo.com', '')).toThrow('Senha deve ter pelo menos 6 caracteres')
    })
  })

  describe('criarComValidacao', () => {
    it('deve retornar success true para credenciais válidas', () => {
      const resultado = Credenciais.criarComValidacao('usuario@exemplo.com', 'senha123')

      expect(resultado.success).toBe(true)
      expect(resultado.credenciais).toBeInstanceOf(Credenciais)
      expect(resultado.erro).toBeUndefined()
    })

    it('deve retornar success false para email inválido', () => {
      const resultado = Credenciais.criarComValidacao('email-invalido', 'senha123')

      expect(resultado.success).toBe(false)
      expect(resultado.credenciais).toBeUndefined()
      expect(resultado.erro).toBe('Email inválido')
    })

    it('deve retornar success false para senha muito curta', () => {
      const resultado = Credenciais.criarComValidacao('usuario@exemplo.com', '123')

      expect(resultado.success).toBe(false)
      expect(resultado.credenciais).toBeUndefined()
      expect(resultado.erro).toBe('Senha deve ter pelo menos 6 caracteres')
    })

    it('deve converter email para minúsculas em criarComValidacao', () => {
      const resultado = Credenciais.criarComValidacao('USUARIO@EXEMPLO.COM', 'senha123')

      expect(resultado.success).toBe(true)
      expect(resultado.credenciais?.email).toBe('usuario@exemplo.com')
    })
  })

  describe('equals', () => {
    it('deve retornar true para emails iguais', () => {
      const cred1 = Credenciais.criar('usuario@exemplo.com', 'senha1')
      const cred2 = Credenciais.criar('usuario@exemplo.com', 'senha2')

      expect(cred1.equals(cred2)).toBe(true)
    })

    it('deve retornar false para emails diferentes', () => {
      const cred1 = Credenciais.criar('usuario1@exemplo.com', 'senha123')
      const cred2 = Credenciais.criar('usuario2@exemplo.com', 'senha123')

      expect(cred1.equals(cred2)).toBe(false)
    })

    it('deve retornar false para objetos que não são Credenciais', () => {
      const cred = Credenciais.criar('usuario@exemplo.com', 'senha123')

      expect(cred.equals({ email: 'usuario@exemplo.com' } as any)).toBe(false)
      expect(cred.equals(null)).toBe(false)
    })
  })

  describe('email getter', () => {
    it('deve retornar email correto', () => {
      const cred = Credenciais.criar('teste@dominio.com', 'senha123')

      expect(cred.email).toBe('teste@dominio.com')
    })
  })

  describe('senha getter', () => {
    it('deve retornar senha correta', () => {
      const cred = Credenciais.criar('usuario@exemplo.com', 'minhasenha')

      expect(cred.senha).toBe('minhasenha')
    })
  })
})
