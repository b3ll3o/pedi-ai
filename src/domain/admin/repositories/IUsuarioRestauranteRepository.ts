import { UsuarioRestaurante } from '../entities/UsuarioRestaurante';

export interface IUsuarioRestauranteRepository {
  findByUsuarioId(usuarioId: string): Promise<UsuarioRestaurante[]>;
  findByRestauranteId(restauranteId: string): Promise<UsuarioRestaurante[]>;
  findByUsuarioIdAndRestauranteId(
    usuarioId: string,
    restauranteId: string
  ): Promise<UsuarioRestaurante | null>;
  save(usuarioRestaurante: UsuarioRestaurante): Promise<void>;
  delete(id: string): Promise<void>;
}
