import { describe, it, expect } from 'vitest';
import { RestauranteAggregate } from '@/domain/admin/aggregates/RestauranteAggregate';
import { ConfiguracoesRestaurante } from '@/domain/admin/value-objects/ConfiguracoesRestaurante';

describe('RestauranteAggregate', () => {
  const criarPropsValidos = () => ({
    nome: 'Restaurante Teste',
    cnpj: '00000000000191',
    endereco: 'Rua Teste, 123',
    telefone: null,
    logoUrl: null,
    ativo: true,
  });

  describe('criar', () => {
    it('deve criar aggregate com configurações padrão', () => {
      const aggregate = RestauranteAggregate.criar(criarPropsValidos());

      expect(aggregate.id).toBeDefined();
      expect(aggregate.nome).toBe('Restaurante Teste');
      expect(aggregate.cnpj).toBe('00000000000191');
      expect(aggregate.configuracoesValueObject).toBeDefined();
    });
  });

  describe('validarInvariantes', () => {
    it('deve lançar erro se nome vazio', () => {
      expect(() =>
        RestauranteAggregate.criar({
          ...criarPropsValidos(),
          nome: '',
        })
      ).toThrow(/obrigatório/);
    });

    it('deve lançar erro se CNPJ inválido', () => {
      expect(() =>
        RestauranteAggregate.criar({
          ...criarPropsValidos(),
          cnpj: '12345678000100',
        })
      ).toThrow(/CNPJ inválido/);
    });

    it('deve aceitar CNPJ válido', () => {
      expect(() => RestauranteAggregate.criar(criarPropsValidos())).not.toThrow();
    });
  });

  describe('atualizarConfiguracoes', () => {
    it('deve atualizar configurações', () => {
      const aggregate = RestauranteAggregate.criar(criarPropsValidos());

      const novasConfig = ConfiguracoesRestaurante.criarPadrao();
      aggregate.atualizarConfiguracoes(novasConfig);

      expect(aggregate.configuracoesValueObject).toBeDefined();
    });
  });

  describe('reconstruir', () => {
    it('deve reconstruir aggregate a partir de props', () => {
      const aggregate = RestauranteAggregate.criar(criarPropsValidos());
      const props = {
        restaurante: aggregate['restaurante']['props'],
        configuracoes: aggregate['configuracoesValueObject']['props'],
      };
      const reconstruido = RestauranteAggregate.reconstruir(props);

      expect(reconstruido.id).toBe(aggregate.id);
      expect(reconstruido.nome).toBe(aggregate.nome);
    });
  });

  describe('getters', () => {
    it('deve expor restauranteEntity e configuracoesValueObject', () => {
      const aggregate = RestauranteAggregate.criar(criarPropsValidos());

      expect(aggregate.restauranteEntity).toBeDefined();
      expect(aggregate.configuracoesValueObject).toBeDefined();
    });
  });
});
