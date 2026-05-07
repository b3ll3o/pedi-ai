import Dexie, { type Table } from 'dexie';
import type {
  CartItem,
  MenuCache,
  PendingSync,
  TableInfo,
} from '@/lib/offline/types';
import type {
  UsuarioRecord,
  SessaoRecord,
  RestauranteRecord,
  MesaRecord,
  PagamentoRecord,
  TransacaoRecord,
  PedidoRecord,
  CategoriaRecord,
  ItemCardapioRecord,
  ModificadorGrupoRecord,
  ModificadorValorRecord,
  ComboRecord,
  CarrinhoRecord,
  UsuarioRestauranteRecord,
  ConfiguracoesRestauranteRecord,
} from '@/infrastructure/persistence/database';

/**
 * In-memory Dexie database for unit testing.
 * Uses IndexedDB emulation via jsdom environment.
 */
export class TestPediDatabase extends Dexie {
  // Tabelas existentes
  cart!: Table<CartItem>;
  menu_cache!: Table<MenuCache>;
  pending_sync!: Table<PendingSync>;
  tables_info!: Table<TableInfo>;

  // Tabelas de autenticação
  usuarios!: Table<UsuarioRecord, string>;
  sessoes!: Table<SessaoRecord, string>;

  // Tabelas de admin
  restaurantes!: Table<RestauranteRecord, string>;
  pedidos!: Table<PedidoRecord, string>;
  configuracoes_restaurante!: Table<ConfiguracoesRestauranteRecord, string>;

  // Tabelas de mesa
  mesas!: Table<MesaRecord, string>;

  // Tabelas de pagamento
  pagamentos!: Table<PagamentoRecord, string>;
  transacoes!: Table<TransacaoRecord, string>;

  // Tabelas de cardápio
  categorias!: Table<CategoriaRecord, string>;
  itens_cardapio!: Table<ItemCardapioRecord, string>;
  modificadores_grupo!: Table<ModificadorGrupoRecord, string>;
  modificadores_valor!: Table<ModificadorValorRecord, string>;
  combos!: Table<ComboRecord, string>;

  // Tabela de carrinho
  carrinhos!: Table<CarrinhoRecord, string>;

  // Tabela de vínculo usuário-restaurante
  user_restaurants!: Table<UsuarioRestauranteRecord, number>;

  constructor() {
    super('test-pedi-' + Math.random().toString(36).substring(7));

    this.version(1).stores({
      cart: '++id, productId, createdAt',
      menu_cache: '++id, timestamp',
      pending_sync: '++id, status, createdAt',
      tables_info: '++id, tableId, restaurantId',
    });

    this.version(2).stores({
      cart: '++id, productId, createdAt',
      menu_cache: '++id, timestamp',
      pending_sync: '++id, status, createdAt',
      tables_info: '++id, tableId, restaurantId',
      usuarios: 'id, email, restauranteId, papel',
      sessoes: 'id, usuarioId, token, expiracao',
      restaurantes: 'id, cnpj',
      pedidos: 'id, restauranteId, status, createdAt, clienteId, mesaId',
    });

    this.version(3).stores({
      cart: '++id, productId, createdAt',
      menu_cache: '++id, timestamp',
      pending_sync: '++id, status, createdAt',
      tables_info: '++id, tableId, restaurantId',
      usuarios: 'id, email, restauranteId, papel',
      sessoes: 'id, usuarioId, token, expiracao',
      restaurantes: 'id, cnpj',
      pedidos: 'id, restauranteId, status, createdAt, clienteId, mesaId',
      mesas: 'id, restauranteId, label',
      pagamentos: 'id, pedidoId, transacaoId, status',
      transacoes: 'id, pagamentoId, providerId, status',
    });

    this.version(4).stores({
      cart: '++id, productId, createdAt',
      menu_cache: '++id, timestamp',
      pending_sync: '++id, status, createdAt',
      tables_info: '++id, tableId, restaurantId',
      usuarios: 'id, email, restauranteId, papel',
      sessoes: 'id, usuarioId, token, expiracao',
      restaurantes: 'id, cnpj',
      pedidos: 'id, restauranteId, status, createdAt, clienteId, mesaId',
      mesas: 'id, restauranteId, label',
      pagamentos: 'id, pedidoId, transacaoId, status',
      transacoes: 'id, pagamentoId, providerId, status',
      configuracoes_restaurante: 'restauranteId',
    });

    this.version(5).stores({
      cart: '++id, productId, createdAt',
      menu_cache: '++id, timestamp',
      pending_sync: '++id, status, createdAt',
      tables_info: '++id, tableId, restaurantId',
      usuarios: 'id, email, restauranteId, papel',
      sessoes: 'id, usuarioId, token, expiracao',
      restaurantes: 'id, cnpj',
      pedidos: 'id, restauranteId, status, createdAt, clienteId, mesaId',
      mesas: 'id, restauranteId, label',
      pagamentos: 'id, pedidoId, transacaoId, status',
      transacoes: 'id, pagamentoId, providerId, status',
      configuracoes_restaurante: 'restauranteId',
      categorias: 'id, restauranteId',
      itens_cardapio: 'id, categoriaId, restauranteId, tipo',
      modificadores_grupo: 'id, restauranteId',
      modificadores_valor: 'id, modificadorGrupoId',
      combos: 'id, restauranteId',
      carrinhos: 'id, restauranteId',
    });

    this.version(6).stores({
      cart: '++id, productId, restaurantId, timestamp',
      menu_cache: '++id, restaurantId, timestamp',
      pending_sync: '++id, restaurantId, status, createdAt',
      tables_info: '++id, tableId, restaurantId',
      usuarios: 'id, email, restauranteId, papel',
      sessoes: 'id, usuarioId, token, expiracao',
      restaurantes: 'id, cnpj',
      pedidos: 'id, restauranteId, status, createdAt, clienteId, mesaId',
      mesas: 'id, restauranteId, label',
      pagamentos: 'id, pedidoId, transacaoId, status',
      transacoes: 'id, pagamentoId, providerId, status',
      configuracoes_restaurante: 'restauranteId',
      categorias: 'id, restauranteId',
      itens_cardapio: 'id, categoriaId, restauranteId, tipo',
      modificadores_grupo: 'id, restauranteId',
      modificadores_valor: 'id, modificadorGrupoId',
      combos: 'id, restauranteId',
      carrinhos: 'id, restauranteId',
      user_restaurants: '++id, user_id, restaurant_id, role',
    });

    this.version(7).stores({
      cart: '++id, productId, restaurantId, timestamp',
      menu_cache: '++id, restaurantId, timestamp',
      pending_sync: '++id, restaurantId, status, createdAt',
      tables_info: '++id, tableId, restaurantId',
      usuarios: 'id, email, restauranteId, papel',
      sessoes: 'id, usuarioId, token, expiracao',
      restaurantes: 'id, cnpj',
      pedidos: 'id, restauranteId, status, createdAt, clienteId, mesaId',
      mesas: 'id, restauranteId, label',
      pagamentos: 'id, pedidoId, transacaoId, status',
      transacoes: 'id, pagamentoId, providerId, status',
      configuracoes_restaurante: 'restauranteId',
      categorias: 'id, restauranteId',
      itens_cardapio: 'id, categoriaId, restauranteId, tipo',
      modificadores_grupo: 'id, restauranteId',
      modificadores_valor: 'id, modificadorGrupoId',
      combos: 'id, restauranteId',
      carrinhos: 'id, restauranteId',
      user_restaurants: '++id, user_id, restaurant_id, role',
    });
  }
}

/**
 * Creates a fresh in-memory database for each test.
 */
export function createTestDatabase(): TestPediDatabase {
  return new TestPediDatabase();
}
