import * as crypto from 'crypto';

import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Middleware que atribui (ou propaga) um requestId a cada requisição.
 *
 * Auditoria A15:
 * - Header de entrada: `x-request-id` (cliente/proxy pode fornecer).
 *   - Validação: 8-128 chars, alfanumérico + `-_.` (evita log injection).
 *   - Se inválido ou ausente, gera novo UUID v4.
 * - Anexa ao request (`req.id` / `req.requestId`) para handlers.
 * - Devolve no response (`x-request-id`) para o cliente correlacionar.
 *
 * O `TodasExcecoesFiltro` usa esse ID para enriquecer logs de erro,
 * permitindo rastrear uma falha 500 do log até o cliente.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private static readonly REQ_ID_HEADER = 'x-request-id';
  private static readonly REQ_ID_PATTERN = /^[A-Za-z0-9_\-.]{8,128}$/;

  use(req: FastifyRequest & { requestId?: string }, res: FastifyReply, next: () => void) {
    const incoming = req.headers[RequestIdMiddleware.REQ_ID_HEADER];
    const incomingStr = Array.isArray(incoming) ? incoming[0] : incoming;
    const isValid =
      typeof incomingStr === 'string' && RequestIdMiddleware.REQ_ID_PATTERN.test(incomingStr);

    const requestId = isValid ? incomingStr : crypto.randomUUID();
    req.requestId = requestId;
    res.header(RequestIdMiddleware.REQ_ID_HEADER, requestId);
    next();
  }
}
