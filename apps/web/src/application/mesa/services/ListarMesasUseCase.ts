import { Mesa, IMesaRepository } from '@/domain/mesa';

import { UseCase } from '../../shared/types/UseCase';

export interface ListarMesasInput {
  restauranteId: string;
}

export class ListarMesasUseCase implements UseCase<ListarMesasInput, Mesa[]> {
  constructor(private mesaRepo: IMesaRepository) {}

  async execute(input: ListarMesasInput): Promise<Mesa[]> {
    return this.mesaRepo.findByRestauranteId(input.restauranteId);
  }
}
