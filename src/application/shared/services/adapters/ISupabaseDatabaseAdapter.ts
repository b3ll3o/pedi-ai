/**
 * Interface para o adapter de sincronização entre Dexie (local) e Supabase (remote).
 * Implementada por infrastructure/external/SupabaseDatabaseAdapter.
 */

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}

export interface SupabaseTable {
  name: string;
  lastSyncAt?: Date;
}

export interface ISupabaseDatabaseAdapter {
  /**
   * Sincroniza dados de uma tabela específica entre Dexie e Supabase.
   * @param tableName Nome da tabela (ex: 'pedidos', 'categorias')
   * @param direction Direção da sincronização: 'push' (local→remote), 'pull' (remote→local), 'both'
   */
  syncTable(tableName: string, direction: 'push' | 'pull' | 'both'): Promise<SyncResult>;

  /**
   * Sincroniza todas as tabelas configuradas.
   */
  syncAll(): Promise<SyncResult>;

  /**
   * Busca dados remotos de uma tabela.
   */
  fetchRemote<T>(tableName: string, filters?: Record<string, unknown>): Promise<T[]>;

  /**
   * Envia dados locais para o Supabase.
   */
  pushLocal<T>(tableName: string, data: T[]): Promise<SyncResult>;

  /**
   * Atualiza dados remotos no Supabase.
   */
  updateRemote<T>(tableName: string, data: T[]): Promise<SyncResult>;

  /**
   * Deleta dados remotos no Supabase.
   */
  deleteRemote(tableName: string, ids: string[]): Promise<SyncResult>;

  /**
   * Retorna a data da última sincronização para uma tabela.
   */
  getLastSyncTime(tableName: string): Date | null;

  /**
   * Verifica se há conectividade com o Supabase.
   */
  isConnected(): Promise<boolean>;
}
