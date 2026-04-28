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

interface SupabaseCategoria {
  id: string;
  restaurante_id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  ordem_exibicao: number;
  ativo: boolean;
}

interface SupabaseItemCardapio {
  id: string;
  categoria_id: string;
  restaurante_id: string;
  nome: string;
  descricao: string | null;
  preco_valor: number;
  preco_moeda: string;
  imagem_url: string | null;
  tipo: string;
  labels_dieteticos: string[];
  ativo: boolean;
}

interface SupabaseModificadorGrupo {
  id: string;
  restaurante_id: string;
  nome: string;
  obrigatorio: boolean;
  min_selecoes: number;
  max_selecoes: number;
  ativo: boolean;
}

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
      // Sincronizar categorias
      const { data: categorias, error: catError } = await this.supabaseClient
        .from('categorias')
        .select('*')
        .eq('restaurante_id', restauranteId);

      if (catError) {
        result.erros.push(`Erro ao buscar categorias: ${catError.message}`);
      } else if (categorias) {
        const categoriasEntities = (categorias as SupabaseCategoria[]).map(cat => {
          return Categoria.reconstruir({
            id: cat.id,
            restauranteId: cat.restaurante_id,
            nome: cat.nome,
            descricao: cat.descricao,
            imagemUrl: cat.imagem_url,
            ordemExibicao: cat.ordem_exibicao,
            ativo: cat.ativo,
          });
        });
        await this.categoriaRepo.salvarMany(categoriasEntities);
        result.categoriasSincronizadas = categoriasEntities.length;
      }

      // Sincronizar itens do cardápio
      const { data: itens, error: itemError } = await this.supabaseClient
        .from('itens_cardapio')
        .select('*')
        .eq('restaurante_id', restauranteId);

      if (itemError) {
        result.erros.push(`Erro ao buscar itens: ${itemError.message}`);
      } else if (itens) {
        const itensEntities = (itens as SupabaseItemCardapio[]).map(item => {
          return ItemCardapio.reconstruir({
            id: item.id,
            categoriaId: item.categoria_id,
            nome: item.nome,
            descricao: item.descricao,
            preco: Dinheiro.criar(item.preco_valor, item.preco_moeda || 'BRL'),
            imagemUrl: item.imagem_url,
            tipo: TipoItemCardapio.fromValue(item.tipo),
            labelsDieteticos: item.labels_dieteticos
              ? LabelDietetico.fromArray(item.labels_dieteticos)
              : [],
            ativo: item.ativo,
          });
        });
        await this.itemRepo.salvarMany(itensEntities);
        result.itensSincronizados = itensEntities.length;
      }

      // Sincronizar grupos de modificadores
      const { data: grupos, error: grupoError } = await this.supabaseClient
        .from('modificadores_grupo')
        .select('*')
        .eq('restaurante_id', restauranteId);

      if (grupoError) {
        result.erros.push(`Erro ao buscar grupos: ${grupoError.message}`);
      } else if (grupos) {
        const gruposEntities = (grupos as SupabaseModificadorGrupo[]).map(grupo => {
          return ModificadorGrupo.reconstruir({
            id: grupo.id,
            restauranteId: grupo.restaurante_id,
            nome: grupo.nome,
            obrigatorio: grupo.obrigatorio,
            minSelecoes: grupo.min_selecoes,
            maxSelecoes: grupo.max_selecoes,
            valores: [], // Valores são carregados separadamente
            ativo: grupo.ativo,
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
