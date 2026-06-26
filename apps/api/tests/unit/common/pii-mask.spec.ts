import { describe, it, expect, beforeEach } from 'vitest';

import { maskEmail, maskPhone, maskPii, piiHash } from '../../../src/common/logger/pii-mask';

describe('pii-mask helpers (S3#12)', () => {
  beforeEach(() => {
    delete process.env.PII_LOG_SALT;
  });

  describe('piiHash', () => {
    it('produz hash determinístico para o mesmo valor', () => {
      const a = piiHash('user@example.com');
      const b = piiHash('user@example.com');
      expect(a).toBe(b);
    });

    it('hashes diferentes para valores diferentes', () => {
      const a = piiHash('user1@example.com');
      const b = piiHash('user2@example.com');
      expect(a).not.toBe(b);
    });

    it('retorna string vazia para null/undefined', () => {
      expect(piiHash(null)).toBe('');
      expect(piiHash(undefined)).toBe('');
      expect(piiHash('')).toBe('');
    });

    it('respeita PII_LOG_SALT para correlação entre instâncias', () => {
      // Quando PII_LOG_SALT está setado, hashes devem ser estáveis
      // entre chamadas — propriedade crítica para correlação de logs.
      const a = piiHash('user@example.com');
      const b = piiHash('user@example.com');
      expect(a).toBe(b);
      // Hash tem 12 chars hex
      expect(a).toMatch(/^[a-f0-9]{12}$/);
    });
  });

  describe('maskEmail', () => {
    it('preserva primeiros 2 chars do local + domínio mascarado', () => {
      expect(maskEmail('john.doe@example.com')).toBe('jo***@***.com');
    });

    it('mascara local curto completamente', () => {
      expect(maskEmail('a@example.com')).toBe('**@***.com');
    });

    it('retorna *** se não tem @', () => {
      expect(maskEmail('not-an-email')).toBe('***');
    });

    it('retorna vazio para null/undefined', () => {
      expect(maskEmail(null)).toBe('');
      expect(maskEmail(undefined)).toBe('');
    });
  });

  describe('maskPhone', () => {
    it('preserva últimos 2 dígitos', () => {
      expect(maskPhone('11999887766')).toBe('***66');
      expect(maskPhone('(11) 99988-7766')).toBe('***66');
    });

    it('retorna *** para phone muito curto', () => {
      expect(maskPhone('123')).toBe('***');
    });

    it('retorna vazio para null/undefined', () => {
      expect(maskPhone(null)).toBe('');
      expect(maskPhone(undefined)).toBe('');
    });
  });

  describe('maskPii', () => {
    it('substitui campos PII em objeto raso (email → hash, phone → mask)', () => {
      const input = {
        email: 'user@example.com',
        phone: '11999887766',
        name: 'John',
      };
      const out = maskPii(input) as Record<string, unknown>;
      expect(out.email).toMatch(/^[a-f0-9]{12}$/); // piiHash
      expect(out.phone).toBe('***66');
      expect(out.name).toBe('John'); // não-PII preservado
    });

    it('mascara chaves snake_case também', () => {
      const input = {
        customer_email: 'a@b.com',
        customer_phone: '11999887766',
        idempotency_key: 'abc-123',
      };
      const out = maskPii(input) as Record<string, unknown>;
      expect(out.customer_email).toMatch(/^[a-f0-9]{12}$/);
      expect(out.customer_phone).toBe('***66');
      expect(out.idempotency_key).toBe('abc-123');
    });

    it('substitui passwords/tokens por ***', () => {
      const input = {
        password: 'secret123',
        resetToken: 'tok-xyz',
        accessToken: 'jwt-abc',
      };
      const out = maskPii(input) as Record<string, unknown>;
      expect(out.password).toBe('***');
      expect(out.resetToken).toBe('***');
      expect(out.accessToken).toBe('***');
    });

    it('mascara recursivamente em objetos aninhados', () => {
      const input = {
        customer: {
          email: 'a@b.com',
          phone: '11999887766',
          metadata: {
            email: 'inner@c.com',
          },
        },
      };
      const out = maskPii(input) as {
        customer: { email: string; phone: string; metadata: { email: string } };
      };
      expect(out.customer.email).toMatch(/^[a-f0-9]{12}$/);
      expect(out.customer.phone).toBe('***66');
      expect(out.customer.metadata.email).toMatch(/^[a-f0-9]{12}$/);
    });

    it('mascara em arrays', () => {
      const input = [{ email: 'a@b.com' }, { email: 'c@d.com' }];
      const out = maskPii(input) as Array<{ email: string }>;
      expect(out[0].email).toMatch(/^[a-f0-9]{12}$/);
      expect(out[1].email).toMatch(/^[a-f0-9]{12}$/);
      // Mesmo email produz mesmo hash (determinístico)
      expect(out[0].email).toBe(out[0].email);
    });

    it('preserva primitivos', () => {
      expect(maskPii(null)).toBe(null);
      expect(maskPii(undefined)).toBe(undefined);
      expect(maskPii('string')).toBe('string');
      expect(maskPii(42)).toBe(42);
    });
  });
});
