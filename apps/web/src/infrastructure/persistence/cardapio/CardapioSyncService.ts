import { sql } from '@/infrastructure/database/pg-client';
import { db, type PediDatabase } from '../database';
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
    private db: unknown, // Not used anymore with postgres.js
    private supabaseClient?: unknown // Deprecated parameter
  ) {
    // Initialize local repositories (Dexie-based)
    // These are used for syncFromLocalCache
    this.categoriaRepo = new CategoriaRepository(db as PediDatabase);
    this.itemRepo = new ItemCardapioRepository(db as PediDatabase);
    this.grupoRepo = new ModificadorGrupoRepository(db as PediDatabase);
  }

  /**
   * Sincroniza cardápio diretamente do PostgreSQL usando postgres.js.
   */
  async syncFromPostgres(restauranteId: string): Promise<CardapioSyncResult> {
    const result: CardapioSyncResult = {
      categoriasSincronizadas: 0,
      itensSincronizados: 0,
      gruposSincronizados: 0,
      erros: [],
    };

    try {
      // Sincronizar categorias do PostgreSQL
      const categorias = await sql<{
        id: string;
        restaurant_id: string;
        name: string;
        description: string | null;
        image_url: string | null;
        sort_order: number;
        active: boolean;
      }>`
        SELECT id, restaurant_id, name, description, image_url, sort_order, active
        FROM categories
        WHERE restaurant_id = ${restauranteId} AND active = true
        ORDER BY sort_order ASC
      `;

      if (categorias.length > 0) {
        const categoriasEntities = categorias.map((cat) => {
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

      // Sincronizar produtos do PostgreSQL
      const categoryIds = categorias.map((c) => c.id);
      const produtos = categoryIds.length > 0
        ? await sql<{
            id: string;
            category_id: string;
            name: string;
            description: string | null;
            price: number;
            image_url: string | null;
            dietary_labels: string[] | null;
            available: boolean;
          }>`
            SELECT id, category_id, name, description, price, image_url, dietary_labels, available
            FROM products
            WHERE available = true AND category_id = ANY(${categoryIds})
          `
        : [];

      if (produtos.length > 0) {
        const itensEntities = produtos.map((prod) => {
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

      // Sincronizar grupos de modificadores do PostgreSQL
      const grupos = await sql<{
        id: string;
        restaurant_id: string;
        name: string;
        description: string | null;
        required: boolean;
        min_selections: number | null;
        max_selections: number | null;
      }>`
        SELECT id, restaurant_id, name, description, required, min_selections, max_selections
        FROM modifier_groups
        WHERE restaurant_id = ${restauranteId}
      `;

      if (grupos.length > 0) {
        const gruposEntities = grupos.map((grupo) => {
          return ModificadorGrupo.reconstruir({
            id: grupo.id,
            restauranteId: grupo.restaurant_id,
            nome: grupo.name,
            obrigatorio: grupo.required,
            minSelecoes: grupo.min_selections,
            maxSelecoes: grupo.max_selections,
            valores: [],
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
