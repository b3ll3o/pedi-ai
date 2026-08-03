import { FactoryProvider, Logger } from '@nestjs/common';

import { DemoPixGateway } from './demo-pix.gateway';
import { MercadoPagoPixGateway } from './mercadopago-pix.gateway';
import { PixGateway, resolvePixGatewayMode } from './pix-gateway';

/**
 * Provider que decide em runtime qual implementação de `PixGateway`
 * injetar no `PaymentsService`. Mantém o service agnóstico de PSP.
 *
 * Decisão de wiring:
 * - `PIX_GATEWAY_MODE=mp` (default se houver `MERCADOPAGO_ACCESS_TOKEN`)
 *   injeta `MercadoPagoPixGateway` com token real.
 * - `PIX_GATEWAY_MODE=demo` (fallback) injeta `DemoPixGateway` — adequado
 *   para dev local e CI sem credenciais.
 *
 * Em produção, se o token não estiver presente e o modo resolver para
 * `demo`, o boot NÃO falha (mantém compat com o demo flag atual), mas o
 * `PaymentsService` emite um warning explícito para deixar rastro no log.
 */
export const PIX_GATEWAY = Symbol('PIX_GATEWAY');

export const pixGatewayProvider: FactoryProvider<PixGateway> = {
  provide: PIX_GATEWAY,
  useFactory: (): PixGateway => {
    const logger = new Logger('PixGatewayFactory');
    const mode = resolvePixGatewayMode();

    if (mode === 'mp') {
      const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!token) {
        logger.warn(
          'PIX_GATEWAY_MODE=mp mas MERCADOPAGO_ACCESS_TOKEN ausente — ' +
            'caindo para DemoPixGateway.'
        );
        return new DemoPixGateway();
      }
      logger.log('Usando MercadoPagoPixGateway (produção).');
      return new MercadoPagoPixGateway(token);
    }

    logger.warn(
      'Usando DemoPixGateway (modo demo). Para produção, configure ' +
        'MERCADOPAGO_ACCESS_TOKEN e PIX_GATEWAY_MODE=mp.'
    );
    return new DemoPixGateway();
  },
};

export { PixGateway };
