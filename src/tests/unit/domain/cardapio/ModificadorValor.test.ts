import { describe, it, expect } from 'vitest';
import { ModificadorValor, ModificadorValorProps } from '@/domain/cardapio/entities/ModificadorValor';
import { Dinheiro } from '@/domain/pedido/value-objects/Dinheiro';

describe('ModificadorValor', () => {
  describe('criar', () => {
    it('deve criar um modificador valor com ID gerado', () => {
      const props = {
        modificadorGrupoId: 'grupo-1',
        nome: 'Grande',
        ajustePreco: Dinheiro.criar(500, 'BRL'),
        ativo: true,
      };

      const modificador = ModificadorValor.criar(props);

      expect(modificador.id).toBeDefined();
      expect(modificador.modificadorGrupoId).toBe('grupo-1');
      expect(modificador.nome).toBe('Grande');
      expect(modificador.ajustePreco.valor).toBe(500);
      expect(modificador.ativo).toBe(true);
    });

    it('deve criar com restauranteId opcional', () => {
      const modificador = ModificadorValor.criar({
        modificadorGrupoId: 'grupo-1',
        restauranteId: 'restaurante-1',
        nome: 'Grande',
        ajustePreco: Dinheiro.criar(500, 'BRL'),
        ativo: true,
      });

      expect(modificador.props.restauranteId).toBe('restaurante-1');
    });
  });

  describe('reconstruir', () => {
    it('deve reconstruir um modificador valor a partir de props completas', () => {
      const props: ModificadorValorProps = {
        id: 'modificador-1',
        modificadorGrupoId: 'grupo-1',
        nome: 'Médio',
        ajustePreco: Dinheiro.criar(300, 'BRL'),
        ativo: false,
      };

      const modificador = ModificadorValor.reconstruir(props);

      expect(modificador.id).toBe('modificador-1');
      expect(modificador.nome).toBe('Médio');
      expect(modificador.ajustePreco.valor).toBe(300);
      expect(modificador.ativo).toBe(false);
    });
  });

  describe('equals', () => {
    it('deve ser igual quando IDs são iguais', () => {
      const mod1 = ModificadorValor.criar({
        modificadorGrupoId: 'grupo-1',
        nome: 'Grande',
        ajustePreco: Dinheiro.criar(500, 'BRL'),
        ativo: true,
      });

      const mod2 = ModificadorValor.reconstruir({
        id: mod1.id,
        modificadorGrupoId: 'grupo-1',
        nome: 'Outro Nome',
        ajustePreco: Dinheiro.criar(100, 'BRL'),
        ativo: false,
      });

      expect(mod1.equals(mod2)).toBe(true);
    });
  });

  describe('ativar e desativar', () => {
    it('deve ativar o modificador', () => {
      const modificador = ModificadorValor.criar({
        modificadorGrupoId: 'grupo-1',
        nome: 'Grande',
        ajustePreco: Dinheiro.criar(500, 'BRL'),
        ativo: false,
      });

      modificador.ativar();

      expect(modificador.ativo).toBe(true);
    });

    it('deve desativar o modificador', () => {
      const modificador = ModificadorValor.criar({
        modificadorGrupoId: 'grupo-1',
        nome: 'Grande',
        ajustePreco: Dinheiro.criar(500, 'BRL'),
        ativo: true,
      });

      modificador.desativar();

      expect(modificador.ativo).toBe(false);
    });
  });

  describe('atualizarNome', () => {
    it('deve atualizar o nome', () => {
      const modificador = ModificadorValor.criar({
        modificadorGrupoId: 'grupo-1',
        nome: 'Grande',
        ajustePreco: Dinheiro.criar(500, 'BRL'),
        ativo: true,
      });

      modificador.atualizarNome('Extra Grande');

      expect(modificador.nome).toBe('Extra Grande');
    });
  });

  describe('atualizarAjustePreco', () => {
    it('deve atualizar o ajuste de preço', () => {
      const modificador = ModificadorValor.criar({
        modificadorGrupoId: 'grupo-1',
        nome: 'Grande',
        ajustePreco: Dinheiro.criar(500, 'BRL'),
        ativo: true,
      });

      const novoPreco = Dinheiro.criar(750, 'BRL');
      modificador.atualizarAjustePreco(novoPreco);

      expect(modificador.ajustePreco.valor).toBe(750);
    });
  });
});
