import { createClient } from '@/lib/supabase/client';
import type { ISupabaseDatabaseAdapter, SyncResult } from '@/application/shared/services/adapters/ISupabaseDatabaseAdapter';
import { db, type PediDatabase } from '@/infrastructure/persistence/database';

/**
 * Adapter de sincronização entre Dexie (IndexedDB local) e Supabase (PostgreSQL remoto).
 * Implementa a interface ISupabaseDatabaseAdapter.
 *
 * Variáveis de ambiente necessárias:
 * - NEXT_PUBLIC_SUPABASE_URL: URL do projeto Supabase
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: Chave anônima do Supabase
 */
export class SupabaseDatabaseAdapter implements ISupabaseDatabaseAdapter {
  private supabase = createClient();
  private lastSyncTimes: Map<string, Date> = new Map();

  /**
   * Mapeamento entre tabelas Dexie e tabelas Supabase.
   */
  private readonly tableMapping: Record<string, string> = {
    usuarios: 'usuarios',
    sessoes: 'sessoes',
    restaurantes: 'restaurantes',
    pedidos: 'pedidos',
    mesas: 'mesas',
    pagamentos: 'pagamentos',
    transacoes: 'transacoes',
    categorias: 'categorias',
    itens_cardapio: 'itens_cardapio',
    modificadores_grupo: 'modificadores_grupo',
    modificadores_valor: 'modificadores_valor',
    combos: 'combos',
    carrinhos: 'carrinhos',
    user_restaurants: 'user_restaurants',
    configuracoes_restaurante: 'configuracoes_restaurante',
  };

  async syncTable(tableName: string, direction: 'push' | 'pull' | 'both'): Promise<SyncResult> {
    const errors: string[] = [];
    let syncedCount = 0;
    let failedCount = 0;

    try {
      if (direction === 'pull' || direction === 'both') {
        const pullResult = await this.pullTable(tableName);
        syncedCount += pullResult.syncedCount;
        failedCount += pullResult.failedCount;
        errors.push(...pullResult.errors);
      }

      if (direction === 'push' || direction === 'both') {
        const pushResult = await this.pushTable(tableName);
        syncedCount += pushResult.syncedCount;
        failedCount += pushResult.failedCount;
        errors.push(...pushResult.errors);
      }

      this.lastSyncTimes.set(tableName, new Date());

      return {
        success: failedCount === 0,
        syncedCount,
        failedCount,
        errors,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return {
        success: false,
        syncedCount,
        failedCount: failedCount + 1,
        errors: [...errors, message],
      };
    }
  }

  async syncAll(): Promise<SyncResult> {
    const tableNames = Object.keys(this.tableMapping);
    const results: SyncResult[] = [];

    for (const tableName of tableNames) {
      const result = await this.syncTable(tableName, 'both');
      results.push(result);
    }

    const totalSynced = results.reduce((acc, r) => acc + r.syncedCount, 0);
    const totalFailed = results.reduce((acc, r) => acc + r.failedCount, 0);
    const allErrors = results.flatMap(r => r.errors);

    return {
      success: totalFailed === 0,
      syncedCount: totalSynced,
      failedCount: totalFailed,
      errors: allErrors,
    };
  }

  async fetchRemote<T>(tableName: string, filters?: Record<string, unknown>): Promise<T[]> {
    const supabaseTable = this.tableMapping[tableName];
    if (!supabaseTable) {
      throw new Error(`Tabela '${tableName}' não encontrada no mapeamento`);
    }

    let query = this.supabase.from(supabaseTable).select('*');

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value as string | number | boolean);
      });
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar dados remotos: ${error.message}`);
    }

    return (data ?? []) as T[];
  }

  async pushLocal<T>(tableName: string, data: T[]): Promise<SyncResult> {
    const supabaseTable = this.tableMapping[tableName];
    if (!supabaseTable) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: data.length,
        errors: [`Tabela '${tableName}' não encontrada no mapeamento`],
      };
    }

    if (data.length === 0) {
      return { success: true, syncedCount: 0, failedCount: 0, errors: [] };
    }

    const { data: result, error } = await this.supabase
      .from(supabaseTable)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(data as unknown as any)
      .select() as { data: unknown[] | null; error: unknown };

    if (error) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: data.length,
        errors: [`Erro ao enviar dados: ${(error as Error).message}`],
      };
    }

    return {
      success: true,
      syncedCount: result?.length ?? data.length,
      failedCount: 0,
      errors: [],
    };
  }

  async updateRemote<T>(tableName: string, data: T[]): Promise<SyncResult> {
    const supabaseTable = this.tableMapping[tableName];
    if (!supabaseTable) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: data.length,
        errors: [`Tabela '${tableName}' não encontrada no mapeamento`],
      };
    }

    if (data.length === 0) {
      return { success: true, syncedCount: 0, failedCount: 0, errors: [] };
    }

    const { data: result, error } = await this.supabase
      .from(supabaseTable)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(data as unknown as any)
      .match({ id: (data as { id: string }[]).map(d => d.id) }) as { data: unknown[] | null; error: unknown };

    if (error) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: data.length,
        errors: [`Erro ao atualizar dados: ${(error as Error).message}`],
      };
    }

    return {
      success: true,
      syncedCount: result?.length ?? data.length,
      failedCount: 0,
      errors: [],
    };
  }

  async deleteRemote(tableName: string, ids: string[]): Promise<SyncResult> {
    const supabaseTable = this.tableMapping[tableName];
    if (!supabaseTable) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: ids.length,
        errors: [`Tabela '${tableName}' não encontrada no mapeamento`],
      };
    }

    if (ids.length === 0) {
      return { success: true, syncedCount: 0, failedCount: 0, errors: [] };
    }

    const { error } = await this.supabase
      .from(supabaseTable)
      .delete()
      .in('id', ids);

    if (error) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: ids.length,
        errors: [`Erro ao deletar dados: ${error.message}`],
      };
    }

    return {
      success: true,
      syncedCount: ids.length,
      failedCount: 0,
      errors: [],
    };
  }

  getLastSyncTime(tableName: string): Date | null {
    return this.lastSyncTimes.get(tableName) ?? null;
  }

  async isConnected(): Promise<boolean> {
    try {
      const { error } = await this.supabase.from('restaurantes').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Obtém uma tabela Dexie dinamicamente pelo nome.
   * Usamos type assertion pois Dexie não suporta acesso por string index.
   * Esta é a única forma de fazer acesso dinámico a tabelas com a API do Dexie.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getDexieTable(tableName: string): any {
    return (db as PediDatabase)[tableName as keyof PediDatabase];
  }

  /**
   * Realiza pull de dados de uma tabela específica do Supabase para Dexie.
   */
  private async pullTable(tableName: string): Promise<SyncResult> {
    const supabaseTable = this.tableMapping[tableName];
    if (!supabaseTable) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [`Tabela '${tableName}' não encontrada no mapeamento`],
      };
    }

    try {
      const lastSync = this.getLastSyncTime(tableName);
      let query = this.supabase.from(supabaseTable).select('*');

      if (lastSync) {
        query = query.gt('updated_at', lastSync.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          syncedCount: 0,
          failedCount: 0,
          errors: [`Erro ao fazer pull: ${error.message}`],
        };
      }

      if (!data || data.length === 0) {
        return { success: true, syncedCount: 0, failedCount: 0, errors: [] };
      }

      // Inserir dados no Dexie (ignorando erros de duplicação)
      const dexieTable = this.getDexieTable(tableName);
      if (dexieTable?.bulkPut) {
        await dexieTable.bulkPut(data);
      }

      return {
        success: true,
        syncedCount: data.length,
        failedCount: 0,
        errors: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [message],
      };
    }
  }

  /**
   * Realiza push de dados de uma tabela específica do Dexie para Supabase.
   */
  private async pushTable(tableName: string): Promise<SyncResult> {
    try {
      const dexieTable = this.getDexieTable(tableName);
      if (!dexieTable?.toArray) {
        return {
          success: false,
          syncedCount: 0,
          failedCount: 0,
          errors: [`Tabela Dexie '${tableName}' não encontrada`],
        };
      }

      const localData = await dexieTable.toArray();
      if (localData.length === 0) {
        return { success: true, syncedCount: 0, failedCount: 0, errors: [] };
      }

      const supabaseTable = this.tableMapping[tableName];
      const { error } = await this.supabase
        .from(supabaseTable)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(localData as unknown as any);

      if (error) {
        return {
          success: false,
          syncedCount: 0,
          failedCount: localData.length,
          errors: [`Erro ao fazer push: ${(error as Error).message}`],
        };
      }

      return {
        success: true,
        syncedCount: localData.length,
        failedCount: 0,
        errors: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [message],
      };
    }
  }
}
