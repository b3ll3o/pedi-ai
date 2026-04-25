import { Usuario } from '../entities/Usuario';

export interface IUsuarioRepository {
  create(usuario: Usuario): Promise<Usuario>;
  findById(id: string): Promise<Usuario | null>;
  findByEmail(email: string): Promise<Usuario | null>;
  findByRestauranteId(restauranteId: string): Promise<Usuario[]>;
  update(usuario: Usuario): Promise<Usuario>;
  delete(id: string): Promise<void>;
}
