/**
 * useMesa Hook
 * Hook para operações de mesa usando use cases do application layer.
 *
 * NOTA: Validação de QR code foi movida para a Route Handler
 * `/api/tables/validate` (server-only) por motivo de segurança — o
 * segredo HMAC não pode vazar no bundle do cliente. Consumidores
 * devem chamar `fetch('/api/tables/validate', { qrCode })` diretamente.
 */

import { useQuery } from '@tanstack/react-query';

import type { TableDTO } from '@pedi-ai/shared/types';

import {
  ListarMesasUseCase,
  type ListarMesasInput,
} from '@/application/mesa/services/ListarMesasUseCase';
import { db } from '@/infrastructure/persistence/database';
import { MesaRepository } from '@/infrastructure/persistence/mesa/MesaRepository';

/**
 * Transformação de domain Mesa para TableDTO (formato de transporte).
 */
function transformarMesa(mesa: {
  id: string;
  restauranteId: string;
  label: string;
  ativo: boolean;
}): TableDTO {
  return {
    id: mesa.id,
    restaurant_id: mesa.restauranteId,
    name: mesa.label,
    number: parseInt(mesa.label, 10) || 0,
    qr_code: null,
    capacity: null,
    active: mesa.ativo,
    created_at: '',
  };
}

/**
 * Hook para listar mesas de um restaurante.
 * Usa ListarMesasUseCase do application layer.
 *
 * @param restauranteId - ID do restaurante
 * @returns UseQueryResult com mesas transformadas para TableDTO
 */
export function useListarMesas(restauranteId: string) {
  return useQuery<TableDTO[]>({
    queryKey: ['mesas', restauranteId],
    queryFn: async () => {
      const mesaRepo = new MesaRepository(db);
      const listarMesasUseCase = new ListarMesasUseCase(mesaRepo);
      const input: ListarMesasInput = { restauranteId };
      const mesas = await listarMesasUseCase.execute(input);
      return mesas.map(transformarMesa);
    },
    enabled: !!restauranteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para buscar uma mesa por ID.
 */
export function useMesa(mesaId: string | null) {
  return useQuery<TableDTO | null>({
    queryKey: ['mesa', mesaId],
    queryFn: async () => {
      if (!mesaId) return null;
      const mesaRepo = new MesaRepository(db);
      const mesa = await mesaRepo.findById(mesaId);
      if (!mesa) return null;
      return transformarMesa({
        id: mesa.id,
        restauranteId: mesa.restauranteId,
        label: mesa.label,
        ativo: mesa.ativo,
      });
    },
    enabled: !!mesaId,
    staleTime: 1000,
  });
}
