import { type PediDatabase } from '../database';
import { CategoriaRepository } from './CategoriaRepository';
import { ItemCardapioRepository } from './ItemCardapioRepository';
import { ModificadorGrupoRepository } from './ModificadorGrupoRepository';
import { Categoria } from '@/domain/cardapio/entities/Categoria';
import { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio';
import { ModificadorGrupo } from '@/domain/cardapio/entities/ModificadorGrupo';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { TipoItemCardapio } from '@/domain/cardapio/value-objects/TipoItemCardapio';
import { LabelDietetico } from '@/domain/cardapio/value-objects/LabelDietetico';

export interface CardapioSyncResult {
  categoriasSincronizadas: number;
  itensSincronizados: number;
  gruposSincronizados: number;
  erros: string[];
}

interface CategoriaApiResponse {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  active: boolean;
}

interface ProdutoApiResponse {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  dietary_labels: string[] | null;
  available: boolean;
}

interface GrupoModificadorApiResponse {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  required: boolean;
  min_selections: number | null;
  max_selections: number | null;
}

export class CardapioSyncService {
  private categoriaRepo: CategoriaRepository;
  private itemRepo: ItemCardapioRepository;
  private grupoRepo: ModificadorGrupoRepository;

  constructor(
    _db: unknown, // Kept for Dexie repositories (syncFromLocalCache)
    _supabaseClient?: unknown // Deprecated - no longer used
  ) {
    // Initialize local repositories (Dexie-based)
    // These are used for syncFromLocalCache
    this.categoriaRepo = new CategoriaRepository(_db as PediDatabase);
    this.itemRepo = new ItemCardapioRepository(_db as PediDatabase);
    this.grupoRepo = new ModificadorGrupoRepository(_db as PediDatabase);
  }

  /**
   * Sincroniza cardápio via API /api/menu (útil para browser/client-side).
   */
  async syncFromApiMenu(restauranteId: string): Promise<CardapioSyncResult> {
    const result: CardapioSyncResult = {
      categoriasSincronizadas: 0,
      itensSincronizados: 0,
      gruposSincronizados: 0,
      erros: [],
    };

    try {
      const response = await fetch(`/api/menu?restaurant_id=${restauranteId}`);

      if (!response.ok) {
        const errorText = await response.text();
        result.erros.push(`Erro ao buscar cardápio: ${response.status} - ${errorText}`);
        return result;
      }

      const data = await response.json();

      if (data.error) {
        result.erros.push(`Erro da API: ${data.error}`);
        return result;
      }

      // Sincronizar categorias
      if (data.categories && Array.isArray(data.categories)) {
        const categoriasEntities = data.categories.map((cat: CategoriaApiResponse) => {
          const now = new Date();
          return Categoria.reconstruir({
            id: cat.id,
            restauranteId: cat.restaurant_id,
            nome: cat.name,
            descricao: cat.description,
            imagemUrl: cat.image_url,
            ordemExibicao: cat.sort_order,
            ativo: cat.active,
            criadoEm: now,
            atualizadoEm: now,
            deletedAt: null,
            version: 1,
          });
        });
        await this.categoriaRepo.salvarMany(categoriasEntities);
        result.categoriasSincronizadas = categoriasEntities.length;
      }

      // Sincronizar produtos
      if (data.products && Array.isArray(data.products)) {
        const itensEntities = data.products.map((prod: ProdutoApiResponse) => {
          const now = new Date();
          return ItemCardapio.reconstruir({
            id: prod.id,
            categoriaId: prod.category_id,
            nome: prod.name,
            descricao: prod.description,
            preco: Dinheiro.criar(prod.price, 'BRL'),
            imagemUrl: prod.image_url,
            tipo: TipoItemCardapio.fromValue('item'),
            labelsDieteticos: prod.dietary_labels
              ? LabelDietetico.fromArray(prod.dietary_labels)
              : [],
            ativo: prod.available,
            criadoEm: now,
            atualizadoEm: now,
            deletedAt: null,
            version: 1,
          });
        });
        await this.itemRepo.salvarMany(itensEntities);
        result.itensSincronizados = itensEntities.length;
      }

      // Sincronizar grupos de modificadores
      if (data.modifier_groups && Array.isArray(data.modifier_groups)) {
        const gruposEntities = data.modifier_groups.map((grupo: GrupoModificadorApiResponse) => {
          return ModificadorGrupo.reconstruir({
            id: grupo.id,
            restauranteId: grupo.restaurant_id,
            nome: grupo.name,
            obrigatorio: grupo.required,
            minSelecoes: grupo.min_selections ?? 0,
            maxSelecoes: grupo.max_selections ?? 0,
            valores: [],
            ativo: true,
          });
        });
        await this.grupoRepo.salvarMany(gruposEntities);
        result.gruposSincronizados = gruposEntities.length;
      }
    } catch (error) {
      result.erros.push(`Erro durante sincronização via API: ${error}`);
    }

    return result;
  }

  async syncFromLocalCache(): Promise<CardapioSyncResult> {
    const result: CardapioSyncResult = {
      categoriasSincronizadas: 0,
      itensSincronizados: 0,
      gruposSincronizados: 0,
      erros: [],
    };

    try {
      // Carregar do cache local
      const categorias = await this.categoriaRepo.buscarPorRestaurante('local');
      const itens = await this.itemRepo.buscarPorRestaurante('local');
      const grupos = await this.grupoRepo.buscarPorRestaurante('local');

      result.categoriasSincronizadas = categorias.length;
      result.itensSincronizados = itens.length;
      result.gruposSincronizados = grupos.length;
    } catch (error) {
      result.erros.push(`Erro ao carregar do cache local: ${error}`);
    }

    return result;
  }
}
