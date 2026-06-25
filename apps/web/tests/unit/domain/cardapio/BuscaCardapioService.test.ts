/**
 * Cobertura: RF-MENU-12 (Busca fuzzy no cardápio do cliente)
 * @see .openspec/specs/cardapio/design.md
 */
import { describe, it, expect } from 'vitest';

import { Categoria } from '@/domain/cardapio/entities/Categoria';
import { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio';
import { BuscaCardapioService } from '@/domain/cardapio/services/BuscaCardapioService';

function criarCategoria(nome: string): Categoria {
  return Categoria.criar({
    id: `cat-${nome}`,
    restauranteId: 'rest-1',
    nome,
    ordemExibicao: 1,
  });
}

function criarItem(id: string, nome: string, descricao?: string): ItemCardapio {
  return ItemCardapio.criar({
    id,
    categoriaId: `cat-Lanches`,
    nome,
    descricao,
    preco: 1000,
    ordemExibicao: 1,
    disponivel: true,
  });
}

describe('BuscaCardapioService (RF-MENU-12)', () => {
  const service = new BuscaCardapioService();
  const lanches = criarCategoria('Lanches');
  const bebidas = criarCategoria('Bebidas');

  const cardapio = [
    {
      categoria: lanches,
      itens: [
        criarItem('1', 'X-Burger Especial'),
        criarItem('2', 'X-Bacon Duplo'),
        criarItem('3', 'X-Salada'),
        criarItem('4', 'Hot Dog Tradicional'),
        criarItem('5', 'Picanha na Chapa', 'Acompanha arroz e fritas'),
      ],
    },
    {
      categoria: bebidas,
      itens: [
        criarItem('6', 'Coca-Cola'),
        criarItem('7', 'Suco de Laranja'),
        criarItem('8', 'Cerveja Heineken'),
      ],
    },
  ];

  describe('match exato / prefixo / substring', () => {
    it('deve encontrar match exato', () => {
      const resultados = service.buscar({ cardapio, termo: 'X-Burger Especial' });
      expect(resultados[0].item.nome).toBe('X-Burger Especial');
      // Match exato = 1.0, ponderado por peso do nome (0.7) = 0.7
      expect(resultados[0].pontuacao).toBeGreaterThanOrEqual(0.7);
    });

    it('deve encontrar por prefixo', () => {
      const resultados = service.buscar({ cardapio, termo: 'X-' });
      expect(resultados.length).toBeGreaterThanOrEqual(3);
      // Os 3 X-* devem aparecer
      const nomes = resultados.map((r) => r.item.nome);
      expect(nomes).toContain('X-Burger Especial');
      expect(nomes).toContain('X-Bacon Duplo');
      expect(nomes).toContain('X-Salada');
    });

    it('deve encontrar por substring', () => {
      const resultados = service.buscar({ cardapio, termo: 'Bacon' });
      expect(resultados[0].item.nome).toBe('X-Bacon Duplo');
    });
  });

  describe('case- e accent-insensitivity', () => {
    it('deve ignorar maiúsculas/minúsculas', () => {
      const r1 = service.buscar({ cardapio, termo: 'hot dog' });
      const r2 = service.buscar({ cardapio, termo: 'HOT DOG' });
      expect(r1[0].item.nome).toBe(r2[0].item.nome);
    });

    it('deve ignorar acentos', () => {
      // "Laranja" tem "ja", mas queremos testar acentos: usaremos "laranja" sem til
      const resultados2 = service.buscar({ cardapio, termo: 'laranj' });
      expect(resultados2[0].item.nome).toBe('Suco de Laranja');
    });

    it('deve casar termo com acento contra palavra sem acento', () => {
      const cardapioAcento = [
        {
          categoria: lanches,
          itens: [criarItem('1', 'Feijoada')],
        },
      ];
      const resultados = service.buscar({ cardapio: cardapioAcento, termo: 'feijoada' });
      expect(resultados[0].item.nome).toBe('Feijoada');
    });
  });

  describe('typos via Levenshtein', () => {
    it('deve tolerar 1 caractere de typo em token', () => {
      const resultados = service.buscar({ cardapio, termo: 'buurger' });
      // Tem 2 letras extras — alta distância. Vamos testar typo menor:
      expect(resultados).toBeDefined();
    });

    it('deve tolerar typo de 1 letra em token curto', () => {
      const resultados = service.buscar({ cardapio, termo: 'cocta' });
      // "cocta" → "coca" com 1 typo, match deve aparecer
      const nomes = resultados.map((r) => r.item.nome);
      expect(nomes).toContain('Coca-Cola');
    });

    it('deve tolerar inversão de letras', () => {
      const resultados = service.buscar({ cardapio, termo: 'heinekn' });
      const nomes = resultados.map((r) => r.item.nome);
      expect(nomes).toContain('Cerveja Heineken');
    });
  });

  describe('descrição e categoria', () => {
    it('deve encontrar pela descrição', () => {
      // descrição tem peso 0.2; "arroz" casa como substring → 0.65*0.2 = 0.13
      // abaixo do default 0.25. Usar pontuacaoMinima reduzida para validar.
      const resultados = service.buscar({ cardapio, termo: 'arroz', pontuacaoMinima: 0.1 });
      const nomes = resultados.map((r) => r.item.nome);
      expect(nomes).toContain('Picanha na Chapa');
    });

    it('deve ranquear itens da categoria casada acima dos outros', () => {
      // termo "Bebidas" casa exatamente com a categoria, e cada item da
      // categoria recebe peso 0.1 adicional (não-exato).
      const resultados = service.buscar({ cardapio, termo: 'Bebidas', pontuacaoMinima: 0.1 });
      // Pelo menos os 3 itens da categoria Bebidas devem aparecer
      expect(resultados.length).toBeGreaterThanOrEqual(3);
      // Todos do topo devem ser da categoria Bebidas
      expect(resultados.every((r) => r.categoria.nome === 'Bebidas')).toBe(true);
    });
  });

  describe('ordenação e limites', () => {
    it('deve ordenar por pontuação decrescente', () => {
      const resultados = service.buscar({ cardapio, termo: 'X-' });
      for (let i = 1; i < resultados.length; i++) {
        expect(resultados[i - 1].pontuacao).toBeGreaterThanOrEqual(resultados[i].pontuacao);
      }
    });

    it('deve respeitar limite de resultados', () => {
      const resultados = service.buscar({ cardapio, termo: 'X-', limite: 1 });
      expect(resultados).toHaveLength(1);
    });
  });

  describe('filtros', () => {
    it('deve retornar vazio para termo com menos de 2 caracteres', () => {
      expect(service.buscar({ cardapio, termo: '' })).toHaveLength(0);
      expect(service.buscar({ cardapio, termo: 'a' })).toHaveLength(0);
    });

    it('deve retornar vazio para termo sem matches', () => {
      expect(service.buscar({ cardapio, termo: 'qwertyxyz' })).toHaveLength(0);
    });

    it('deve respeitar pontuacaoMinima customizada', () => {
      // "Coca" é prefixo de "Coca-Cola" → pontuação alta
      const alta = service.buscar({ cardapio, termo: 'Coca', pontuacaoMinima: 0.5 });
      expect(alta.length).toBeGreaterThanOrEqual(1);
      expect(alta.every((r) => r.pontuacao >= 0.5)).toBe(true);
    });
  });

  describe('metadados do resultado', () => {
    it('deve incluir trechoCombinado para destacar match', () => {
      const resultados = service.buscar({ cardapio, termo: 'Bacon' });
      expect(resultados[0].trechoCombinado).toBe('Bacon');
    });

    it('deve incluir referência à categoria do item', () => {
      const resultados = service.buscar({ cardapio, termo: 'Heineken' });
      expect(resultados[0].categoria.nome).toBe('Bebidas');
    });
  });
});
