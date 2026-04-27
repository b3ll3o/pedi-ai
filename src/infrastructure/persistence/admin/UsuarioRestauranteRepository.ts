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
    });
  }

  private entityToRecord(entity: UsuarioRestaurante): Partial<UsuarioRestauranteRecord> {
    return {
      user_id: entity.usuarioId,
      restaurant_id: entity.restauranteId,
      role: entity.papel,
      created_at: entity.criadoEm.toISOString(),
    };
  }
}