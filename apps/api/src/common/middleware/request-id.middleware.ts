import * as crypto from 'crypto';

import { Injectable, NestMiddleware } from '@nestjs/common';
import type { ServerResponse, IncomingMessage } from 'http';

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
 *
 * IMPORTANTE — @nestjs/platform-fastify + @fastify/middie: ao executar
 * middlewares NestJS, o adapter passa `req.raw` (IncomingMessage) e
 * `reply.raw` (ServerResponse nativo do Node, NÃO a FastifyReply). Por
 * isso precisamos usar APIs nativas (`setHeader`) — `.header()` é da
 * FastifyReply, `.set()` é da Express response; ambos NÃO funcionam
 * aqui. Fonte: node_modules/@nestjs/platform-fastify/adapters/middie/fastify-middie.js
 * linha 218 (`this[kMiddie].run(req.raw, reply.raw, next)`).
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private static readonly REQ_ID_HEADER = 'x-request-id';
  private static readonly REQ_ID_PATTERN = /^[A-Za-z0-9_\-.]{8,128}$/;

  use(
    req: IncomingMessage & { requestId?: string },
    res: ServerResponse,
    next: () => void
  ) {
    const incoming = req.headers[RequestIdMiddleware.REQ_ID_HEADER];
    const incomingStr = Array.isArray(incoming) ? incoming[0] : incoming;
    const isValid =
      typeof incomingStr === 'string' && RequestIdMiddleware.REQ_ID_PATTERN.test(incomingStr);

    const requestId = isValid ? incomingStr : crypto.randomUUID();
    (req as IncomingMessage & { requestId?: string }).requestId = requestId;
    // `setHeader` é o método nativo de `http.ServerResponse`. Express
    // expõe `.set()` como wrapper; Fastify expõe `.header()` na reply.
    // Como middie injetou `reply.raw`, precisamos do método nativo.
    res.setHeader(RequestIdMiddleware.REQ_ID_HEADER, requestId);
    next();
  }
}
