import { PediDatabase } from '../database';
import { CategoriaRepository } from './CategoriaRepository';
import { ItemCardapioRepository } from './ItemCardapioRepository';
import { ModificadorGrupoRepository } from './ModificadorGrupoRepository';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Categoria } from '@/domain/cardapio/entities/Categoria';
import { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio';
import { ModificadorGrupo } from '@/domain/cardapio/entities/ModificadorGrupo';
import { Dinheiro } from '@/domain/pedido/value-objects/Dinheiro';
import { TipoItemCardapio } from '@/domain/cardapio/value-objects/TipoItemCardapio';
import { LabelDietetico } from '@/domain/cardapio/value-objects/LabelDietetico';

export interface CardapioSyncResult {
  categoriasSincronizadas: number;
  itensSincronizados: number;
  gruposSincronizados: number;
  erros: string[];
}

// Supabase table names (English)
const SUPABASE_TABLES = {
  CATEGORIAS: 'categories',
  PRODUTOS: 'products',
  MODIFICADORES_GRUPO: 'modifier_groups',
  MODIFICADORES_VALOR: 'modifier_values',
} as const;

export class CardapioSyncService {
  private categoriaRepo: CategoriaRepository;
  private itemRepo: ItemCardapioRepository;
  private grupoRepo: ModificadorGrupoRepository;

  constructor(
    private db: PediDatabase,
    private supabaseClient?: SupabaseClient
  ) {
    this.categoriaRepo = new CategoriaRepository(db);
    this.itemRepo = new ItemCardapioRepository(db);
    this.grupoRepo = new ModificadorGrupoRepository(db);
  }

  /**
   * Sincroniza cardápio diretamente do Supabase (bypass RLS com service role).
   */
  async syncFromSupabase(restauranteId: string): Promise<CardapioSyncResult> {
    const result: CardapioSyncResult = {
      categoriasSincronizadas: 0,
      itensSincronizados: 0,
      gruposSincronizados: 0,
      erros: [],
    };

    if (!this.supabaseClient) {
      result.erros.push('Cliente Supabase não configurado');
      return result;
    }

    try {
      // Sincronizar categorias do Supabase (tabela: categories)
      const { data: categorias, error: catError } = await this.supabaseClient
        .from(SUPABASE_TABLES.CATEGORIAS)
        .select('*')
        .eq('restaurant_id', restauranteId)
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (catError) {
        result.erros.push(`Erro ao buscar categorias: ${catError.message}`);
      } else if (categorias) {
        const categoriasEntities = categorias.map(cat => {
          return Categoria.reconstruir({
            id: cat.id,
            restauranteId: cat.restaurant_id,
            nome: cat.name,
            descricao: cat.description,
            imagemUrl: cat.image_url,
            ordemExibicao: cat.sort_order,
            ativo: cat.active,
          });
        });
        await this.categoriaRepo.salvarMany(categoriasEntities);
        result.categoriasSincronizadas = categoriasEntities.length;
      }

      // Sincronizar itens do cardápio do Supabase (tabela: products)
      const { data: produtos, error: prodError } = await this.supabaseClient
        .from(SUPABASE_TABLES.PRODUTOS)
        .select('*')
        .eq('available', true);

      if (prodError) {
        result.erros.push(`Erro ao buscar produtos: ${prodError.message}`);
      } else if (produtos) {
        // Filter by restaurant_id via category join
        const categoryIds = categorias?.map(c => c.id) || [];
        const produtosFiltrados = produtos.filter(p => categoryIds.includes(p.category_id));

        const itensEntities = produtosFiltrados.map(prod => {
          return ItemCardapio.reconstruir({
            id: prod.id,
            categoriaId: prod.category_id,
            nome: prod.name,
            descricao: prod.description,
            preco: Dinheiro.criar(prod.price, 'BRL'),
            imagemUrl: prod.image_url,
            tipo: TipoItemCardapio.fromValue('item'), // products table doesn't have tipo
            labelsDieteticos: prod.dietary_labels
              ? LabelDietetico.fromArray(prod.dietary_labels)
              : [],
            ativo: prod.available,
          });
        });
        await this.itemRepo.salvarMany(itensEntities);
        result.itensSincronizados = itensEntities.length;
      }

      // Sincronizar grupos de modificadores do Supabase (tabela: modifier_groups)
      const { data: grupos, error: grupoError } = await this.supabaseClient
        .from(SUPABASE_TABLES.MODIFICADORES_GRUPO)
        .select('*')
        .eq('restaurant_id', restauranteId);

      if (grupoError) {
        result.erros.push(`Erro ao buscar grupos: ${grupoError.message}`);
      } else if (grupos) {
        const gruposEntities = grupos.map(grupo => {
          return ModificadorGrupo.reconstruir({
            id: grupo.id,
            restauranteId: grupo.restaurant_id,
            nome: grupo.name,
            obrigatorio: grupo.required,
            minSelecoes: grupo.min_selections,
            maxSelecoes: grupo.max_selections,
            valores: [], // Valores são carregados separadamente
            ativo: true,
          });
        });
        await this.grupoRepo.salvarMany(gruposEntities);
        result.gruposSincronizados = gruposEntities.length;
      }
    } catch (error) {
      result.erros.push(`Erro durante sincronização: ${error}`);
    }

    return result;
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
        const categoriasEntities = data.categories.map((cat) => {
          return Categoria.reconstruir({
            id: cat.id,
            restauranteId: cat.restaurant_id,
            nome: cat.name,
            descricao: cat.description,
            imagemUrl: cat.image_url,
            ordemExibicao: cat.sort_order,
            ativo: cat.active,
          });
        });
        await this.categoriaRepo.salvarMany(categoriasEntities);
        result.categoriasSincronizadas = categoriasEntities.length;
      }

      // Sincronizar produtos
      if (data.products && Array.isArray(data.products)) {
        const itensEntities = data.products.map((prod) => {
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
          });
        });
        await this.itemRepo.salvarMany(itensEntities);
        result.itensSincronizados = itensEntities.length;
      }

      // Sincronizar grupos de modificadores
      if (data.modifier_groups && Array.isArray(data.modifier_groups)) {
        const gruposEntities = data.modifier_groups.map((grupo) => {
          return ModificadorGrupo.reconstruir({
            id: grupo.id,
            restauranteId: grupo.restaurant_id,
            nome: grupo.name,
            obrigatorio: grupo.required,
            minSelecoes: grupo.min_selections,
            maxSelecoes: grupo.max_selections,
            valores: [], // Valores são carregados separadamente
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
