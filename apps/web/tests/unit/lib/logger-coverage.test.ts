import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { logger } from '@pedi-ai/shared/utils';

describe('logger (shared/utils)', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;
  let consoleWarn: ReturnType<typeof vi.spyOn>;
  let consoleLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('error', () => {
    it('loga mensagens de erro via console.error', () => {
      logger.error('AuthService', 'falha ao autenticar', { userId: 'u-1' });
      expect(consoleError).toHaveBeenCalled();
      expect(consoleError.mock.calls[0][0]).toMatch(
        /\[ERROR\]\s*\[AuthService\]\s*falha ao autenticar/
      );
    });
  });

  describe('warn', () => {
    it('loga mensagens de warn via console.warn', () => {
      logger.warn('Cache', 'TTL expirado', { key: 'k-1' });
      expect(consoleWarn).toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('loga mensagens info via console.log', () => {
      logger.info('Billing', 'cobrança gerada', { invoiceId: 'inv-1' });
      expect(consoleLog).toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    it('loga mensagens debug via console.log', () => {
      logger.debug('Cache', 'hit', { key: 'k-1' });
      expect(consoleLog).toHaveBeenCalled();
    });

    it('omite meta quando não informado', () => {
      logger.debug('Cache', 'miss');
      expect(consoleLog).toHaveBeenCalled();
      const formatted = consoleLog.mock.calls[0][0];
      expect(formatted).toMatch(/miss$/);
      expect(formatted).not.toMatch(/\{/);
    });
  });

  describe('sanitização de meta', () => {
    it('redige chaves sensíveis (password, token, secret, etc.)', () => {
      logger.error('Auth', 'credenciais', {
        password: 'hunter2',
        token: 'abc123',
        cpf: '111.111.111-11',
      });
      const formatted = consoleError.mock.calls[0][0];
      expect(formatted).toContain('[REDACTED]');
      expect(formatted).not.toContain('hunter2');
      expect(formatted).not.toContain('abc123');
      expect(formatted).not.toContain('111.111.111-11');
    });

    it('mantém chaves não sensíveis', () => {
      logger.info('Order', 'pedido criado', { orderId: 'o-1', total: 100 });
      const formatted = consoleLog.mock.calls[0][0];
      expect(formatted).toContain('o-1');
      expect(formatted).toContain('100');
    });

    it('processa arrays recursivamente', () => {
      logger.warn('Bulk', 'operação em lote', [{ token: 'a' }, { token: 'b' }]);
      const formatted = consoleWarn.mock.calls[0][0];
      expect(formatted).toContain('[REDACTED]');
      expect(formatted).not.toContain('"a"');
      expect(formatted).not.toContain('"b"');
    });

    it('deixa primitivos inalterados', () => {
      logger.info('Scalar', 'valor', { count: 42, active: true });
      const formatted = consoleLog.mock.calls[0][0];
      expect(formatted).toContain('42');
      expect(formatted).toContain('true');
    });
  });

  describe('formatação', () => {
    it('inclui timestamp ISO 8601', () => {
      logger.info('Clock', 'agora');
      const formatted = consoleLog.mock.calls[0][0];
      expect(formatted).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
