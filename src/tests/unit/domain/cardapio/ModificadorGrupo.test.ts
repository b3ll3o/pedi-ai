import { describe, it, expect } from 'vitest';
import { ModificadorGrupo, ModificadorGrupoProps } from '@/domain/cardapio/entities/ModificadorGrupo';
import { ModificadorValor } from '@/domain/cardapio/entities/ModificadorValor';
import { Dinheiro } from '@/domain/pedido/value-objects/Dinheiro';

describe('ModificadorGrupo', () => {
  const criarModificadorValor = (modificadorGrupoId: string, ativo = true): ModificadorValor => {
    return ModificadorValor.criar({
      modificadorGrupoId,
      nome: `Valor ${crypto.randomUUID().slice(0, 4)}`,
      ajustePreco: Dinheiro.criar(100, 'BRL'),
      ativo,
    });
  };

  const criarGrupo = (props?: Partial<Omit<ModificadorGrupoProps, 'id'>>): ModificadorGrupo => {
    return ModificadorGrupo.criar({
      restauranteId: 'restaurante-1',
      nome: 'Tamanho',
      obrigatorio: true,
      minSelecoes: 1,
      maxSelecoes: 1,
      valores: [],
      ativo: true,
      ...props,
    });
  };

  describe('criar', () => {
    it('deve criar um grupo de modificador com ID gerado', () => {
      const grupo = criarGrupo();

      expect(grupo.id).toBeDefined();
      expect(grupo.restauranteId).toBe('restaurante-1');
      expect(grupo.nome).toBe('Tamanho');
      expect(grupo.obrigatorio).toBe(true);
      expect(grupo.minSelecoes).toBe(1);
      expect(grupo.maxSelecoes).toBe(1);
      expect(grupo.valores).toHaveLength(0);
      expect(grupo.ativo).toBe(true);
    });
  });

  describe('reconstruir', () => {
    it('deve reconstruir um grupo de modificador', () => {
      const grupoOriginal = criarGrupo();
      const valor = criarModificadorValor(grupoOriginal.id);
      const props: ModificadorGrupoProps = {
        id: grupoOriginal.id,
        restauranteId: 'restaurante-1',
        nome: 'Adicionais',
        obrigatorio: false,
        minSelecoes: 0,
        maxSelecoes: 3,
        valores: [valor],
        ativo: true,
      };

      const grupo = ModificadorGrupo.reconstruir(props);

      expect(grupo.id).toBe(grupoOriginal.id);
      expect(grupo.nome).toBe('Adicionais');
      expect(grupo.obrigatorio).toBe(false);
    });
  });

  describe('equals', () => {
    it('deve ser igual quando IDs são iguais', () => {
      const grupo1 = criarGrupo();
      const grupo2 = ModificadorGrupo.reconstruir({
        id: grupo1.id,
        restauranteId: 'restaurante-1',
        nome: 'Outro Nome',
        obrigatorio: false,
        minSelecoes: 0,
        maxSelecoes: 5,
        valores: [],
        ativo: false,
      });

      expect(grupo1.equals(grupo2)).toBe(true);
    });
  });

  describe('temValor e getValor', () => {
    it('deve verificar se tem um valor pelo ID', () => {
      const grupo = criarGrupo();
      const valor = criarModificadorValor(grupo.id);

      grupo.adicionarValor(valor);

      expect(grupo.temValor(valor.id)).toBe(true);
      expect(grupo.temValor('nao-existe')).toBe(false);
    });

    it('deve obter um valor pelo ID', () => {
      const grupo = criarGrupo();
      const valor = criarModificadorValor(grupo.id);

      grupo.adicionarValor(valor);

      expect(grupo.getValor(valor.id)).toBe(valor);
      expect(grupo.getValor('nao-existe')).toBeUndefined();
    });
  });

  describe('valoresAtivos', () => {
    it('deve retornar apenas valores ativos', () => {
      const grupo = criarGrupo();
      const valorAtivo = criarModificadorValor(grupo.id, true);
      const valorInativo = criarModificadorValor(grupo.id, false);

      grupo.adicionarValor(valorAtivo);
      grupo.adicionarValor(valorInativo);

      expect(grupo.valoresAtivos).toHaveLength(1);
      expect(grupo.valoresAtivos[0].id).toBe(valorAtivo.id);
    });
  });

  describe('adicionarValor', () => {
    it('deve adicionar um valor ao grupo', () => {
      const grupo = criarGrupo();
      const novoValor = criarModificadorValor(grupo.id);

      grupo.adicionarValor(novoValor);

      expect(grupo.valores).toHaveLength(1);
      expect(grupo.valores[0].id).toBe(novoValor.id);
    });

    it('deve lançar erro se valor não pertence ao grupo', () => {
      const grupo = criarGrupo();
      const valorOutroGrupo = criarModificadorValor('outro-grupo-id');

      expect(() => grupo.adicionarValor(valorOutroGrupo)).toThrow('Valor não pertence a este grupo de modificador');
    });
  });

  describe('removerValor', () => {
    it('deve remover um valor do grupo', () => {
      const grupo = criarGrupo();
      const valor = criarModificadorValor(grupo.id);

      grupo.adicionarValor(valor);
      grupo.removerValor(valor.id);

      expect(grupo.valores).toHaveLength(0);
    });

    it('deve lançar erro se valor não existe', () => {
      const grupo = criarGrupo();

      expect(() => grupo.removerValor('nao-existe')).toThrow();
    });
  });

  describe('atualizarNome', () => {
    it('deve atualizar o nome', () => {
      const grupo = criarGrupo();

      grupo.atualizarNome('Novo Nome');

      expect(grupo.nome).toBe('Novo Nome');
    });
  });

  describe('atualizarObrigatoriedade', () => {
    it('deve atualizar a obrigatoriedade', () => {
      const grupo = criarGrupo({ obrigatorio: true });

      grupo.atualizarObrigatoriedade(false);

      expect(grupo.obrigatorio).toBe(false);
    });
  });

  describe('atualizarSelecoes', () => {
    it('deve atualizar os limites de seleção', () => {
      const grupo = criarGrupo({ minSelecoes: 0, maxSelecoes: 1 });

      grupo.atualizarSelecoes(1, 5);

      expect(grupo.minSelecoes).toBe(1);
      expect(grupo.maxSelecoes).toBe(5);
    });

    it('deve lançar erro se min < 0', () => {
      const grupo = criarGrupo();

      expect(() => grupo.atualizarSelecoes(-1, 5)).toThrow('Configuração de seleção inválida');
    });

    it('deve lançar erro se max < min', () => {
      const grupo = criarGrupo();

      expect(() => grupo.atualizarSelecoes(5, 3)).toThrow('Configuração de seleção inválida');
    });
  });

  describe('desativar', () => {
    it('deve desativar o grupo', () => {
      const grupo = criarGrupo({ ativo: true });

      grupo.desativar();

      expect(grupo.ativo).toBe(false);
    });
  });
});
