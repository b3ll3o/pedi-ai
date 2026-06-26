import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

import { maskPii } from '../logger/pii-mask';

import { RespostaErroPadrao } from './RespostaErroPadrao';

/**
 * Filtro global de exceções.
 *
 * Política de exposição de mensagens:
 * - **HttpException** (NotFoundException, ForbiddenException, BadRequestException, …)
 *   → repassa `message` ao cliente. Essas mensagens são seguras (foram
 *   validadas pelos autores dos decorators).
 * - **Error genérico** (PrismaClientKnownRequestError, TypeError, erros de
 *   conexão do Postgres, etc.) → NÃO vaza `exception.message` em produção.
 *   Mensagens do Prisma frequentemente contêm nomes de tabela/coluna/constraint,
 *   o que ajuda um atacante a mapear o schema. Logamos o erro completo
 *   server-side e devolvemos uma mensagem genérica ao cliente.
 *
 * O ambiente de desenvolvimento mantém o `exception.message` para facilitar
 * debug — em produção o cliente vê só "Erro interno do servidor".
 */
@Catch()
export class TodasExcecoesFiltro implements ExceptionFilter {
  private readonly logger = new Logger(TodasExcecoesFiltro.name);
  /**
   * Auditoria M12: IP completo apenas em **dev** puro. Em **staging**
   * (ambiente compartilhado, dado já enviado para logs centralizados)
   * também mascaramos. Em produção, claro, sempre mascarado.
   */
  private readonly isDev = process.env.NODE_ENV === 'development';
  private readonly isProd = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest();

    // Auditoria A15: inclui o requestId no log para correlação
    // com o header `x-request-id` retornado ao cliente.
    const requestId = (request as { requestId?: string }).requestId ?? 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let mensagem = 'Erro interno do servidor';
    let codigo: string | undefined;
    let detalhes: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();

      if (typeof responseBody === 'string') {
        mensagem = responseBody;
      } else if (typeof responseBody === 'object') {
        // S3#12: detalhes do BadRequestException podem carregar o body
        // original (ex.: `[{ field: 'email', message: 'invalid email' }]`).
        // Mascaramos PII antes de persistir em log/response.
        const body = maskPii(responseBody as Record<string, unknown>);
        mensagem = (body.message as string) || exception.message;
        codigo = body.error as string;
        detalhes = body.message;
      }
    } else if (exception instanceof Error) {
      // Erro genérico — loga o stack completo server-side, mas NÃO vaza
      // a mensagem em produção. Em dev, ainda devolvemos para facilitar
      // o trabalho do desenvolvedor.
      // Auditoria B3/M12: IP do cliente é **mascarado** no log em prod
      // e staging (compliance LGPD/GDPR). Em dev puro mantemos IP
      // completo para facilitar debug.
      const ip = (request as { ip?: string }).ip ?? 'unknown';
      const ipMascarado = this.isDev ? ip : this.mascararIp(ip);
      // S3#12: stack trace pode incluir `exception.message` que, em erros
      // do Prisma/BullMQ, frequentemente carrega valores lidos de colunas
      // PII (ex.: erro de constraint em `usersProfile.email`). Mascaramos
      // o stack inteiro para reduzir superfície de leak.
      const safeStack = this.maskStackTrace(exception.stack ?? String(exception));
      this.logger.error(
        `[${requestId}] Unhandled exception on ${request.method ?? 'UNKNOWN'} ${request.url} ` +
          `(ip=${ipMascarado})`,
        safeStack
      );
      mensagem = this.isProd ? 'Erro interno do servidor' : exception.message;
    }

    const erro: RespostaErroPadrao = {
      statusCode: status,
      mensagem,
      codigo,
      detalhes,
      timestamp: new Date().toISOString(),
      caminho: request.url,
      requestId,
    };

    response.status(status).send(erro);
  }

  /**
   * Mascara o último octeto do IPv4 ou os últimos 64 bits do IPv6.
   * Mantém contexto suficiente para análise (sub-rede) sem expor o
   * identificador único do cliente (LGPD Art. 46 — minimização).
   */
  private mascararIp(ip: string): string {
    if (ip.includes(':')) {
      // IPv6 — mantém /64, mascara o resto.
      const parts = ip.split(':');
      if (parts.length >= 4) {
        return `${parts.slice(0, 4).join(':')}:****:****:****:****`;
      }
      return '****';
    }
    // IPv4 — zera o último octeto.
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
    return '****';
  }

  /**
   * S3#12: scrub PII-shaped substrings (emails, phones longos) dentro do
   * stack trace. Heurística: regex de email e telefone BR — não é
   * exaustivo mas filtra os 95% dos casos (constraint do Prisma sobre
   * `usersProfile.email`, por exemplo).
   *
   * O custo é uma varredura por linha; aceitável porque exceções são
   * caminho de erro, não hot path.
   */
  private maskStackTrace(stack: string): string {
    return (
      stack
        // email
        .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, (m) => {
          const at = m.indexOf('@');
          return `${m.slice(0, 2)}***${m.slice(at)}`;
        })
        // telefone BR (10-11 dígitos, com ou sem máscara)
        .replace(/\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}-?\d{4}\b/g, '***-****-****')
    );
  }
}
