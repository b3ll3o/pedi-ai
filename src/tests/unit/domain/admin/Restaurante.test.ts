import { describe, it, expect } from 'vitest';
import { Restaurante, RestauranteProps } from '@/domain/admin/entities/Restaurante';

describe('Restaurante', () => {
  describe('criar', () => {
    it('deve criar um restaurante com ID e datas de criação', () => {
      const props = {
        nome: 'Restaurante Teste',
        cnpj: '12345678000199',
        endereco: 'Rua Teste, 123',
        telefone: null,
        logoUrl: null,
        ativo: true,
      };

      const restaurante = Restaurante.criar(props);

      expect(restaurante.id).toBeDefined();
      expect(restaurante.nome).toBe('Restaurante Teste');
      expect(restaurante.cnpj).toBe('12345678000199');
      expect(restaurante.ativo).toBe(true);
      expect(restaurante.criadoEm).toBeInstanceOf(Date);
      expect(restaurante.atualizadoEm).toBeInstanceOf(Date);
    });
  });

  describe('reconstruir', () => {
    it('deve reconstruir um restaurante a partir de props completas', () => {
      const criadoEm = new Date('2024-01-01');
      const atualizadoEm = new Date('2024-01-02');
      const props: RestauranteProps = {
        id: 'restaurante-1',
        nome: 'Restaurante Reconstruído',
        cnpj: '98765432000199',
        endereco: 'Av. Teste, 456',
        telefone: '11999999999',
        logoUrl: 'https://exemplo.com/logo.png',
        ativo: true,
        criadoEm,
        atualizadoEm,
      };

      const restaurante = Restaurante.reconstruir(props);

      expect(restaurante.id).toBe('restaurante-1');
      expect(restaurante.nome).toBe('Restaurante Reconstruído');
      expect(restaurante.cnpj).toBe('98765432000199');
      expect(restaurante.telefone).toBe('11999999999');
      expect(restaurante.logoUrl).toBe('https://exemplo.com/logo.png');
      expect(restaurante.criadoEm).toEqual(criadoEm);
      expect(restaurante.atualizadoEm).toEqual(atualizadoEm);
    });
  });

  describe('equals', () => {
    it('deve ser igual quando IDs são iguais', () => {
      const props = {
        nome: 'Restaurante Teste',
        cnpj: '12345678000199',
        endereco: 'Rua Teste, 123',
        telefone: null,
        logoUrl: null,
        ativo: true,
      };

      const restaurante1 = Restaurante.criar(props);
      const restaurante2 = Restaurante.reconstruir({
        ...props,
        id: restaurante1.id,
        criadoEm: restaurante1.criadoEm,
        atualizadoEm: restaurante1.atualizadoEm,
      });

      expect(restaurante1.equals(restaurante2)).toBe(true);
    });

    it('deve ser diferente quando IDs são diferentes', () => {
      const restaurante1 = Restaurante.criar({
        nome: 'Restaurante 1',
        cnpj: '12345678000199',
        endereco: 'Rua Teste, 123',
        telefone: null,
        logoUrl: null,
        ativo: true,
      });

      const restaurante2 = Restaurante.criar({
        nome: 'Restaurante 1',
        cnpj: '12345678000199',
        endereco: 'Rua Teste, 123',
        telefone: null,
        logoUrl: null,
        ativo: true,
      });

      expect(restaurante1.equals(restaurante2)).toBe(false);
    });
  });

  describe('atualizarNome', () => {
    it('deve atualizar o nome e a data de atualização', () => {
      const restaurante = Restaurante.criar({
        nome: 'Nome Antigo',
        cnpj: '12345678000199',
        endereco: 'Rua Teste, 123',
        telefone: null,
        logoUrl: null,
        ativo: true,
      });

      const antes = restaurante.atualizadoEm;
      restaurante.atualizarNome('Nome Novo');

      expect(restaurante.nome).toBe('Nome Novo');
      expect(restaurante.atualizadoEm.getTime()).toBeGreaterThanOrEqual(antes.getTime());
    });
  });

  describe('atualizarEndereco', () => {
    it('deve atualizar o endereço', () => {
      const restaurante = Restaurante.criar({
        nome: 'Restaurante Teste',
        cnpj: '12345678000199',
        endereco: 'Endereço Antigo',
        telefone: null,
        logoUrl: null,
        ativo: true,
      });

      restaurante.atualizarEndereco('Endereço Novo');

      expect(restaurante.endereco).toBe('Endereço Novo');
    });
  });

  describe('atualizarTelefone', () => {
    it('deve atualizar o telefone', () => {
      const restaurante = Restaurante.criar({
        nome: 'Restaurante Teste',
        cnpj: '12345678000199',
        endereco: 'Rua Teste, 123',
        telefone: null,
        logoUrl: null,
        ativo: true,
      });

      restaurante.atualizarTelefone('11999999999');

      expect(restaurante.telefone).toBe('11999999999');
    });

    it('deve permitir telefone null', () => {
      const restaurante = Restaurante.criar({
        nome: 'Restaurante Teste',
        cnpj: '12345678000199',
        endereco: 'Rua Teste, 123',
        telefone: '11999999999',
        logoUrl: null,
        ativo: true,
      });

      restaurante.atualizarTelefone(null);

      expect(restaurante.telefone).toBeNull();
    });
  });

  describe('atualizarLogo', () => {
    it('deve atualizar a logo URL', () => {
      const restaurante = Restaurante.criar({
        nome: 'Restaurante Teste',
        cnpj: '12345678000199',
        endereco: 'Rua Teste, 123',
        telefone: null,
        logoUrl: null,
        ativo: true,
      });

      restaurante.atualizarLogo('https://exemplo.com/nova-logo.png');

      expect(restaurante.logoUrl).toBe('https://exemplo.com/nova-logo.png');
    });
  });

  describe('ativar e desativar', () => {
    it('deve ativar o restaurante', () => {
      const restaurante = Restaurante.criar({
        nome: 'Restaurante Teste',
        cnpj: '12345678000199',
        endereco: 'Rua Teste, 123',
        telefone: null,
        logoUrl: null,
        ativo: false,
      });

      restaurante.ativar();

      expect(restaurante.ativo).toBe(true);
    });

    it('deve desativar o restaurante', () => {
      const restaurante = Restaurante.criar({
        nome: 'Restaurante Teste',
        cnpj: '12345678000199',
        endereco: 'Rua Teste, 123',
        telefone: null,
        logoUrl: null,
        ativo: true,
      });

      restaurante.desativar();

      expect(restaurante.ativo).toBe(false);
    });
  });
});
