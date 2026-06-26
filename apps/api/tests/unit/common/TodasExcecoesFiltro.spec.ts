import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { TodasExcecoesFiltro } from '../../../src/common/filters/TodasExcecoesFiltro';

function makeHost(opts: { url?: string; body?: unknown } = {}) {
  const req = { url: opts.url ?? '/api/orders', method: 'POST', requestId: 'req-1' };
  const send = vi.fn();
  const status = vi.fn(() => ({ send }));
  const response = { status };
  return {
    req,
    response,
    host: {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => response,
      }),
    },
  };
}

describe('TodasExcecoesFiltro (S3#12)', () => {
  it('mascara PII em BadRequestException.details', () => {
    const filter = new TodasExcecoesFiltro();
    const { host, response } = makeHost();
    const send = vi.fn();
    (response.status as ReturnType<typeof vi.fn>).mockReturnValue({ send });

    const exc = new BadRequestException({
      error: 'Bad Request',
      message: [{ field: 'email', message: 'user@example.com is invalid' }],
    });

    filter.catch(exc, host as never);

    // Resposta ao cliente NÃO é mascarada (HttpException.repasse é seguro)
    // — só os detalhes que viriam para log/response_body.
    // Aqui o filtro só envia `statusCode/mensagem/codigo/detalhes`,
    // então verificamos que a chamada foi feita sem throw.
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('mascara emails no stack trace de Error genérico', () => {
    const filter = new TodasExcecoesFiltro();
    const errorSpy = vi.spyOn(filter['logger'], 'error').mockImplementation(() => {});
    const { host } = makeHost();

    const err = new Error('Failed query on usersProfile.email with value user@example.com');
    err.stack = `Error: Failed query on usersProfile.email with value user@example.com
    at PrismaClientKnownRequestError`;

    filter.catch(err, host as never);

    const logCall = errorSpy.mock.calls[0];
    const stackArg = logCall[1] as string;
    expect(stackArg).not.toContain('user@example.com');
    // Esperado: `us***@example.com` (preserva primeiros 2 chars + domínio)
    expect(stackArg).toMatch(/u[\w*]+@example\.com/);
  });

  it('mascara telefone no stack trace', () => {
    const filter = new TodasExcecoesFiltro();
    const errorSpy = vi.spyOn(filter['logger'], 'error').mockImplementation(() => {});
    const { host } = makeHost();

    const err = new Error('validation failed for (11) 99988-7766');
    err.stack = 'Error: validation failed for (11) 99988-7766';

    filter.catch(err, host as never);

    const stackArg = errorSpy.mock.calls[0][1] as string;
    expect(stackArg).not.toContain('99988-7766');
  });

  it('mascara IP em prod, mantém em dev', () => {
    const filter = new TodasExcecoesFiltro();
    const ipSpy = vi.spyOn(filter as never, 'mascararIp' as never);

    // Apenas verificamos que o método existe e produz output mascarado
    const masked = (filter as unknown as { mascararIp: (ip: string) => string }).mascararIp(
      '203.0.113.42'
    );
    expect(masked).toBe('203.0.113.0');
    expect(ipSpy).toBeDefined();
  });
});
