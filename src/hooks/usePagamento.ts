/**
 * usePagamento Hook
 * Hook para operações de pagamento usando use cases do application layer.
 */

import { useMutation } from '@tanstack/react-query';
import {
  CriarPixChargeUseCase,
  type CriarPixChargeInput,
} from '@/application/pagamento/services/CriarPixChargeUseCase';
import {
  CriarStripePaymentIntentUseCase,
  type CriarStripePaymentIntentInput,
} from '@/application/pagamento/services/CriarStripePaymentIntentUseCase';
import { PixAdapter } from '@/infrastructure/external/PixAdapter';
import { StripeAdapter } from '@/infrastructure/external/StripeAdapter';
import { PagamentoRepository } from '@/infrastructure/persistence/pagamento/PagamentoRepository';
import { PedidoRepository } from '@/infrastructure/persistence/pedido/PedidoRepository';
import { db } from '@/infrastructure/persistence/database';
import { EventDispatcher } from '@/domain/shared';
import type { PixCharge } from '@/application/pagamento/services/adapters/IPixAdapter';
import type { StripePaymentIntent } from '@/application/pagamento/services/adapters/IStripeAdapter';

export type { PixCharge, StripePaymentIntent };

/**
 * Hook para criar uma cobrança Pix.
 * Usa CriarPixChargeUseCase do application layer.
 */
export function useCriarPixCharge() {
  return useMutation<PixCharge, Error, CriarPixChargeInput>({
    mutationFn: async (input) => {
      // Instanciar adapters e repositories
      const pixAdapter = new PixAdapter();
      const pagamentoRepo = new PagamentoRepository(db);
      const pedidoRepo = new PedidoRepository(db);
      const eventDispatcher = EventDispatcher.getInstance();

      // Instanciar e executar use case
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

/**
 * Hook para criar uma Payment Intent Stripe.
 * Usa CriarStripePaymentIntentUseCase do application layer.
 */
export function useCriarStripePaymentIntent() {
  return useMutation<StripePaymentIntent, Error, CriarStripePaymentIntentInput>({
    mutationFn: async (input) => {
      // Instanciar adapters e repositories
      const stripeAdapter = new StripeAdapter();
      const pagamentoRepo = new PagamentoRepository(db);
      const pedidoRepo = new PedidoRepository(db);
      const eventDispatcher = EventDispatcher.getInstance();

      // Instanciar e executar use case
      const criarStripePaymentIntentUseCase = new CriarStripePaymentIntentUseCase(
        stripeAdapter,
        pagamentoRepo,
        pedidoRepo,
        eventDispatcher
      );

      return criarStripePaymentIntentUseCase.execute(input);
    },
  });
}
