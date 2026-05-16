import { ItemCardapio } from '../entities/ItemCardapio';

export interface IItemCardapioRepository {
  buscarPorId(id: string): Promise<ItemCardapio | null>;
  buscarPorCategoria(categoriaId: string): Promise<ItemCardapio[]>;
  buscarPorRestaurante(restauranteId: string): Promise<ItemCardapio[]>;
  buscarAtivos(categoriaId: string): Promise<ItemCardapio[]>;
  buscarPorIds(ids: string[]): Promise<ItemCardapio[]>;
  salvar(item: ItemCardapio): Promise<ItemCardapio>;
  salvarMany(itens: ItemCardapio[]): Promise<ItemCardapio[]>;
  excluir(id: string): Promise<void>;
}
