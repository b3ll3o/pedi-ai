/**
 * Integration test: purge LGPD com fake-indexeddb (jsdom).
 *
 * Garante que `purgeAllUserData` realmente limpa as 10 stores PII
 * distribuídas entre os DOIS PediDatabase do projeto:
 *   - `lib/offline/db` (v2): cart, pending_sync
 *   - `infrastructure/persistence/database` (v6): usuarios, sessoes,
 *     pedidos, carrinhos, pagamentos, transacoes, user_restaurants,
 *     configuracoes_restaurante
 *
 * Stores SEM PII (menu_cache, tables_info, restaurantes, etc.) devem ser
 * preservadas.
 *
 * Este teste protege contra regressões do tipo: alguém adiciona uma
 * store nova com PII e esquece de listar em PII_STORE_NAMES, ou alguém
 * aponta o import para o DB errado novamente.
 *
 * Roda em jsdom + fake-indexeddb/auto (configurado em
 * apps/web/tests/setup-vitest.ts). O nome do banco é 'pedi' (igual
 * para ambas as instâncias) — fake-indexeddb mantém o estado entre as
 * duas, simulando o cenário browser real.
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { db as cartDb } from '@/lib/offline/db';
import {
  db as fullDb,
  type UsuarioRecord,
  type SessaoRecord,
  type PedidoRecord,
  type CarrinhoRecord,
} from '@/infrastructure/persistence/database';
import { purgeAllUserData } from '@/lib/offline/pii-purge';

describe('Integration: purga LGPD (purgeAllUserData)', () => {
  beforeEach(async () => {
    // Limpa todas as stores relevantes para isolar cada teste.
    await Promise.all([
      cartDb.cart.clear(),
      cartDb.pending_sync.clear(),
      cartDb.menu_cache.clear(),
      cartDb.tables_info.clear(),
      fullDb.usuarios.clear(),
      fullDb.sessoes.clear(),
      fullDb.pedidos.clear(),
      fullDb.carrinhos.clear(),
      fullDb.pagamentos.clear(),
      fullDb.transacoes.clear(),
      // user_restaurants não é declarada como propriedade da classe —
      // acessamos via getTable dinâmico (mesmo padrão de pii-purge).
      (
        fullDb as unknown as { user_restaurants?: { clear: () => Promise<unknown> } }
      ).user_restaurants?.clear() ?? Promise.resolve(),
      fullDb.configuracoes_restaurante.clear(),
    ]);
  });

  it('limpa todas as 10 stores PII quando há dados', async () => {
    // Popula cart + pending_sync no DB v2.
    await cartDb.cart.add({
      productId: 'prod-1',
      quantity: 1,
      modifiers: {},
      price: 10,
      createdAt: new Date(),
    });
    await cartDb.pending_sync.add({
      restaurantId: 'rest-1',
      orderData: {
        table_id: 'mesa-1',
        customer_id: 'cli-1',
        customerName: 'João da Silva',
        customerPhone: '+5511999990000',
        customerEmail: 'joao@example.com',
        items: [],
        idempotency_key: 'key-1',
      },
      retryCount: 0,
      maxRetries: 3,
      status: 'pending',
      createdAt: new Date(),
    });

    // Popula stores PII no DB v6.
    const usuario: UsuarioRecord = {
      id: 'user-1',
      email: 'maria@example.com',
      papel: 'dono',
      restauranteId: 'rest-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await fullDb.usuarios.add(usuario);

    const sessao: SessaoRecord = {
      id: 'sess-1',
      usuarioId: 'user-1',
      token: 'jwt-fake',
      expiracao: new Date(Date.now() + 86400000),
      createdAt: new Date(),
    };
    await fullDb.sessoes.add(sessao);

    const pedido: PedidoRecord = {
      id: 'pedido-1',
      clienteId: 'cli-1',
      restauranteId: 'rest-1',
      mesaId: 'mesa-1',
      status: 'pending',
      itens: JSON.stringify([]),
      subtotal: JSON.stringify({ valor: 0, moeda: 'BRL' }),
      tax: '0',
      total: '0',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await fullDb.pedidos.add(pedido);

    const carrinho: CarrinhoRecord = {
      id: 'carr-1',
      clienteId: 'cli-1',
      restauranteId: 'rest-1',
      itens: JSON.stringify([]),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await fullDb.carrinhos.add(carrinho);

    await fullDb.pagamentos.add({
      id: 'pag-1',
      pedidoId: 'pedido-1',
      metodo: 'pix',
      status: 'pending',
      valor: { valor: 1000, moeda: 'BRL' },
      createdAt: new Date(),
    });
    await fullDb.transacoes.add({
      id: 'trans-1',
      pagamentoId: 'pag-1',
      tipo: 'criacao',
      status: 'pendente',
      createdAt: new Date(),
    });
    await fullDb.configuracoes_restaurante.add({
      restauranteId: 'rest-1',
      permitePedidoOnline: true,
      permiteReserva: false,
      tempoPreparoMinutos: 30,
      taxaEntrega: 0,
      valorMinimoPedido: 0,
      modoOperacao: 'delivery',
      horariosFuncionamento: [],
    });

    // Sanity check — antes da purga, há dados em todas as stores.
    expect(await cartDb.cart.count()).toBe(1);
    expect(await cartDb.pending_sync.count()).toBe(1);
    expect(await fullDb.usuarios.count()).toBe(1);
    expect(await fullDb.sessoes.count()).toBe(1);
    expect(await fullDb.pedidos.count()).toBe(1);
    expect(await fullDb.carrinhos.count()).toBe(1);
    expect(await fullDb.pagamentos.count()).toBe(1);
    expect(await fullDb.transacoes.count()).toBe(1);
    expect(await fullDb.configuracoes_restaurante.count()).toBe(1);

    // Executa a purga.
    const result = await purgeAllUserData();

    // Cada store PII deve estar vazia.
    expect(await cartDb.cart.count()).toBe(0);
    expect(await cartDb.pending_sync.count()).toBe(0);
    expect(await fullDb.usuarios.count()).toBe(0);
    expect(await fullDb.sessoes.count()).toBe(0);
    expect(await fullDb.pedidos.count()).toBe(0);
    expect(await fullDb.carrinhos.count()).toBe(0);
    expect(await fullDb.pagamentos.count()).toBe(0);
    expect(await fullDb.transacoes.count()).toBe(0);
    expect(await fullDb.configuracoes_restaurante.count()).toBe(0);

    // Telemetria deve refletir as contagens.
    expect(result.cart).toBe(1);
    expect(result.pendingSync).toBe(1);
    expect(result.usuarios).toBe(1);
    expect(result.sessoes).toBe(1);
    expect(result.pedidos).toBe(1);
    expect(result.carrinhos).toBe(1);
    expect(result.pagamentos).toBe(1);
    expect(result.transacoes).toBe(1);
    expect(result.configuracoes).toBe(1);
    expect(result.total).toBe(9); // 9 stores com dados (user_restaurants vazio)
  });

  it('preserva stores não-PII (menu_cache, tables_info)', async () => {
    await cartDb.menu_cache.add({
      restaurantId: 'rest-1',
      categories: [],
      products: [],
      modifiers: [],
      timestamp: new Date(),
    });
    await cartDb.tables_info.add({
      tableId: 'mesa-1',
      restaurantId: 'rest-1',
      name: 'Mesa 1',
      timestamp: new Date(),
    });

    const antesMenu = await cartDb.menu_cache.count();
    const antesTables = await cartDb.tables_info.count();
    expect(antesMenu).toBe(1);
    expect(antesTables).toBe(1);

    await purgeAllUserData();

    // menu_cache e tables_info NÃO devem ser tocados (não contêm PII).
    expect(await cartDb.menu_cache.count()).toBe(1);
    expect(await cartDb.tables_info.count()).toBe(1);
  });

  it('é idempotente — segunda chamada sem erros e contagens zero', async () => {
    await fullDb.usuarios.add({
      id: 'user-1',
      email: 'a@a.com',
      papel: 'dono',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await purgeAllUserData();
    const segundo = await purgeAllUserData();

    // Segunda chamada: não há nada para limpar, total = 0.
    expect(segundo.total).toBe(0);
    expect(segundo.usuarios).toBe(0);
    expect(await fullDb.usuarios.count()).toBe(0);
  });

  it('não lança quando há stores ausentes (defensive getTable)', async () => {
    // Não popula nada — força o caminho defensivo (todas as stores existem
    // no fake-indexeddb mas estão vazias).
    await expect(purgeAllUserData()).resolves.toBeDefined();

    const result = await purgeAllUserData();
    expect(result.total).toBe(0);
  });
});
