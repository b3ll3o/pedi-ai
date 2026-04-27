import Dexie, { type Table } from 'dexie';
import type { CartItem, MenuCache, PendingSync, TableInfo } from '@/lib/offline/types';
import type { UsuarioProps as _UsuarioProps } from '@/domain/autenticacao/entities/Usuario';
import type { SessaoProps } from '@/domain/autenticacao/entities/Sessao';
import type { RestauranteProps } from '@/domain/admin/entities/Restaurante';

/**
 * Tipos para tabelas de autenticação e admin
 * Nota: campos como 'papel' são armazenados como strings para facilitar a indexação no Dexie
 */
export interface UsuarioRecord {
  id: string;
  email: string;
  papel: string; // Armazenado como string (PapelValue), não como objeto Papel
  restauranteId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessaoRecord extends SessaoProps {
  id: string;
}

export interface RestauranteRecord extends RestauranteProps {
  id: string;
}

export interface MesaRecord {
  id: string;
  restauranteId: string;
  label: string;
  qrCodePayload: {
    restauranteId: string;
    mesaId: string;
    assinatura: string;
  };
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PagamentoRecord {
  id: string;
  pedidoId: string;
  metodo: string;
  status: string;
  valor: {
    valor: number;
    moeda: string;
  };
  transacaoId?: string;
  webhookId?: string;
  createdAt: Date;
  confirmedAt?: Date;
}

export interface TransacaoRecord {
  id: string;
  pagamentoId: string;
  tipo: string;
  providerId?: string;
  status: string;
  payload?: string;
  createdAt: Date;
}

export interface ConfiguracoesRestauranteRecord {
  restauranteId: string;
  permitePedidoOnline: boolean;
  permiteReserva: boolean;
  tempoPreparoMinutos: number;
  taxaEntrega: number;
  valorMinimoPedido: number;
  modoOperacao: 'delivery' | 'retirada' | 'ambos' | 'local';
  horariosFuncionamento: Array<{
    diaSemana: number;
    horaAbertura: string;
    horaFechamento: string;
    fechado: boolean;
  }>;
}

// Tipos para pedido - usando o formato existente com JSON serializado
export interface PedidoRecord {
  id: string;
  clienteId?: string;
  mesaId?: string;
  restauranteId: string;
  status: string;
  itens: string; // JSON serialized
  subtotal: string; // JSON serialized { valor: number, moeda: string }
  tax: string;
  total: string;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos para cardápio
export interface CategoriaRecord {
  id: string;
  restauranteId: string;
  nome: string;
  descricao: string | null;
  imagemUrl: string | null;
  ordemExibicao: number;
  ativo: boolean;
}

export interface ItemCardapioRecord {
  id: string;
  categoriaId: string;
  restauranteId: string;
  nome: string;
  descricao: string | null;
  preco: string; // JSON serialized { valor: number, moeda: string }
  imagemUrl: string | null;
  tipo: string;
  labelsDieteticos: string; // JSON array
  ativo: boolean;
}

export interface ModificadorGrupoRecord {
  id: string;
  restauranteId: string;
  nome: string;
  obrigatorio: boolean;
  minSelecoes: number;
  maxSelecoes: number;
  valores: string; // JSON serialized array
}

export interface ModificadorValorRecord {
  id: string;
  modificadorGrupoId: string;
  nome: string;
  ajustePreco: string; // JSON serialized { valor: number, moeda: string }
  ativo: boolean;
}

export interface ComboRecord {
  id: string;
  restauranteId: string;
  nome: string;
  descricao: string | null;
  precoBundle: string; // JSON serialized { valor: number, moeda: string }
  imagemUrl: string | null;
  itens: string; // JSON serialized
  ativo: boolean;
}

export interface CarrinhoRecord {
  id: string;
  clienteId?: string;
  mesaId?: string;
  restauranteId: string;
  itens: string; // JSON serialized
  metodoPagamento?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PediDatabase extends Dexie {
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

  constructor() {
    super('pedi');
    this.version(1).stores({
      cart: '++id, productId, createdAt',
      menu_cache: '++id, timestamp',
      pending_sync: '++id, status, createdAt',
      tables_info: '++id, tableId, restaurantId',
    });

    // Versão 2: adicionar tabelas de autenticação e admin
    this.version(2).stores({
      cart: '++id, productId, createdAt',
      menu_cache: '++id, timestamp',
      pending_sync: '++id, status, createdAt',
      tables_info: '++id, tableId, restaurantId',
      usuarios: 'id, email, restauranteId, papel',
      sessoes: 'id, usuarioId, token',
      restaurantes: 'id, cnpj, ativo',
      pedidos: 'id, restauranteId, status, createdAt',
    });

    // Versão 3: adicionar tabelas de mesa e pagamento
    this.version(3).stores({
      cart: '++id, productId, createdAt',
      menu_cache: '++id, timestamp',
      pending_sync: '++id, status, createdAt',
      tables_info: '++id, tableId, restaurantId',
      usuarios: 'id, email, restauranteId, papel',
      sessoes: 'id, usuarioId, token',
      restaurantes: 'id, cnpj, ativo',
      pedidos: 'id, restauranteId, status, createdAt',
      mesas: 'id, restauranteId, label, ativo',
      pagamentos: 'id, pedidoId, transacaoId, status',
      transacoes: 'id, pagamentoId, providerId, status',
    });

    // Versão 4: adicionar tabela de configurações de restaurante
    this.version(4).stores({
      cart: '++id, productId, createdAt',
      menu_cache: '++id, timestamp',
      pending_sync: '++id, status, createdAt',
      tables_info: '++id, tableId, restaurantId',
      usuarios: 'id, email, restauranteId, papel',
      sessoes: 'id, usuarioId, token',
      restaurantes: 'id, cnpj, ativo',
      pedidos: 'id, restauranteId, status, createdAt',
      mesas: 'id, restauranteId, label, ativo',
      pagamentos: 'id, pedidoId, transacaoId, status',
      transacoes: 'id, pagamentoId, providerId, status',
      configuracoes_restaurante: 'restauranteId',
    });

    // Versão 5: adicionar tabelas de cardápio e carrinho
    this.version(5).stores({
      cart: '++id, productId, createdAt',
      menu_cache: '++id, timestamp',
      pending_sync: '++id, status, createdAt',
      tables_info: '++id, tableId, restaurantId',
      usuarios: 'id, email, restauranteId, papel',
      sessoes: 'id, usuarioId, token',
      restaurantes: 'id, cnpj, ativo',
      pedidos: 'id, restauranteId, status, createdAt',
      mesas: 'id, restauranteId, label, ativo',
      pagamentos: 'id, pedidoId, transacaoId, status',
      transacoes: 'id, pagamentoId, providerId, status',
      configuracoes_restaurante: 'restauranteId',
      categorias: 'id, restauranteId, ativo',
      itens_cardapio: 'id, categoriaId, restauranteId, tipo, ativo',
      modificadores_grupo: 'id, restauranteId',
      modificadores_valor: 'id, modificadorGrupoId',
      combos: 'id, restauranteId, ativo',
      carrinhos: 'id, restauranteId',
    });
  }
}

export const db = new PediDatabase();
