/**
 * useMesa Hook
 * Hook para operações de mesa usando use cases do application layer.
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ListarMesasUseCase,
  type ListarMesasInput,
} from '@/application/mesa/services/ListarMesasUseCase';
import {
  ValidarQRCodeUseCase,
  type ValidarQRCodeInput,
  type MesaValidada,
} from '@/application/mesa/services/ValidarQRCodeUseCase';
import { MesaRepository } from '@/infrastructure/persistence/mesa';
import { QRCodeCryptoService } from '@/infrastructure/services/QRCodeCryptoService';
import { db } from '@/infrastructure/persistence/database';
import type { tables } from '@/lib/supabase/types';

// Transformação de domain Mesa para formato Supabase (compatibilidade com a interface existente)
function _transformarMesa(mesa: {
  id: string;
  restauranteId: string;
  label: string;
  ativo: boolean;
}): tables {
  return {
    id: mesa.id,
    restaurant_id: mesa.restauranteId,
    number: parseInt(mesa.label, 10) || 0,
    qr_code: null,
    name: mesa.label,
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
 * @returns UseQueryResult com mesas transformadas para formato compatível
 */
export function useListarMesas(restauranteId: string) {
  return useQuery<tables[]>({
    queryKey: ['mesas', restauranteId],
    queryFn: async () => {
      // Instanciar repository com o banco de dados
      const mesaRepo = new MesaRepository(db);

      // Instanciar e executar use case
      const listarMesasUseCase = new ListarMesasUseCase(mesaRepo);
      const input: ListarMesasInput = { restauranteId };
      const mesas = await listarMesasUseCase.execute(input);

      // Transformar para formato compatível com a interface existente
      return mesas.map((m) => ({
        id: m.id,
        restaurant_id: m.restauranteId,
        number: parseInt(m.label, 10) || 0,
        qr_code: null,
        name: m.label,
        capacity: null,
        active: m.ativo,
        created_at: '',
      }));
    },
    enabled: !!restauranteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para validar QR code de mesa.
 * Usa ValidarQRCodeUseCase do application layer.
 */
export function useValidarQRCode() {
  return useMutation<MesaValidada, Error, ValidarQRCodeInput>({
    mutationFn: async (input) => {
      // Instanciar repository e serviço de validação QR code (infraestrutura)
      const mesaRepo = new MesaRepository(db);
      const qrCodeCryptoService = new QRCodeCryptoService();
      // Instanciar e executar use case com dependências
      const validarQRCodeUseCase = new ValidarQRCodeUseCase(qrCodeCryptoService, mesaRepo);
      return validarQRCodeUseCase.execute(input);
    },
  });
}

/**
 * Hook para buscar uma mesa por ID.
 */
export function useMesa(mesaId: string | null) {
  return useQuery<tables | null>({
    queryKey: ['mesa', mesaId],
    queryFn: async () => {
      if (!mesaId) return null;
      const mesaRepo = new MesaRepository(db);
      const mesa = await mesaRepo.findById(mesaId);
      if (!mesa) return null;
      return {
        id: mesa.id,
        restaurant_id: mesa.restauranteId,
        number: parseInt(mesa.label, 10) || 0,
        qr_code: null,
        name: mesa.label,
        capacity: null,
        active: mesa.ativo,
        created_at: '',
      };
    },
    enabled: !!mesaId,
    staleTime: 1000,
  });
}
