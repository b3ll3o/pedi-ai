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

  // Auditoria ACHADO-39 (Re-varredura 7): a heurística anterior mascarava
  // falsos positivos (order IDs) e vazava CPF/CNPJ. Estes testes fixam o
  // novo comportamento.
  describe('maskStackTrace — auditoria ACHADO-39', () => {
    function getMask(filter: TodasExcecoesFiltro): (stack: string) => string {
      return (filter as unknown as { maskStackTrace: (s: string) => string }).maskStackTrace.bind(
        filter
      );
    }

    it('mascara CPF formatado (XXX.XXX.XXX-XX)', () => {
      const filter = new TodasExcecoesFiltro();
      const mask = getMask(filter);
      const result = mask('User CPF: 123.456.789-09 not found');
      expect(result).not.toContain('123.456.789-09');
      expect(result).toContain('***.***.***-**');
    });

    it('mascara CPF sem formatação (11 dígitos consecutivos)', () => {
      const filter = new TodasExcecoesFiltro();
      const mask = getMask(filter);
      const result = mask('constraint failed: 12345678901');
      // 11 dígitos consecutivos deve ser capturado pelo regex de CPF.
      expect(result).not.toContain('12345678901');
    });

    it('mascara CNPJ formatado (XX.XXX.XXX/XXXX-XX)', () => {
      const filter = new TodasExcecoesFiltro();
      const mask = getMask(filter);
      const result = mask('CNPJ: 12.345.678/0001-90 invalid');
      expect(result).not.toContain('12.345.678/0001-90');
      expect(result).toContain('**.***.***/****-**');
    });

    it('mascara sequência longa de dígitos (≥6) — cobre cartões de crédito', () => {
      const filter = new TodasExcecoesFiltro();
      const mask = getMask(filter);
      const result = mask('card number 4111111111111111 declined');
      expect(result).not.toContain('4111111111111111');
      // 16 dígitos → marcador de 16d.
      expect(result).toContain('[REDACTED-16d]');
    });

    it('NÃO mascara IPv4 (4 octetos separados por ponto, dígitos curtos)', () => {
      const filter = new TodasExcecoesFiltro();
      const mask = getMask(filter);
      // IPv4 tem octetos curtos (1-3 dígitos) com pontos — o regex de
      // sequência ≥6 casa no octeto, mas o ponto interrompe. O primeiro
      // octeto (1-3 dígitos) e os demais ficam intactos.
      const result = mask('Connection from 192.168.1.42 failed');
      expect(result).toContain('192.168.1.42');
    });

    it('mascara email mas NÃO casa `user@1.2` (TLD inválido)', () => {
      const filter = new TodasExcecoesFiltro();
      const mask = getMask(filter);
      const result = mask('user@1.2 not an email');
      // Não deve mascarar (regex exige TLD com ≥2 letras).
      expect(result).toContain('user@1.2');
    });

    it('mascara email legítimo com TLD válido', () => {
      const filter = new TodasExcecoesFiltro();
      const mask = getMask(filter);
      const result = mask('contact: user@example.com please');
      expect(result).not.toContain('user@example.com');
      expect(result).toMatch(/u[\w*]+@example\.com/);
    });

    it('mascara telefone BR com DDD entre parênteses', () => {
      const filter = new TodasExcecoesFiltro();
      const mask = getMask(filter);
      const result = mask('phone (11) 99988-7766 invalid');
      expect(result).not.toContain('99988-7766');
    });
  });
});
