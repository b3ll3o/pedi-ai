/**
 * Testes unitários — Email Service (send-email + templates)
 *
 * Cobre:
 * - Fail-safe quando RESEND_API_KEY ausente
 * - Construção de payload correto
 * - List-Unsubscribe header em emails marketing
 * - Formatação de emails transacionais
 *
 * NOTA: `send-email.ts` captura `RESEND_API_KEY` no top-level do módulo,
 * então cada teste que precisa da env setada deve chamar `vi.resetModules()`
 * ANTES de setar a env e importar o módulo.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch
const mockFetch = vi.fn();

describe('Email Service', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as any;
    // Reset env vars
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.RESEND_FROM_NAME;
    process.env.NODE_ENV = 'test';
  });

  describe('sendEmail() — fail-safe behavior', () => {
    it('deve retornar erro sem crashar se RESEND_API_KEY ausente', async () => {
      const { sendEmail } = await import('@/lib/email/send-email');

      const result = await sendEmail({
        to: { email: 'test@test.com' },
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('RESEND_API_KEY');
    });

    it('deve logar warning em dev quando API key ausente (sem quebrar)', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const { sendEmail } = await import('@/lib/email/send-email');

      await sendEmail({
        to: { email: 'test@test.com' },
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      // Em dev, deve logar (não throw)
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('sendEmail() — chamada real', () => {
    it('deve chamar Resend API com payload correto', async () => {
      // setar env ANTES do import — `send-email.ts` captura RESEND_API_KEY
      // no top-level do módulo (não relê a cada chamada).
      vi.resetModules();
      process.env.RESEND_API_KEY = 'test-key';
      const { sendEmail } = await import('@/lib/email/send-email');

      // `send-email.ts` chama `response.json()` no caminho OK e `response.text()`
      // no caminho de erro. Mock precisa expor ambos.
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'email-123' }),
        text: () => Promise.resolve(JSON.stringify({ id: 'email-123' })),
      });

      const result = await sendEmail({
        to: { email: 'user@example.com', name: 'João' },
        subject: 'Test Subject',
        html: '<p>Hello</p>',
        text: 'Hello',
      });

      expect(mockFetch).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.id).toBe('email-123');
    });

    it('deve formatar recipients com nome se fornecido', async () => {
      vi.resetModules();
      process.env.RESEND_API_KEY = 'test-key';
      const { sendEmail } = await import('@/lib/email/send-email');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'x' }),
        text: () => Promise.resolve('{"id":"x"}'),
      });

      await sendEmail({
        to: { email: 'user@example.com', name: 'João Silva' },
        subject: 'Test',
        html: 'x',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.to).toContain('João Silva <user@example.com>');
    });

    it('deve usar email sem nome se não fornecido', async () => {
      vi.resetModules();
      process.env.RESEND_API_KEY = 'test-key';
      const { sendEmail } = await import('@/lib/email/send-email');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'x' }),
        text: () => Promise.resolve('{"id":"x"}'),
      });

      await sendEmail({
        to: { email: 'user@example.com' },
        subject: 'Test',
        html: 'x',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.to).toContain('user@example.com');
    });

    it('deve incluir List-Unsubscribe em emails marketing', async () => {
      vi.resetModules();
      process.env.RESEND_API_KEY = 'test-key';
      const { sendEmail } = await import('@/lib/email/send-email');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'x' }),
        text: () => Promise.resolve('{"id":"x"}'),
      });

      await sendEmail({
        to: { email: 'user@example.com' },
        subject: 'Newsletter',
        html: 'x',
        marketing: true,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.headers['List-Unsubscribe']).toContain('mailto:');
      expect(body.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    });

    it('NÃO deve incluir List-Unsubscribe em emails transacionais', async () => {
      vi.resetModules();
      process.env.RESEND_API_KEY = 'test-key';
      const { sendEmail } = await import('@/lib/email/send-email');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'x' }),
        text: () => Promise.resolve('{"id":"x"}'),
      });

      await sendEmail({
        to: { email: 'user@example.com' },
        subject: 'Receipt',
        html: 'x',
        // marketing: false (default)
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.headers).toBeUndefined();
    });

    it('deve retornar erro se response.ok for false', async () => {
      vi.resetModules();
      process.env.RESEND_API_KEY = 'test-key';
      const { sendEmail } = await import('@/lib/email/send-email');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.reject(new Error('not json')),
        text: () => Promise.resolve('Rate limit exceeded'),
      });

      const result = await sendEmail({
        to: { email: 'user@example.com' },
        subject: 'Test',
        html: 'x',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('429');
    });

    it('deve passar AbortSignal (timeout de 10s) na chamada fetch', async () => {
      vi.resetModules();
      process.env.RESEND_API_KEY = 'test-key';
      const { sendEmail } = await import('@/lib/email/send-email');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'x' }),
        text: () => Promise.resolve('{"id":"x"}'),
      });

      await sendEmail({
        to: { email: 'user@example.com' },
        subject: 'Test',
        html: 'x',
      });

      const init = mockFetch.mock.calls[0][1];
      expect(init.signal).toBeDefined();
      // Verifica que é um AbortSignal (Node 17.3+)
      expect(typeof init.signal?.aborted).toBe('boolean');
    });
  });
});

describe('Email Templates', () => {
  it('welcomeEmail deve incluir nome e data de trial', async () => {
    const { welcomeEmail } = await import('@/lib/email/templates');

    const trialEnd = new Date('2026-12-31');
    const email = welcomeEmail({
      userName: 'João',
      trialEndDate: trialEnd,
      loginUrl: 'https://app.pedi.ai/login',
    });

    expect(email.subject).toContain('João');
    expect(email.html).toContain('João');
    expect(email.html).toContain('14 dias');
    expect(email.html).toContain('trial');
  });

  it('trialExpiringEmail deve mostrar dias restantes', async () => {
    const { trialExpiringEmail } = await import('@/lib/email/templates');

    const email = trialExpiringEmail({
      userName: 'Maria',
      daysLeft: 3,
      upgradeUrl: 'https://app.pedi.ai/upgrade',
      planPrice: 'R$ 49,90/mês',
    });

    expect(email.subject).toContain('3');
    expect(email.html).toContain('Maria');
    expect(email.html).toContain('3');
    expect(email.marketing).toBe(true); // trial expiring é marketing
  });

  it('paymentConfirmedEmail deve incluir valor e link da fatura', async () => {
    const { paymentConfirmedEmail } = await import('@/lib/email/templates');

    const email = paymentConfirmedEmail({
      userName: 'Carlos',
      planName: 'Básico',
      amount: 'R$ 49,90',
      invoiceUrl: 'https://app.pedi.ai/invoices/123',
    });

    expect(email.subject).toContain('Básico');
    expect(email.html).toContain('Carlos');
    expect(email.html).toContain('R$ 49,90');
    expect(email.html).toContain('123');
  });

  it('orderReceivedEmail deve incluir ID do pedido e total', async () => {
    const { orderReceivedEmail } = await import('@/lib/email/templates');

    const email = orderReceivedEmail({
      restaurantName: 'Pizzaria do Zé',
      orderId: 'order-abc-123',
      total: 'R$ 89,90',
      kitchenUrl: 'https://app.pedi.ai/kitchen',
    });

    expect(email.subject).toContain('order-abc-123');
    expect(email.html).toContain('Pizzaria do Zé');
    expect(email.html).toContain('R$ 89,90');
    expect(email.html).toContain('/kitchen');
  });

  it('trialExpiringEmail com 1 dia deve usar singular', async () => {
    const { trialExpiringEmail } = await import('@/lib/email/templates');

    const email = trialExpiringEmail({
      userName: 'João',
      daysLeft: 1,
      upgradeUrl: 'https://x',
      planPrice: 'R$ 49,90/mês',
    });

    expect(email.subject).toContain('1 dia'); // singular
  });
});
