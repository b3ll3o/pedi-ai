import { PediDatabase, UsuarioRestauranteRecord } from '../database';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';
import { UsuarioRestaurante } from '@/domain/admin/entities/UsuarioRestaurante';

/**
 * Implementação do repositório de vínculo usuário-restaurante usando Dexie (IndexedDB)
 */
export class UsuarioRestauranteRepository implements IUsuarioRestauranteRepository {
  constructor(private db: PediDatabase) {}

  async findByUsuarioId(usuarioId: string): Promise<UsuarioRestaurante[]> {
    const records = await this.db.table('user_restaurants')
      .where('user_id')
      .equals(usuarioId)
      .toArray();
    return records.map((r: UsuarioRestauranteRecord) => this.recordToEntity(r));
  }

  async findByRestauranteId(restauranteId: string): Promise<UsuarioRestaurante[]> {
    const records = await this.db.table('user_restaurants')
      .where('restaurant_id')
      .equals(restauranteId)
      .toArray();
    return records.map((r: UsuarioRestauranteRecord) => this.recordToEntity(r));
  }

  async findByUsuarioIdAndRestauranteId(
    usuarioId: string,
    restauranteId: string
  ): Promise<UsuarioRestaurante | null> {
    const records = await this.db.table('user_restaurants')
      .where('user_id')
      .equals(usuarioId)
      .toArray();
    const record = records.find((r: UsuarioRestauranteRecord) => r.restaurant_id === restauranteId);
    if (!record) return null;
    return this.recordToEntity(record);
  }

  async save(usuarioRestaurante: UsuarioRestaurante): Promise<void> {
    const record = this.entityToRecord(usuarioRestaurante);
    await this.db.table('user_restaurants').put(record);
  }

  /**
   * Cria um vínculo direto entre usuário e restaurante.
   * Usado pelos testes e casos de uso.
   */
  async criarVinculo(params: {
    usuarioId: string;
    restauranteId: string;
    role: string;
    criadoEm: Date;
  }): Promise<void> {
    const { usuarioId, restauranteId, role } = params;
    const entity = UsuarioRestaurante.criar({
      usuarioId,
      restauranteId,
      papel: role as 'dono' | 'gerente' | 'atendente',
    });
    await this.save(entity);
  }

  async delete(id: string): Promise<void> {
    // Converter id string para number (id do Dexie)
    const record = await this.db.table('user_restaurants').get(Number(id));
    if (record && record.id !== undefined) {
      await this.db.table('user_restaurants').delete(record.id);
    }
  }

  private recordToEntity(record: UsuarioRestauranteRecord): UsuarioRestaurante {
    return UsuarioRestaurante.reconstruir({
      id: String(record.id),
      usuarioId: record.user_id,
      restauranteId: record.restaurant_id,
      papel: record.role,
      criadoEm: new Date(record.created_at),
      atualizadoEm: new Date(record.created_at),
      deletedAt: null,
      version: 1,
    });
  }

  private entityToRecord(entity: UsuarioRestaurante): Partial<UsuarioRestauranteRecord> {
    const record: Partial<UsuarioRestauranteRecord> = {
      user_id: entity.usuarioId,
      restaurant_id: entity.restauranteId,
      role: entity.papel,
      created_at: entity.criadoEm.toISOString(),
    };
    // Only include numeric id if entity.id is a valid number (for auto-increment)
    // For UUID-based ids, let the database auto-generate the numeric id
    if (entity.id && !isNaN(Number(entity.id))) {
      record.id = Number(entity.id);
    }
    return record;
  }
}