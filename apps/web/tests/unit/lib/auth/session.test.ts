import { describe, it, expect } from 'vitest';
import { createSessionCookie, clearSessionCookie } from '@/lib/auth/session';

describe('lib/auth/session - Cookie utilities', () => {
  describe('createSessionCookie', () => {
    it('deve criar cookie com token', () => {
      const token = 'test-token-123';
      const cookie = createSessionCookie(token);

      expect(cookie).toContain(`session_token=${token}`);
    });

    it('deve incluir HttpOnly', () => {
      const cookie = createSessionCookie('any-token');
      expect(cookie).toContain('HttpOnly');
    });

    it('deve incluir SameSite=Strict', () => {
      const cookie = createSessionCookie('any-token');
      expect(cookie).toContain('SameSite=Strict');
    });

    it('deve incluir Path=/', () => {
      const cookie = createSessionCookie('any-token');
      expect(cookie).toContain('Path=/');
    });

    it('deve incluir Expires com data futura', () => {
      const cookie = createSessionCookie('any-token');
      expect(cookie).toContain('Expires=');
      // Expires deve ser no futuro (7 dias)
      const expiresMatch = cookie.match(/Expires=([^;]+)/);
      expect(expiresMatch).toBeTruthy();
      const expiresDate = new Date(expiresMatch![1].trim());
      expect(expiresDate.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('clearSessionCookie', () => {
    it('deve ser string para limpar cookie', () => {
      expect(clearSessionCookie).toBe('session_token=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    });

    it('deve ter Max-Age=0 para expirar imediatamente', () => {
      expect(clearSessionCookie).toContain('Max-Age=0');
    });

    it('deve ter HttpOnly', () => {
      expect(clearSessionCookie).toContain('HttpOnly');
    });

    it('deve ter SameSite=Strict', () => {
      expect(clearSessionCookie).toContain('SameSite=Strict');
    });
  });
});