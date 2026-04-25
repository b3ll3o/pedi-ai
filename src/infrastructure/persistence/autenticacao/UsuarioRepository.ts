import { PediDatabase } from '../database';
import { IUsuarioRepository } from '@/domain/autenticacao/repositories/IUsuarioRepository';
import { Usuario } from '@/domain/autenticacao/entities/Usuario';
import { Papel } from '@/domain/autenticacao/value-objects/Papel';

/**
 * Registro de usuário para persistência (papel armazenado como string)
 */
interface UsuarioRecord {
  id: string;
  email: string;
  papel: string;
  restauranteId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Implementação do repositório de usuários usando Dexie (IndexedDB)
 */
export class UsuarioRepository implements IUsuarioRepository {
  constructor(private db: PediDatabase) {}

  async create(usuario: Usuario): Promise<Usuario> {
    const record: UsuarioRecord = {
      id: usuario.id,
      email: usuario.email,
      papel: usuario.papel.toString(),
      restauranteId: usuario.restauranteId,
      createdAt: usuario.createdAt,
      updatedAt: usuario.updatedAt,
    };

    await this.db.usuarios.add(record);
    return usuario;
  }

  async findById(id: string): Promise<Usuario | null> {
    const record = await this.db.usuarios.get(id);
    if (!record) return null;
    return this.recordToUsuario(record);
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    const record = await this.db.usuarios.where('email').equals(email).first();
    if (!record) return null;
    return this.recordToUsuario(record);
  }

  async findByRestauranteId(restauranteId: string): Promise<Usuario[]> {
    const records = await this.db.usuarios.where('restauranteId').equals(restauranteId).toArray();
    return records.map(r => this.recordToUsuario(r));
  }

  async update(usuario: Usuario): Promise<Usuario> {
    const record: UsuarioRecord = {
      id: usuario.id,
      email: usuario.email,
      papel: usuario.papel.toString(),
      restauranteId: usuario.restauranteId,
      createdAt: usuario.createdAt,
      updatedAt: usuario.updatedAt,
    };

    await this.db.usuarios.put(record);
    return usuario;
  }

  async delete(id: string): Promise<void> {
    await this.db.usuarios.delete(id);
  }

  private recordToUsuario(record: UsuarioRecord): Usuario {
    return Usuario.reconstruir({
      id: record.id,
      email: record.email,
      papel: Papel.fromValue(record.papel as 'owner' | 'manager' | 'staff' | 'cliente'),
      restauranteId: record.restauranteId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
