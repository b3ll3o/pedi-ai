import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  setAuthCookies,
  clearAuthCookies,
  readAccessTokenFromCookies,
  readRefreshTokenFromCookies,
  COOKIE_NAMES,
} from '../../../src/auth/cookie-helper';

/**
 * Helper para gerenciar cookies HttpOnly + Secure + SameSite=Lax.
 *
 * Estratégia: como as funções recebem `FastifyReply` (interface complexa,
 * sem método concreto de setCookie/clearCookie), mockamos o reply com
 * spies sobre os métodos. Variáveis de ambiente controlam os branches
 * de `buildBaseCookieOptions` (interno, não exportado).
 */

function createMockReply() {
  return {
    setCookie: vi.fn(),
    clearCookie: vi.fn(),
  };
}

describe('cookie-helper', () => {
  let originalNodeEnv: string | undefined;
  let originalCookieSecure: string | undefined;
  let originalCookieDomain: string | undefined;
  let originalCookieSameSite: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    originalCookieSecure = process.env.COOKIE_SECURE;
    originalCookieDomain = process.env.COOKIE_DOMAIN;
    originalCookieSameSite = process.env.COOKIE_SAMESITE;
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalCookieSecure === undefined) delete process.env.COOKIE_SECURE;
    else process.env.COOKIE_SECURE = originalCookieSecure;
    if (originalCookieDomain === undefined) delete process.env.COOKIE_DOMAIN;
    else process.env.COOKIE_DOMAIN = originalCookieDomain;
    if (originalCookieSameSite === undefined) delete process.env.COOKIE_SAMESITE;
    else process.env.COOKIE_SAMESITE = originalCookieSameSite;
    vi.restoreAllMocks();
  });

  describe('COOKIE_NAMES', () => {
    it('exporta nomes corretos dos cookies', () => {
      expect(COOKIE_NAMES.access).toBe('pedi_ai_access');
      expect(COOKIE_NAMES.refresh).toBe('pedi_ai_refresh');
    });
  });

  describe('setAuthCookies', () => {
    it('chama setCookie para access e refresh', () => {
      process.env.NODE_ENV = 'production';
      const reply = createMockReply();
      setAuthCookies(reply as never, {
        accessToken: 'at',
        refreshToken: 'rt',
        accessMaxAgeMs: 60_000,
        refreshMaxAgeMs: 3_600_000,
      });

      expect(reply.setCookie).toHaveBeenCalledTimes(2);
      expect(reply.setCookie).toHaveBeenNthCalledWith(
        1,
        'pedi_ai_access',
        'at',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          path: '/',
          maxAge: 60, // 60_000ms / 1000
        })
      );
      expect(reply.setCookie).toHaveBeenNthCalledWith(
        2,
        'pedi_ai_refresh',
        'rt',
        expect.objectContaining({ maxAge: 3600 })
      );
    });

    it('secure=true em produção por padrão', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.COOKIE_SECURE;
      const reply = createMockReply();
      setAuthCookies(reply as never, {
        accessToken: 'x',
        refreshToken: 'y',
        accessMaxAgeMs: 1000,
        refreshMaxAgeMs: 1000,
      });
      const opts = (reply.setCookie as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(opts.secure).toBe(true);
    });

    it('secure=false em dev por padrão', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.COOKIE_SECURE;
      const reply = createMockReply();
      setAuthCookies(reply as never, {
        accessToken: 'x',
        refreshToken: 'y',
        accessMaxAgeMs: 1000,
        refreshMaxAgeMs: 1000,
      });
      const opts = (reply.setCookie as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(opts.secure).toBe(false);
    });

    it('respeita COOKIE_SECURE=false explícito', () => {
      process.env.NODE_ENV = 'production';
      process.env.COOKIE_SECURE = 'false';
      const reply = createMockReply();
      setAuthCookies(reply as never, {
        accessToken: 'x',
        refreshToken: 'y',
        accessMaxAgeMs: 1000,
        refreshMaxAgeMs: 1000,
      });
      const opts = (reply.setCookie as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(opts.secure).toBe(false);
    });

    it('respeita COOKIE_SECURE=true explícito', () => {
      process.env.NODE_ENV = 'development';
      process.env.COOKIE_SECURE = 'true';
      const reply = createMockReply();
      setAuthCookies(reply as never, {
        accessToken: 'x',
        refreshToken: 'y',
        accessMaxAgeMs: 1000,
        refreshMaxAgeMs: 1000,
      });
      const opts = (reply.setCookie as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(opts.secure).toBe(true);
    });

    it('aplica domain quando COOKIE_DOMAIN definido', () => {
      process.env.COOKIE_DOMAIN = '.pedi-ai.com';
      const reply = createMockReply();
      setAuthCookies(reply as never, {
        accessToken: 'x',
        refreshToken: 'y',
        accessMaxAgeMs: 1000,
        refreshMaxAgeMs: 1000,
      });
      const opts = (reply.setCookie as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(opts.domain).toBe('.pedi-ai.com');
    });

    it('domain undefined quando COOKIE_DOMAIN vazio', () => {
      process.env.COOKIE_DOMAIN = '';
      const reply = createMockReply();
      setAuthCookies(reply as never, {
        accessToken: 'x',
        refreshToken: 'y',
        accessMaxAgeMs: 1000,
        refreshMaxAgeMs: 1000,
      });
      const opts = (reply.setCookie as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(opts.domain).toBeUndefined();
    });

    it('respeita COOKIE_SAMESITE customizado', () => {
      process.env.COOKIE_SAMESITE = 'strict';
      const reply = createMockReply();
      setAuthCookies(reply as never, {
        accessToken: 'x',
        refreshToken: 'y',
        accessMaxAgeMs: 1000,
        refreshMaxAgeMs: 1000,
      });
      const opts = (reply.setCookie as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(opts.sameSite).toBe('strict');
    });

    it('default sameSite = lax quando COOKIE_SAMESITE não definido', () => {
      delete process.env.COOKIE_SAMESITE;
      const reply = createMockReply();
      setAuthCookies(reply as never, {
        accessToken: 'x',
        refreshToken: 'y',
        accessMaxAgeMs: 1000,
        refreshMaxAgeMs: 1000,
      });
      const opts = (reply.setCookie as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(opts.sameSite).toBe('lax');
    });

    it('floora maxAge em segundos (Math.floor)', () => {
      const reply = createMockReply();
      setAuthCookies(reply as never, {
        accessToken: 'x',
        refreshToken: 'y',
        accessMaxAgeMs: 1500, // 1.5s → 1s
        refreshMaxAgeMs: 1000,
      });
      const opts = (reply.setCookie as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(opts.maxAge).toBe(1);
    });
  });

  describe('clearAuthCookies', () => {
    it('chama clearCookie para access e refresh', () => {
      const reply = createMockReply();
      clearAuthCookies(reply as never);

      expect(reply.clearCookie).toHaveBeenCalledTimes(2);
      expect(reply.clearCookie).toHaveBeenNthCalledWith(
        1,
        'pedi_ai_access',
        expect.objectContaining({ path: '/' })
      );
      expect(reply.clearCookie).toHaveBeenNthCalledWith(
        2,
        'pedi_ai_refresh',
        expect.objectContaining({ path: '/' })
      );
    });

    it('espelha domain do setCookie (auditoria B5)', () => {
      process.env.COOKIE_DOMAIN = '.pedi-ai.com';
      const reply = createMockReply();
      clearAuthCookies(reply as never);
      const opts = (reply.clearCookie as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(opts.domain).toBe('.pedi-ai.com');
    });

    it('sem domain quando COOKIE_DOMAIN não definido', () => {
      delete process.env.COOKIE_DOMAIN;
      const reply = createMockReply();
      clearAuthCookies(reply as never);
      const opts = (reply.clearCookie as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(opts.domain).toBeUndefined();
    });
  });

  describe('readAccessTokenFromCookies', () => {
    it('retorna token quando cookie existe', () => {
      expect(readAccessTokenFromCookies({ pedi_ai_access: 'jwt' })).toBe('jwt');
    });

    it('retorna null quando cookie ausente', () => {
      expect(readAccessTokenFromCookies({})).toBeNull();
    });

    it('retorna null quando input undefined', () => {
      expect(readAccessTokenFromCookies(undefined)).toBeNull();
    });

    it('retorna null quando token undefined', () => {
      expect(readAccessTokenFromCookies({ pedi_ai_access: undefined })).toBeNull();
    });
  });

  describe('readRefreshTokenFromCookies', () => {
    it('retorna token quando cookie existe', () => {
      expect(readRefreshTokenFromCookies({ pedi_ai_refresh: 'rt' })).toBe('rt');
    });

    it('retorna null quando cookie ausente', () => {
      expect(readRefreshTokenFromCookies({})).toBeNull();
    });

    it('retorna null quando input undefined', () => {
      expect(readRefreshTokenFromCookies(undefined)).toBeNull();
    });

    it('retorna null quando token undefined', () => {
      expect(readRefreshTokenFromCookies({ pedi_ai_refresh: undefined })).toBeNull();
    });
  });
});
