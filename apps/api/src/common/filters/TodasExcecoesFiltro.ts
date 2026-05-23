import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { FastifyReply } from 'fastify';

import { RespostaErroPadrao } from './RespostaErroPadrao';

@Catch()
export class TodasExcecoesFiltro implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest();

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
        const body = responseBody as Record<string, unknown>;
        mensagem = (body.message as string) || exception.message;
        codigo = body.error as string;
        detalhes = body.message;
      }
    } else if (exception instanceof Error) {
      mensagem = exception.message;
    }

    const erro: RespostaErroPadrao = {
      statusCode: status,
      mensagem,
      codigo,
      detalhes,
      timestamp: new Date().toISOString(),
      caminho: request.url,
    };

    response.status(status).send(erro);
  }
}
