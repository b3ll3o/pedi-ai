import { describe, it, expect } from 'vitest';

import { ipInCidr } from '../../../src/payments/payments.controller';

/**
 * Testes para a função `ipInCidr` — auditoria ACHADO-34 (Re-varredura 7).
 *
 * Casos cobertos:
 *  - IPv4 correto em ranges conhecidos do MP.
 *  - IPv4 fora de range (negativo).
 *  - IPs inválidos: octetos não-numéricos, fora de 0-255, quantidade errada.
 *  - CIDRs inválidos: bits NaN, >32, <0, octetos inválidos.
 *  - IPv6 exato e em CIDR.
 *  - Edge cases: bits=0 (match-all), bits=32 (match-exato), porta em X-Forwarded-For.
 *
 * Garantia crítica: **fail-closed** — qualquer input inválido ⇒ `false`
 * (webhook rejeitado). Antes do fix, `bits=NaN` zerava o mask e fazia
 * todo IPv4 bater em qualquer range (bypass total do allowlist).
 */
describe('ipInCidr — auditoria ACHADO-34', () => {
  describe('IPv4 em CIDR válido', () => {
    it('match exato em range /32', () => {
      expect(ipInCidr('209.225.49.25', '209.225.49.25/32')).toBe(true);
    });

    it('match em /24 — IP dentro do range', () => {
      expect(ipInCidr('209.225.49.100', '209.225.49.0/24')).toBe(true);
      expect(ipInCidr('209.225.49.255', '209.225.49.0/24')).toBe(true);
    });

    it('não match em /24 — IP fora do range', () => {
      expect(ipInCidr('209.225.50.1', '209.225.49.0/24')).toBe(false);
    });

    it('match exato sem CIDR (sem /)', () => {
      expect(ipInCidr('192.168.1.1', '192.168.1.1')).toBe(true);
      expect(ipInCidr('192.168.1.2', '192.168.1.1')).toBe(false);
    });

    it('match em ranges oficiais do MP', () => {
      expect(ipInCidr('209.225.49.10', '209.225.49.0/24')).toBe(true);
      expect(ipInCidr('216.33.197.10', '216.33.197.0/24')).toBe(true);
      expect(ipInCidr('64.7.192.10', '64.7.192.0/24')).toBe(true);
      expect(ipInCidr('190.210.40.10', '190.210.40.0/24')).toBe(true);
      expect(ipInCidr('200.4.207.10', '200.4.207.0/24')).toBe(true);
    });

    it('match em /16', () => {
      expect(ipInCidr('10.0.5.10', '10.0.0.0/16')).toBe(true);
      expect(ipInCidr('10.1.0.0', '10.0.0.0/16')).toBe(false);
    });

    it('match em /0 (match-all IPv4)', () => {
      expect(ipInCidr('1.2.3.4', '0.0.0.0/0')).toBe(true);
      expect(ipInCidr('255.255.255.255', '0.0.0.0/0')).toBe(true);
    });
  });

  describe('Inputs inválidos — fail-closed', () => {
    it('CIDR com bits=NaN retorna false (era BUG: retornava true para qualquer IP)', () => {
      expect(ipInCidr('1.2.3.4', '192.168.0.0/abc')).toBe(false);
      expect(ipInCidr('8.8.8.8', '10.0.0.0/NaN')).toBe(false);
    });

    it('CIDR com bits >32 retorna false', () => {
      expect(ipInCidr('1.2.3.4', '192.168.0.0/33')).toBe(false);
      expect(ipInCidr('1.2.3.4', '192.168.0.0/64')).toBe(false);
    });

    it('CIDR com bits <0 retorna false', () => {
      expect(ipInCidr('1.2.3.4', '192.168.0.0/-1')).toBe(false);
    });

    it('CIDR com octetos fora de 0-255 retorna false', () => {
      expect(ipInCidr('1.2.3.4', '999.999.999.999/24')).toBe(false);
      expect(ipInCidr('1.2.3.4', '256.0.0.0/24')).toBe(false);
    });

    it('IP com octetos fora de 0-255 retorna false', () => {
      expect(ipInCidr('999.999.999.999', '192.168.0.0/24')).toBe(false);
      expect(ipInCidr('256.0.0.0', '0.0.0.0/0')).toBe(false);
    });

    it('IP com quantidade errada de octetos retorna false', () => {
      expect(ipInCidr('1.2.3', '0.0.0.0/0')).toBe(false);
      expect(ipInCidr('1.2.3.4.5', '0.0.0.0/0')).toBe(false);
      expect(ipInCidr('', '0.0.0.0/0')).toBe(false);
    });

    it('IP com octetos não-numéricos retorna false', () => {
      expect(ipInCidr('a.b.c.d', '0.0.0.0/0')).toBe(false);
      expect(ipInCidr('1.2.3.x', '0.0.0.0/0')).toBe(false);
    });

    it('CIDR vazio retorna false', () => {
      expect(ipInCidr('1.2.3.4', '')).toBe(false);
    });
  });

  describe('IPv6', () => {
    it('IPv6 exato (sem CIDR)', () => {
      expect(ipInCidr('2001:db8::1', '2001:db8::1')).toBe(true);
      expect(ipInCidr('2001:db8::2', '2001:db8::1')).toBe(false);
    });

    it('IPv6 em CIDR — match em prefixo', () => {
      expect(ipInCidr('2001:db8::1', '2001:db8::/32')).toBe(true);
      expect(ipInCidr('2001:db9::1', '2001:db8::/32')).toBe(false);
    });

    it('IPv6 com bits inválidos retorna false', () => {
      expect(ipInCidr('2001:db8::1', '2001:db8::/129')).toBe(false);
      expect(ipInCidr('2001:db8::1', '2001:db8::/abc')).toBe(false);
    });
  });

  describe('Edge cases — normalização', () => {
    it('IPv4 com porta em X-Forwarded-For (era BUG: comparava string com porta)', () => {
      // Fastify pode retornar `1.2.3.4:5678` em alguns cenários.
      expect(ipInCidr('1.2.3.4:5678', '1.2.3.0/24')).toBe(true);
      expect(ipInCidr('1.2.3.4:5678', '1.2.3.4/32')).toBe(true);
    });

    it('IPv6 com colchetes (formato de URL)', () => {
      expect(ipInCidr('[2001:db8::1]', '2001:db8::1')).toBe(true);
    });

    it('bits=32 match exato', () => {
      expect(ipInCidr('1.2.3.4', '1.2.3.4/32')).toBe(true);
      expect(ipInCidr('1.2.3.5', '1.2.3.4/32')).toBe(false);
    });

    it('whitespace em torno do input é tolerado', () => {
      expect(ipInCidr('  1.2.3.4  ', '1.2.3.4/32')).toBe(true);
    });
  });
});
