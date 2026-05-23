import { describe, it, expect } from 'vitest';
import { ModificadorGrupoAggregate } from '@/domain/cardapio/aggregates/ModificadorGrupoAggregate';
import { ModificadorValor } from '@/domain/cardapio/entities/ModificadorValor';

describe('ModificadorGrupoAggregate', () => {
  const criarValor = (id: string, nome: string, preco: number, ativo: boolean = true): ModificadorValor => {
    return ModificadorValor.criar({
      id,
      grupoId: 'grupo-1',
      nome,
      precoAdicional: preco,
      ativo,
    });
  };

  const criarGrupo = (): ModificadorGrupoAggregate => {
    return ModificadorGrupoAggregate.criar({
      nome: 'Bordas',
      obrigatorio: true,
      minSelecoes: 1,
      maxSelecoes: 2,
      valores: [
        criarValor('v1', 'Catupiry', 500),
        criarValor('v2', 'Cheddar', 400),
        criarValor('v3', 'Cream Cheese', 600),
      ],
    });
  };

  describe('criar', () => {
    it('deve criar grupo com valores', () => {
      const grupo = criarGrupo();
      expect(grupo.nome).toBe('Bordas');
      expect(grupo.obrigatorio).toBe(true);
      expect(grupo.minSelecoes).toBe(1);
      expect(grupo.maxSelecoes).toBe(2);
      expect(grupo.valores).toHaveLength(3);
    });
  });

  describe('validarInvariantes', () => {
    it('deve lançar erro se minSelecoes maior que maxSelecoes', () => {
      expect(() => ModificadorGrupoAggregate.criar({
        nome: 'Teste',
        obrigatorio: false,
        minSelecoes: 3,
        maxSelecoes: 1,
        valores: [],
      })).toThrow(/minSelecoes não pode ser maior/);
    });

    it('deve lançar erro se minSelecoes negativo', () => {
      expect(() => ModificadorGrupoAggregate.criar({
        nome: 'Teste',
        obrigatorio: false,
        minSelecoes: -1,
        maxSelecoes: 2,
        valores: [],
      })).toThrow(/não pode ser negativo/);
    });

    it('deve lançar erro se obrigatorio sem minSelecoes', () => {
      expect(() => ModificadorGrupoAggregate.criar({
        nome: 'Teste',
        obrigatorio: true,
        minSelecoes: 0,
        maxSelecoes: 2,
        valores: [],
      })).toThrow(/obrigatorio deve ter minSelecoes/);
    });

    it('deve lançar erro se maxSelecoes excede valores ativos', () => {
      expect(() => ModificadorGrupoAggregate.criar({
        nome: 'Teste',
        obrigatorio: false,
        minSelecoes: 0,
        maxSelecoes: 5,
        valores: [
          criarValor('v1', 'A', 100),
          criarValor('v2', 'B', 100, false),
        ],
      })).toThrow(/maxSelecoes não pode exceder/);
    });
  });

  describe('validarSelecao', () => {
    it('deve validar seleção correta', () => {
      const grupo = criarGrupo();
      const result = grupo.validarSelecao(['v1']);

      expect(result.valido).toBe(true);
      expect(result.erros).toHaveLength(0);
    });

    it('deve falhar se não atingir mínimo', () => {
      const grupo = criarGrupo();
      const result = grupo.validarSelecao([]);

      expect(result.valido).toBe(false);
      expect(result.erros.some((e) => e.includes('pelo menos'))).toBe(true);
    });

    it('deve falhar se exceder máximo', () => {
      const grupo = criarGrupo();
      const result = grupo.validarSelecao(['v1', 'v2', 'v3']);

      expect(result.valido).toBe(false);
      expect(result.erros.some((e) => e.includes('máximo'))).toBe(true);
    });

    it('deve falhar se valor não existe', () => {
      const grupo = criarGrupo();
      const result = grupo.validarSelecao(['v1', 'nao-existe']);

      expect(result.valido).toBe(false);
      expect(result.erros.some((e) => e.includes('não existe'))).toBe(true);
    });

    it('deve falhar se valor inativo', () => {
      const grupo = criarGrupo();
      const result = grupo.validarSelecao(['v1', 'v3']);

      expect(result.valido).toBe(true);
    });
  });

  describe('adicionarValor', () => {
    it('deve adicionar valor ao grupo', () => {
      const grupo = criarGrupo();
      const novoValor = ModificadorValor.criar({
        grupoId: grupo.id,
        nome: 'Margherita',
        precoAdicional: 550,
        ativo: true,
      });
      grupo.adicionarValor(novoValor);

      expect(grupo.valores).toHaveLength(4);
    });

    it('deve validar após adicionar valor', () => {
      const grupo = criarGrupo();
      const novoValor = ModificadorValor.criar({
        grupoId: grupo.id,
        nome: 'Nova',
        precoAdicional: 0,
        ativo: true,
      });
      expect(() => grupo.adicionarValor(novoValor)).not.toThrow();
    });
  });

  describe('removerValor', () => {
    it('deve remover valor do grupo', () => {
      const grupo = criarGrupo();
      const valorId = grupo.valores[0].id;
      grupo.removerValor(valorId);

      expect(grupo.valores).toHaveLength(2);
    });
  });

  describe('reconstruir', () => {
    it('deve reconstruir aggregate a partir de props', () => {
      const grupo = criarGrupo();
      const props = grupo['grupo']['props'];
      const reconstruido = ModificadorGrupoAggregate.reconstruir(props);

      expect(reconstruido.id).toBe(grupo.id);
      expect(reconstruido.nome).toBe(grupo.nome);
    });
  });
});