/**
 * Interface para o adapter de sincronização entre Dexie (local) e API remota.
 * Deprecado - usa API routes internas ao invés de client remoto.
 */

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}

export interface RemoteTable {
  name: string;
  lastSyncAt?: Date;
}

export interface IRemoteDatabaseAdapter {
  /**
   * Sincroniza dados de uma tabela específica entre Dexie e API.
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
   * Envia dados locais para a API.
   */
  pushLocal<T>(tableName: string, data: T[]): Promise<SyncResult>;

  /**
   * Atualiza dados remotos na API.
   */
  updateRemote<T>(tableName: string, data: T[]): Promise<SyncResult>;

  /**
   * Deleta dados remotos na API.
   */
  deleteRemote(tableName: string, ids: string[]): Promise<SyncResult>;

  /**
   * Retorna a data da última sincronização para uma tabela.
   */
  getLastSyncTime(tableName: string): Date | null;

  /**
   * Verifica se há conectividade com a API.
   */
  isConnected(): Promise<boolean>;
}
