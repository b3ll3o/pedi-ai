import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';

import { PiiCryptoService } from '../../../src/common/pii-crypto.service';

describe('PiiCryptoService', () => {
  let crypto: PiiCryptoService;

  describe('com chave hex 64 chars', () => {
    const KEY = 'a'.repeat(64);

    beforeEach(() => {
      crypto = new PiiCryptoService({
        get: (k: string) => (k === 'PII_ENCRYPTION_KEY' ? KEY : undefined),
      } as unknown as ConfigService);
      crypto.onModuleInit();
    });

    it('isEnabled retorna true', () => {
      expect(crypto.isEnabled()).toBe(true);
    });

    it('encrypt produz ciphertext v1:iv:tag:ct', () => {
      const ct = crypto.encrypt('João da Silva');
      expect(ct).toMatch(/^v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
    });

    it('encrypt → decrypt roundtrip preserva o valor', () => {
      const original = 'Restaurante do João — Rua das Flores, 123';
      const ct = crypto.encrypt(original);
      expect(ct).not.toBe(original);
      expect(crypto.decrypt(ct)).toBe(original);
    });

    it('encrypts duas vezes produzem ciphertexts diferentes (IV aleatório)', () => {
      const ct1 = crypto.encrypt('mesmo valor');
      const ct2 = crypto.encrypt('mesmo valor');
      expect(ct1).not.toBe(ct2);
      // Ambos devem decriptar para o mesmo valor.
      expect(crypto.decrypt(ct1)).toBe('mesmo valor');
      expect(crypto.decrypt(ct2)).toBe('mesmo valor');
    });

    it('null e undefined passam como null', () => {
      expect(crypto.encrypt(null)).toBeNull();
      expect(crypto.encrypt(undefined)).toBeNull();
      expect(crypto.decrypt(null)).toBeNull();
      expect(crypto.decrypt(undefined)).toBeNull();
    });

    it('string vazia passa como string vazia (sem criptografia)', () => {
      expect(crypto.encrypt('')).toBe('');
      expect(crypto.decrypt('')).toBe('');
    });

    it('decrypt detecta tampering via auth tag e retorna null', () => {
      const ct = crypto.encrypt('dado importante') as string;
      // Modifica um byte do ciphertext.
      const parts = ct.split(':');
      parts[3] = parts[3].slice(0, -2) + 'ff';
      const tampered = parts.join(':');
      expect(crypto.decrypt(tampered)).toBeNull();
    });

    it('decrypt de formato desconhecido retorna o blob como está (plaintext legado)', () => {
      const legacy = 'valor-em-plaintext-legado';
      expect(crypto.decrypt(legacy)).toBe(legacy);
    });

    it('registra campos PII via registerEncryptedField', () => {
      PiiCryptoService.registerEncryptedField('testModel', 'testField');
      expect(PiiCryptoService.isEncryptedField('testModel', 'testField')).toBe(true);
      expect(PiiCryptoService.getEncryptedFields('testModel').has('testField')).toBe(true);
    });
  });

  describe('lookup de model insensível a casing (P0-06)', () => {
    /**
     * Auditoria P0-06 — regressão que deixou TODA a criptografia de PII
     * inerte em produção.
     *
     * O registro interno usa chaves em camelCase (`usersProfile`), que é a
     * convenção dos delegates do client. Mas o Prisma Client Extension
     * entrega `model` em **PascalCase** (`UsersProfile`) — é o nome da
     * model no schema. O lookup batia `Map.get('UsersProfile')`, recebia
     * `undefined`, e a extension virava no-op silencioso: nenhum campo PII
     * era encriptado at-rest (LGPD Art. 46).
     *
     * O bug sobreviveu à cobertura de testes porque os specs da extension
     * montavam o payload à mão com `model: 'usersProfile'` — combinação
     * que nunca ocorre em runtime.
     *
     * Estes casos usam o casing REAL entregue pelo Prisma.
     */
    it('resolve UsersProfile (PascalCase — o que o Prisma entrega em runtime)', () => {
      expect(PiiCryptoService.getEncryptedFields('UsersProfile').has('name')).toBe(true);
      expect(PiiCryptoService.isEncryptedField('UsersProfile', 'name')).toBe(true);
    });

    it('resolve Restaurant (PascalCase)', () => {
      const campos = PiiCryptoService.getEncryptedFields('Restaurant');
      expect(campos.has('phone')).toBe(true);
      expect(campos.has('address')).toBe(true);
    });

    it('resolve Order (PascalCase)', () => {
      const campos = PiiCryptoService.getEncryptedFields('Order');
      expect(campos.has('customerPhone')).toBe(true);
      expect(campos.has('customerName')).toBe(true);
      expect(campos.has('customerEmail')).toBe(true);
    });

    it('continua resolvendo camelCase (compatibilidade com callers antigos)', () => {
      expect(PiiCryptoService.getEncryptedFields('usersProfile').has('name')).toBe(true);
      expect(PiiCryptoService.getEncryptedFields('order').has('customerEmail')).toBe(true);
    });

    it('retorna Set vazio para model sem PII, em qualquer casing', () => {
      expect(PiiCryptoService.getEncryptedFields('Product').size).toBe(0);
      expect(PiiCryptoService.getEncryptedFields('product').size).toBe(0);
      expect(PiiCryptoService.isEncryptedField('Product', 'name')).toBe(false);
    });

    it('não cria entrada duplicada ao registrar com casing divergente', () => {
      PiiCryptoService.registerEncryptedField('PedidoCasing', 'campoA');
      PiiCryptoService.registerEncryptedField('pedidocasing', 'campoB');

      // Ambos os campos devem viver na MESMA entrada — se houvesse
      // duplicação, um dos lookups perderia um dos campos.
      const porPascal = PiiCryptoService.getEncryptedFields('PedidoCasing');
      const porLower = PiiCryptoService.getEncryptedFields('pedidocasing');
      expect(porPascal.has('campoA')).toBe(true);
      expect(porPascal.has('campoB')).toBe(true);
      expect(porLower).toBe(porPascal);
    });
  });

  describe('sem chave configurada (dev/test)', () => {
    beforeEach(() => {
      crypto = new PiiCryptoService({
        get: () => undefined,
      } as unknown as ConfigService);
      crypto.onModuleInit();
    });

    it('isEnabled retorna false', () => {
      expect(crypto.isEnabled()).toBe(false);
    });

    it('encrypt é no-op (preserva plaintext)', () => {
      expect(crypto.encrypt('valor')).toBe('valor');
    });

    it('decrypt é no-op', () => {
      expect(crypto.decrypt('valor')).toBe('valor');
    });
  });

  describe('chave em texto puro (não-hex)', () => {
    beforeEach(() => {
      crypto = new PiiCryptoService({
        get: (k: string) => (k === 'PII_ENCRYPTION_KEY' ? 'minha-senha-boa-2026' : undefined),
      } as unknown as ConfigService);
      crypto.onModuleInit();
    });

    it('deriva chave de 32 bytes via SHA-256', () => {
      expect(crypto.isEnabled()).toBe(true);
      const ct = crypto.encrypt('test');
      expect(ct).toMatch(/^v1:/);
      expect(crypto.decrypt(ct)).toBe('test');
    });
  });
});
