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
