// Re-exportar tipos do database principal
export type { PedidoRecord as PedidoDbModel } from '../database';
export type { CarrinhoRecord as CarrinhoDbModel } from '../database';

// Tipos serializáveis para ItemPedido
export interface StoredItemPedido {
  id: string;
  pedidoId?: string;
  produtoId: string;
  nome: string;
  precoUnitarioValor: number;
  precoUnitarioMoeda: string;
  quantidade: number;
  modificadoresSelecionados: StoredModificadorSelecionado[];
  subtotalValor: number;
  subtotalMoeda: string;
  observacao?: string;
}

export interface StoredModificadorSelecionado {
  grupoId: string;
  grupoNome: string;
  modificadorId: string;
  modificadorNome: string;
  precoAdicional: number;
}
