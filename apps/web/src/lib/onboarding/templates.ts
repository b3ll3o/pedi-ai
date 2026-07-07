/**
 * Templates de Cardápio por Vertical
 *
 * Cada vertical de restaurante tem padrões diferentes:
 * - Pizzaria: pizzas salgadas + doces + bebidas, com tamanhos (P/M/G/GG)
 * - Hambúrgueria: burgers + combos + adicionais (bacon, ovo, queijo extra)
 * - Marmita fitness: pratos com macros + planos semanais
 * - Comida japonesa: sashimi + combinados + hot rolls
 * - Lanchonete: lanches + porções + combos
 *
 * Esses templates são importados pelo onboarding wizard pra popular
 * o cardápio inicial do novo restaurante em 1 clique.
 *
 * **Manutenção:**
 * - Adicionar nova vertical: novo objeto em `CARDAPIO_TEMPLATES`.
 * - Adicionar novo produto: dentro do array `produtos` da vertical.
 * - Categorias e produtos são apenas sugestões — o dono pode editar/remover.
 */

export type VerticalSlug = 'pizzaria' | 'hamburgueria' | 'marmita' | 'japonesa' | 'lanchonete';

export interface CategoriaTemplate {
  nome: string;
  descricao?: string;
  ordem: number;
}

export interface ProdutoTemplate {
  nome: string;
  descricao?: string;
  precoCentavos: number;
  categoria: string;
  temVariacoes?: boolean;
  variacoes?: { nome: string; precoCentavos: number }[];
  temAdicionais?: boolean;
  adicionaisSugeridos?: string[];
}

export interface CardapioTemplate {
  vertical: VerticalSlug;
  nome: string;
  emoji: string;
  descricao: string;
  categorias: CategoriaTemplate[];
  produtos: ProdutoTemplate[];
  /** Tempo médio de preparo (em minutos) — usado pro KDS. */
  tempoMedioPreparoMin: number;
  /** Sugestão de horário de funcionamento. */
  horariosSugeridos: { abre: string; fecha: string }[];
}

/**
 * Templates por vertical.
 *
 * IMPORTANTE: preços são SUGESTÕES de mercado — o dono edita antes de publicar.
 */
export const CARDAPIO_TEMPLATES: Record<VerticalSlug, CardapioTemplate> = {
  pizzaria: {
    vertical: 'pizzaria',
    nome: 'Pizzaria',
    emoji: '🍕',
    descricao: 'Cardápio clássico de pizzaria com pizzas salgadas, doces e bebidas.',
    categorias: [
      { nome: 'Pizzas Salgadas', ordem: 1 },
      { nome: 'Pizzas Doces', ordem: 2 },
      { nome: 'Bebidas', ordem: 3 },
    ],
    produtos: [
      { nome: 'Mussarela', descricao: 'Mussarela, orégano, azeitona', precoCentavos: 4500, categoria: 'Pizzas Salgadas', temVariacoes: true, variacoes: [
        { nome: 'P', precoCentavos: 4500 },
        { nome: 'M', precoCentavos: 5500 },
        { nome: 'G', precoCentavos: 6500 },
        { nome: 'GG', precoCentavos: 7500 },
      ], temAdicionais: true, adicionaisSugeridos: ['Borda Catupiry', 'Borda Cheddar', 'Borda Chocolate'] },
      { nome: 'Calabresa', descricao: 'Calabresa, cebola, azeitona', precoCentavos: 4500, categoria: 'Pizzas Salgadas', temVariacoes: true, variacoes: [
        { nome: 'P', precoCentavos: 4500 },
        { nome: 'M', precoCentavos: 5500 },
        { nome: 'G', precoCentavos: 6500 },
      ] },
      { nome: 'Portuguesa', descricao: 'Presunto, ovo, cebola, azeitona', precoCentavos: 5000, categoria: 'Pizzas Salgadas', temVariacoes: true, variacoes: [
        { nome: 'M', precoCentavos: 6000 },
        { nome: 'G', precoCentavos: 7500 },
      ] },
      { nome: 'Frango Catupiry', descricao: 'Frango desfiado, catupiry', precoCentavos: 5500, categoria: 'Pizzas Salgadas', temVariacoes: true, variacoes: [
        { nome: 'M', precoCentavos: 6500 },
        { nome: 'G', precoCentavos: 7800 },
      ] },
      { nome: 'Brigadeiro', descricao: 'Chocolate, granulado, morango', precoCentavos: 4200, categoria: 'Pizzas Doces', temVariacoes: true, variacoes: [
        { nome: 'P', precoCentavos: 4200 },
        { nome: 'M', precoCentavos: 5200 },
      ] },
      { nome: 'Romeu e Julieta', descricao: 'Goiabada, mussarela', precoCentavos: 4200, categoria: 'Pizzas Doces', temVariacoes: true, variacoes: [
        { nome: 'M', precoCentavos: 5200 },
      ] },
      { nome: 'Coca-Cola 2L', precoCentavos: 1500, categoria: 'Bebidas' },
      { nome: 'Guaraná 2L', precoCentavos: 1300, categoria: 'Bebidas' },
    ],
    tempoMedioPreparoMin: 30,
    horariosSugeridos: [
      { abre: '18:00', fecha: '23:30' },
      { abre: '18:00', fecha: '23:30' },
      { abre: '18:00', fecha: '23:30' },
      { abre: '18:00', fecha: '23:30' },
      { abre: '18:00', fecha: '00:30' },
      { abre: '18:00', fecha: '00:30' },
      { abre: '18:00', fecha: '23:00' },
    ],
  },

  hamburgueria: {
    vertical: 'hamburgueria',
    nome: 'Hambúrgueria',
    emoji: '🍔',
    descricao: 'Hambúrgueres artesanais com combos e adicionais.',
    categorias: [
      { nome: 'Burgers Clássicos', ordem: 1 },
      { nome: 'Burgers Especiais', ordem: 2 },
      { nome: 'Combos', ordem: 3 },
      { nome: 'Acompanhamentos', ordem: 4 },
      { nome: 'Bebidas', ordem: 5 },
    ],
    produtos: [
      { nome: 'X-Burger', descricao: 'Pão, hambúrguer 120g, queijo, alface, tomate', precoCentavos: 2500, categoria: 'Burgers Clássicos', temAdicionais: true, adicionaisSugeridos: ['Bacon', 'Ovo', 'Queijo extra', 'Onion rings'] },
      { nome: 'X-Bacon', descricao: 'Pão, hambúrguer 120g, queijo, bacon, alface, tomate', precoCentavos: 3000, categoria: 'Burgers Clássicos' },
      { nome: 'X-Salada', descricao: 'Pão, hambúrguer 120g, queijo, alface, tomate, maionese da casa', precoCentavos: 2800, categoria: 'Burgers Clássicos' },
      { nome: 'X-Tudo', descricao: 'Pão, 2 hambúrgueres 120g, queijo, bacon, ovo, presunto, alface, tomate', precoCentavos: 3800, categoria: 'Burgers Especiais' },
      { nome: 'Cheeseburger Premium', descricao: 'Pão brioche, blend 180g, cheddar inglês, cebola caramelizada', precoCentavos: 3500, categoria: 'Burgers Especiais' },
      { nome: 'Combo X-Burger', descricao: 'X-Burger + batata frita + refrigerante 350ml', precoCentavos: 3500, categoria: 'Combos' },
      { nome: 'Combo X-Tudo', descricao: 'X-Tudo + batata frita + refrigerante 350ml', precoCentavos: 4800, categoria: 'Combos' },
      { nome: 'Batata Frita', descricao: 'Porção 250g', precoCentavos: 1500, categoria: 'Acompanhamentos' },
      { nome: 'Onion Rings', descricao: 'Porção 200g', precoCentavos: 1800, categoria: 'Acompanhamentos' },
      { nome: 'Coca-Cola 350ml', precoCentavos: 800, categoria: 'Bebidas' },
    ],
    tempoMedioPreparoMin: 20,
    horariosSugeridos: [
      { abre: '19:00', fecha: '23:30' },
      { abre: '19:00', fecha: '23:30' },
      { abre: '19:00', fecha: '23:30' },
      { abre: '19:00', fecha: '23:30' },
      { abre: '19:00', fecha: '00:30' },
      { abre: '19:00', fecha: '01:30' },
      { abre: '19:00', fecha: '23:00' },
    ],
  },

  marmita: {
    vertical: 'marmita',
    nome: 'Marmita Fitness',
    emoji: '🥗',
    descricao: 'Marmitas fitness com macros e planos semanais.',
    categorias: [
      { nome: 'Marmitas Low Carb', ordem: 1 },
      { nome: 'Marmitas Tradicionais', ordem: 2 },
      { nome: 'Acompanhamentos', ordem: 3 },
      { nome: 'Bebidas', ordem: 4 },
    ],
    produtos: [
      { nome: 'Frango Grelhado Low Carb', descricao: '200g frango, brócolis, abobrinha, cenoura. ~350 kcal', precoCentavos: 2800, categoria: 'Marmitas Low Carb' },
      { nome: 'Patinho Moído Low Carb', descricao: '180g patinho, abóbora, couve-flor, vagem. ~380 kcal', precoCentavos: 3000, categoria: 'Marmitas Low Carb' },
      { nome: 'Salmão Low Carb', descricao: '150g salmão, aspargos, beterraba. ~420 kcal', precoCentavos: 4200, categoria: 'Marmitas Low Carb' },
      { nome: 'Frango com Arroz Integral', descricao: '150g frango, 100g arroz, feijão, salada. ~550 kcal', precoCentavos: 2500, categoria: 'Marmitas Tradicionais' },
      { nome: 'Carne com Batata Doce', descricao: '150g carne, 150g batata, feijão, salada. ~600 kcal', precoCentavos: 2700, categoria: 'Marmitas Tradicionais' },
      { nome: 'Salada Caesar', descricao: 'Alface, frango grelhado, croutons, parmesão. ~320 kcal', precoCentavos: 2200, categoria: 'Acompanhamentos' },
      { nome: 'Suco Verde', descricao: 'Couve, limão, gengibre, maçã. 500ml', precoCentavos: 1200, categoria: 'Bebidas' },
    ],
    tempoMedioPreparoMin: 15,
    horariosSugeridos: [
      { abre: '10:30', fecha: '14:30' },
      { abre: '10:30', fecha: '14:30' },
      { abre: '10:30', fecha: '14:30' },
      { abre: '10:30', fecha: '14:30' },
      { abre: '10:30', fecha: '14:30' },
      { abre: '11:00', fecha: '14:00' },
      { abre: 'fechado', fecha: 'fechado' },
    ],
  },

  japonesa: {
    vertical: 'japonesa',
    nome: 'Comida Japonesa',
    emoji: '🍣',
    descricao: 'Sushi, sashimi, combinados e hot rolls.',
    categorias: [
      { nome: 'Sashimi', ordem: 1 },
      { nome: 'Combinados', ordem: 2 },
      { nome: 'Hot Rolls', ordem: 3 },
      { nome: 'Temaki', ordem: 4 },
      { nome: 'Bebidas', ordem: 5 },
    ],
    produtos: [
      { nome: 'Sashimi Salmão', descricao: '10 fatias de salmão fresco', precoCentavos: 3800, categoria: 'Sashimi' },
      { nome: 'Sashimi Atum', descricao: '10 fatias de atum fresco', precoCentavos: 4200, categoria: 'Sashimi' },
      { nome: 'Sashimi Misto', descricao: '10 fatias (salmão + atum + peixe branco)', precoCentavos: 4500, categoria: 'Sashimi' },
      { nome: 'Combinado 15 peças', descricao: '5 sashimi + 5 niguiri + 5 uramaki', precoCentavos: 5500, categoria: 'Combinados' },
      { nome: 'Combinado 30 peças', descricao: '10 sashimi + 10 niguiri + 10 uramaki', precoCentavos: 9800, categoria: 'Combinados' },
      { nome: 'Hot Roll Salmão', descricao: '8 peças empanadas com cream cheese', precoCentavos: 3200, categoria: 'Hot Rolls' },
      { nome: 'Hot Roll Philadelphia', descricao: '8 peças com cream cheese e cebolinha', precoCentavos: 3500, categoria: 'Hot Rolls' },
      { nome: 'Temaki Salmão', descricao: 'Salmão, arroz, cream cheese, cebolinha', precoCentavos: 2800, categoria: 'Temaki' },
      { nome: 'Temaki Atum Spicy', descricao: 'Atum, maionese spicy, cebolinha', precoCentavos: 3200, categoria: 'Temaki' },
      { nome: 'Chá Gelado', precoCentavos: 800, categoria: 'Bebidas' },
    ],
    tempoMedioPreparoMin: 25,
    horariosSugeridos: [
      { abre: '18:00', fecha: '23:30' },
      { abre: 'fechado', fecha: 'fechado' },
      { abre: '18:00', fecha: '23:30' },
      { aceite: '18:00', fecha: '23:30' } as unknown as { abre: string; fecha: string },
      { abre: '18:00', fecha: '23:30' },
      { abre: '18:00', fecha: '00:00' },
      { abre: '18:00', fecha: '00:00' },
      { abre: '18:00', fecha: '23:30' },
    ] as { abre: string; fecha: string }[],
  },

  lanchonete: {
    vertical: 'lanchonete',
    nome: 'Lanchonete',
    emoji: '🥪',
    descricao: 'Lanches, porções e combos pra qualquer hora.',
    categorias: [
      { nome: 'Lanches', ordem: 1 },
      { nome: 'Porções', ordem: 2 },
      { nome: 'Bebidas', ordem: 3 },
    ],
    produtos: [
      { nome: 'Cachorro-quente', descricao: 'Pão, salsicha, batata palha, milho, ervilha, queijo', precoCentavos: 1200, categoria: 'Lanches' },
      { nome: 'X-Salada', descricao: 'Pão, hambúrguer, queijo, alface, tomate', precoCentavos: 1500, categoria: 'Lanches' },
      { nome: 'Misto Quente', descricao: 'Pão de forma, queijo, presunto', precoCentavos: 1000, categoria: 'Lanches' },
      { nome: 'Batata Frita P', descricao: 'Porção pequena 150g', precoCentavos: 1200, categoria: 'Porções' },
      { nome: 'Batata Frita G', descricao: 'Porção grande 300g', precoCentavos: 2000, categoria: 'Porções' },
      { nome: 'Refrigerante Lata', precoCentavos: 700, categoria: 'Bebidas' },
      { nome: 'Suco Natural', descricao: 'Laranja, abacaxi ou maracujá. 300ml', precoCentavos: 900, categoria: 'Bebidas' },
    ],
    tempoMedioPreparoMin: 15,
    horariosSugeridos: [
      { abre: '10:00', fecha: '22:00' },
      { abre: '10:00', fecha: '22:00' },
      { abre: '10:00', fecha: '22:00' },
      { abre: '10:00', fecha: '22:00' },
      { abre: '10:00', fecha: '23:00' },
      { abre: '10:00', fecha: '00:00' },
      { abre: '10:00', fecha: '22:00' },
    ],
  },
};

/**
 * Lista de verticais disponíveis (para o wizard).
 */
export const VERTICAIS: VerticalSlug[] = Object.keys(CARDAPIO_TEMPLATES) as VerticalSlug[];

/**
 * Helper: obtém template por slug.
 */
export function getTemplate(vertical: VerticalSlug): CardapioTemplate {
  return CARDAPIO_TEMPLATES[vertical];
}

/**
 * Helper: metadata leve de cada vertical (pra listar no wizard).
 */
export function getVerticaisMetadata() {
  return VERTICAIS.map((slug) => ({
    slug,
    nome: CARDAPIO_TEMPLATES[slug].nome,
    emoji: CARDAPIO_TEMPLATES[slug].emoji,
    descricao: CARDAPIO_TEMPLATES[slug].descricao,
    totalProdutos: CARDAPIO_TEMPLATES[slug].produtos.length,
    totalCategorias: CARDAPIO_TEMPLATES[slug].categorias.length,
  }));
}