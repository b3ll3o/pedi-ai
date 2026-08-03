import * as crypto from 'crypto';

import { describe, it, expect } from 'vitest';

import { QRCodeCryptoService } from '../../../src/tables/qr-crypto.service';

/**
 * Cobre 100% das branches de `QRCodeCryptoService` (56 linhas, 2 métodos públicos).
 *
 * `QRCodeCryptoService` é o **single source of truth** para gerar e validar
 * assinaturas HMAC-SHA256 dos QR codes de mesa. Centraliza o formato canônico
 * `${restauranteId}:${mesaId}:${timestamp}` que `gerarAssinatura` e
 * `validarAssinatura` compartilham.
 *
 * Validação de branches:
 * - happy path (assinatura correta → true)
 * - assinatura errada → false
 * - assinatura de comprimento diferente → false (sem entrar no timingSafeEqual)
 * - hex inválido no payload → false (Buffer.from seguro)
 *
 * @see .openspec/changes/2026-08-03-test-tables-coverage-mesa/proposal.md
 */
describe('QRCodeCryptoService', () => {
  const crypto_service = new QRCodeCryptoService();
  const SECRET = 'qr_secret_test_12345_abcdef_long_enough';
  const restauranteId = 'rest-1';
  const mesaId = 'mesa-abc-123';
  const timestamp = 1_700_000_000_000;

  describe('gerarAssinatura', () => {
    it('produz hex de 64 caracteres (HMAC-SHA256)', () => {
      const sig = crypto_service.gerarAssinatura(restauranteId, mesaId, timestamp, SECRET);
      expect(sig).toHaveLength(64);
      expect(sig).toMatch(/^[0-9a-f]{64}$/);
    });

    it('produz a mesma assinatura para os mesmos inputs (determinístico)', () => {
      const sig1 = crypto_service.gerarAssinatura(restauranteId, mesaId, timestamp, SECRET);
      const sig2 = crypto_service.gerarAssinatura(restauranteId, mesaId, timestamp, SECRET);
      expect(sig1).toBe(sig2);
    });

    it('produz assinaturas diferentes para timestamps distintos', () => {
      const sig1 = crypto_service.gerarAssinatura(restauranteId, mesaId, timestamp, SECRET);
      const sig2 = crypto_service.gerarAssinatura(restauranteId, mesaId, timestamp + 1, SECRET);
      expect(sig1).not.toBe(sig2);
    });

    it('produz assinaturas diferentes para secrets distintos', () => {
      const sig1 = crypto_service.gerarAssinatura(restauranteId, mesaId, timestamp, SECRET);
      const sig2 = crypto_service.gerarAssinatura(
        restauranteId,
        mesaId,
        timestamp,
        'outro-secret-qualquer'
      );
      expect(sig1).not.toBe(sig2);
    });

    it('combina com crypto.createHmac direto (compatibilidade)', () => {
      // Documenta o formato canônico: é o mesmo de fazer o HMAC no conteúdo bruto.
      const sig = crypto_service.gerarAssinatura(restauranteId, mesaId, timestamp, SECRET);
      const expected = crypto
        .createHmac('sha256', SECRET)
        .update(`${restauranteId}:${mesaId}:${timestamp}`)
        .digest('hex');
      expect(sig).toBe(expected);
    });
  });

  describe('validarAssinatura', () => {
    it('retorna true quando a assinatura confere', () => {
      const sig = crypto_service.gerarAssinatura(restauranteId, mesaId, timestamp, SECRET);
      expect(
        crypto_service.validarAssinatura(
          { restauranteId, mesaId, timestamp, assinatura: sig },
          SECRET
        )
      ).toBe(true);
    });

    it('retorna false quando a assinatura está errada (mesmo comprimento)', () => {
      const sig = crypto_service.gerarAssinatura(restauranteId, mesaId, timestamp, SECRET);
      // Mutamos 1 caractere para manter length mas alterar conteúdo.
      const sigErrada = (sig.slice(0, -1) + (sig.endsWith('a') ? 'b' : 'a'));
      expect(
        crypto_service.validarAssinatura(
          { restauranteId, mesaId, timestamp, assinatura: sigErrada },
          SECRET
        )
      ).toBe(false);
    });

    it('retorna false quando o comprimento difere (defesa sem exception)', () => {
      const sig = crypto_service.gerarAssinatura(restauranteId, mesaId, timestamp, SECRET);
      const sigCurta = sig.slice(0, -1); // 63 chars em vez de 64
      expect(
        crypto_service.validarAssinatura(
          { restauranteId, mesaId, timestamp, assinatura: sigCurta },
          SECRET
        )
      ).toBe(false);
    });

    it('retorna false quando a assinatura tem hex inválido (Buffer vazio)', () => {
      // 'zzz...' não é hex válido — Buffer.from(string, 'hex') gera Buffer vazio.
      // timingSafeEqual falha de forma segura entre Buffer válido e Buffer vazio.
      const result = crypto_service.validarAssinatura(
        {
          restauranteId,
          mesaId,
          timestamp,
          assinatura: 'zz'.repeat(32), // 64 chars mas não-hex
        },
        SECRET
      );
      expect(result).toBe(false);
    });

    it('retorna false quando o restauranteId foi alterado', () => {
      const sig = crypto_service.gerarAssinatura(restauranteId, mesaId, timestamp, SECRET);
      expect(
        crypto_service.validarAssinatura(
          { restauranteId: 'rest-2', mesaId, timestamp, assinatura: sig },
          SECRET
        )
      ).toBe(false);
    });

    it('retorna false quando a mesaId foi alterada', () => {
      const sig = crypto_service.gerarAssinatura(restauranteId, mesaId, timestamp, SECRET);
      expect(
        crypto_service.validarAssinatura(
          { restauranteId, mesaId: 'mesa-outra', timestamp, assinatura: sig },
          SECRET
        )
      ).toBe(false);
    });

    it('retorna false quando o timestamp foi alterado', () => {
      const sig = crypto_service.gerarAssinatura(restauranteId, mesaId, timestamp, SECRET);
      expect(
        crypto_service.validarAssinatura(
          { restauranteId, mesaId, timestamp: timestamp + 1, assinatura: sig },
          SECRET
        )
      ).toBe(false);
    });

    it('retorna false quando o secret foi alterado', () => {
      const sig = crypto_service.gerarAssinatura(restauranteId, mesaId, timestamp, SECRET);
      expect(
        crypto_service.validarAssinatura(
          { restauranteId, mesaId, timestamp, assinatura: sig },
          `${SECRET}-mutado`
        )
      ).toBe(false);
    });
  });

  describe('round-trip gerar → validar', () => {
    it('round-trip é true em múltiplos timestamps', () => {
      for (const ts of [1_700_000_000_000, 1_800_000_000_000, 2_000_000_000_000]) {
        const sig = crypto_service.gerarAssinatura(restauranteId, mesaId, ts, SECRET);
        expect(
          crypto_service.validarAssinatura(
            { restauranteId, mesaId, timestamp: ts, assinatura: sig },
            SECRET
          )
        ).toBe(true);
      }
    });
  });
});
