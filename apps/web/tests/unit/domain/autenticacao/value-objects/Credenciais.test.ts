import { describe, it, expect } from 'vitest';
import { Credenciais } from '@/domain/autenticacao/value-objects/Credenciais';

describe('Credenciais', () => {
  describe('criar', () => {
    it('deve criar credenciais com email e senha válidos', () => {
      const credenciais = Credenciais.criar('usuario@email.com', 'senha123');

      expect(credenciais.email).toBe('usuario@email.com');
      expect(credenciais.senha).toBe('senha123');
    });

    it('deve converter email para minúsculas e trim', () => {
      const credenciais = Credenciais.criar('  USUARIO@EMAIL.COM  ', 'senha123');

      expect(credenciais.email).toBe('usuario@email.com');
    });

    it('deve lançar erro para email inválido', () => {
      expect(() => Credenciais.criar('email-invalido', 'senha123')).toThrow('Email inválido');
    });

    it('deve lançar erro para email vazio', () => {
      expect(() => Credenciais.criar('', 'senha123')).toThrow('Email inválido');
    });

    it('deve lançar erro para senha com menos de 6 caracteres', () => {
      expect(() => Credenciais.criar('usuario@email.com', '12345')).toThrow(
        'Senha deve ter pelo menos 6 caracteres'
      );
    });

    it('deve lançar erro para senha vazia', () => {
      expect(() => Credenciais.criar('usuario@email.com', '')).toThrow(
        'Senha deve ter pelo menos 6 caracteres'
      );
    });
  });

  describe('criarComValidacao', () => {
    it('deve retornar success=true para credenciais válidas', () => {
      const resultado = Credenciais.criarComValidacao('usuario@email.com', 'senha123');

      expect(resultado.success).toBe(true);
      expect(resultado.credenciais).toBeDefined();
      expect(resultado.erro).toBeUndefined();
    });

    it('deve retornar success=false para email inválido', () => {
      const resultado = Credenciais.criarComValidacao('email-invalido', 'senha123');

      expect(resultado.success).toBe(false);
      expect(resultado.credenciais).toBeUndefined();
      expect(resultado.erro).toBe('Email inválido');
    });

    it('deve retornar success=false para senha curta', () => {
      const resultado = Credenciais.criarComValidacao('usuario@email.com', '12345');

      expect(resultado.success).toBe(false);
      expect(resultado.credenciais).toBeUndefined();
      expect(resultado.erro).toBe('Senha deve ter pelo menos 6 caracteres');
    });

    it('deve normalizar email em criarComValidacao', () => {
      const resultado = Credenciais.criarComValidacao('  USUARIO@EMAIL.COM  ', 'senha123');

      expect(resultado.success).toBe(true);
      expect(resultado.credenciais?.email).toBe('usuario@email.com');
    });
  });

  describe('equals', () => {
    it('deve retornar true para credenciais com mesmo email', () => {
      const credenciais1 = Credenciais.criar('usuario@email.com', 'senha1');
      const credenciais2 = Credenciais.criar('usuario@email.com', 'senha2');

      expect(credenciais1.equals(credenciais2)).toBe(true);
    });

    it('deve retornar false para credenciais com emails diferentes', () => {
      const credenciais1 = Credenciais.criar('usuario1@email.com', 'senha123');
      const credenciais2 = Credenciais.criar('usuario2@email.com', 'senha123');

      expect(credenciais1.equals(credenciais2)).toBe(false);
    });

    it('deve retornar false para objeto que não é Credenciais', () => {
      const credenciais = Credenciais.criar('usuario@email.com', 'senha123');

      expect(credenciais.equals({ email: 'usuario@email.com', senha: 'senha123' } as any)).toBe(
        false
      );
    });
  });
});
