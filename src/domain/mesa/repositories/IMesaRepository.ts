import { Mesa } from '../entities/Mesa';

export interface IMesaRepository {
  create(mesa: Mesa): Promise<Mesa>;
  findById(id: string): Promise<Mesa | null>;
  findByRestauranteId(restauranteId: string): Promise<Mesa[]>;
  findByLabel(restauranteId: string, label: string): Promise<Mesa | null>;
  findByQrCode(qrCode: string, restauranteId?: string): Promise<Mesa | null>;
  update(mesa: Mesa): Promise<Mesa>;
  delete(id: string): Promise<void>;
}
