/**
 * usePagamento Hook
 * Hook para operações de pagamento usando use cases do application layer.
 */

import { useMutation } from '@tanstack/react-query';

import type { PixCharge } from '@/application/pagamento/services/adapters/IPixAdapter';
import {
  CriarPixChargeUseCase,
  type CriarPixChargeInput,
} from '@/application/pagamento/services/CriarPixChargeUseCase';
import { EventDispatcher } from '@/domain/shared';
import { PixAdapter } from '@/infrastructure/external/PixAdapter';
import { db } from '@/infrastructure/persistence/database';
import { PagamentoRepository } from '@/infrastructure/persistence/pagamento/PagamentoRepository';
import { PedidoRepository } from '@/infrastructure/persistence/pedido/PedidoRepository';

export type { PixCharge };

/**
 * Hook para criar uma cobrança Pix.
 * Usa CriarPixChargeUseCase do application layer.
 */
export function useCriarPixCharge() {
  return useMutation<PixCharge, Error, CriarPixChargeInput>({
    mutationFn: async (input) => {
      const pixAdapter = new PixAdapter();
      const pagamentoRepo = new PagamentoRepository(db);
      const pedidoRepo = new PedidoRepository(db);
      const eventDispatcher = EventDispatcher.getInstance();

      const criarPixChargeUseCase = new CriarPixChargeUseCase(
        pixAdapter,
        pagamentoRepo,
        pedidoRepo,
        eventDispatcher
      );

      return criarPixChargeUseCase.execute(input);
    },
  });
}
