/**
 * usePagamento Hook
 *
 * Hook para operações de pagamento via API Route Handler server-side.
 * NUNCA instancia `PixAdapter` ou importa `mercadopago` no cliente —
 * isso vazaria o token de acesso e adicionaria ~50KB ao bundle.
 *
 * Toda a integração com Mercado Pago vive em:
 *   apps/web/src/app/api/payments/pix/create/route.ts
 */

import { useMutation } from '@tanstack/react-query';

import type { PixCharge } from '@/application/pagamento/services/adapters/IPixAdapter';

export type { PixCharge };

interface CreatePixApiRequest {
  order_id: string;
  restaurant_id?: string;
}

interface CreatePixApiResponse {
  qr_code: string;
  qr_code_base64: string;
  expires_at: string;
}

/**
 * Hook para criar uma cobrança Pix.
 *
 * Chama a Route Handler server-side `/api/payments/pix/create`, que
 * encapsula a SDK `mercadopago` e mantém o token de acesso em ambiente
 * server-only.
 *
 * @see apps/web/src/app/api/payments/pix/create/route.ts
 */
export function useCriarPixCharge() {
  return useMutation<PixCharge, Error, { pedidoId: string }>({
    mutationFn: async ({ pedidoId }) => {
      const response = await fetch('/api/payments/pix/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: pedidoId,
        } satisfies CreatePixApiRequest),
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(error.error ?? `HTTP ${response.status}`);
      }

      const data = (await response.json()) as CreatePixApiResponse;

      // Mapear resposta do route handler (formato Mercado Pago) para
      // o shape canônico `PixCharge` esperado pelos consumidores.
      return {
        id: pedidoId,
        valor: 0,
        imagemQrCode: data.qr_code_base64,
        codigoPix: data.qr_code,
        expiracao: new Date(data.expires_at),
      } satisfies PixCharge;
    },
  });
}
