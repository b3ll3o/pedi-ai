import { Injectable, Logger } from '@nestjs/common';

import { RealtimeGateway } from './realtime.gateway';

/**
 * Wrapper sobre o gateway com **proteção contra crashes** (auditoria A-R-04).
 *
 * `emitOrderUpdate` / `emitNewOrder` são fire-and-forget — antes, qualquer
 * exceção do socket.io (cliente desconectado, write buffer cheio) virava
 * unhandledRejection, e o handler global em `main.ts` chama `process.exit(1)`,
 * derrubando o pod inteiro por um erro de broadcast.
 *
 * Agora, qualquer falha é capturada e logada — o pedido é persistido
 * normalmente; o broadcast é best-effort.
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  emitOrderUpdate(restaurantId: string, order: { id: string; status: string }) {
    // setImmediate desloca para próximo tick — request termina antes do broadcast.
    setImmediate(() => {
      try {
        this.gateway.emitOrderUpdate(restaurantId, order);
      } catch (err) {
        this.logger.error(
          `Falha ao emitir orderUpdate (orderId=${order.id}, restaurantId=${restaurantId}): ${(err as Error).message}`
        );
      }
    });
  }

  emitNewOrder(restaurantId: string, order: { id: string; total: number }) {
    setImmediate(() => {
      try {
        this.gateway.emitNewOrder(restaurantId, order);
      } catch (err) {
        this.logger.error(
          `Falha ao emitir newOrder (orderId=${order.id}, restaurantId=${restaurantId}): ${(err as Error).message}`
        );
      }
    });
  }
}
