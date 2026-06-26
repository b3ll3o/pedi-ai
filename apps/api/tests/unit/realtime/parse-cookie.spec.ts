import { describe, it, expect, vi, beforeEach } from 'vitest';

import { RealtimeGateway } from '../../../src/realtime/realtime.gateway';

/**
 * Testes para `RealtimeGateway.parseCookie` — auditoria ACHADO-37 (Re-varredura 7).
 *
 * Casos cobertos:
 *  - Cookie único simples.
 *  - Múltiplos cookies separados por `;`.
 *  - Valor com `=` no payload (JWT com `==`, base64 com padding) — era o bug original.
 *  - Whitespace antes/depois de chave e valor.
 *  - Cookie com encoding URL (espaços como `%20`).
 *  - Cookie malformado (sem `=`, encoding inválido) — não lança.
 *  - Cookie header vazio / undefined.
 *
 * Garantia crítica: valores com `=` no meio não quebram o parser.
 */
describe('RealtimeGateway.parseCookie — auditoria ACHADO-37', () => {
  let gateway: RealtimeGateway;

  beforeEach(() => {
    vi.clearAllMocks();
    // Gateway exige JWT_SECRET no constructor (validado em onModuleInit
    // via configService, mas algumas implementações validam direto).
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-32chars-minimum';
    // Mock mínimo do ConfigService — `get` retorna o secret acima.
    gateway = new RealtimeGateway({
      get: vi.fn((key: string) => (key === 'JWT_SECRET' ? process.env.JWT_SECRET : undefined)),
    } as never);
  });

  function parse(cookieHeader: string): Record<string, string> {
    return (
      gateway as unknown as {
        parseCookie: (h: string) => Record<string, string>;
      }
    ).parseCookie(cookieHeader);
  }

  it('parse cookie único simples', () => {
    expect(parse('pedi_ai_access=abc123')).toEqual({ pedi_ai_access: 'abc123' });
  });

  it('parse múltiplos cookies separados por ponto-e-vírgula', () => {
    expect(parse('a=1;b=2;c=3')).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('parse valor com `=` no payload (JWT com `==` no final) — era o bug', () => {
    // JWT no formato header.payload.signature — payload pode ter `==` em base64.
    // Antes do fix: split('=') quebrava em múltiplas chaves.
    // Depois: split com `limit: 2` (via indexOf) preserva o valor inteiro.
    const jwtLike = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature_with_=_';
    const result = parse(`pedi_ai_access=${jwtLike}`);
    expect(result.pedi_ai_access).toBe(jwtLike);
    // Não deve criar chaves espúrias.
    expect(Object.keys(result)).toEqual(['pedi_ai_access']);
  });

  it('parse valor com múltiplos `=` no payload', () => {
    expect(parse('key=abc=def=ghi')).toEqual({ key: 'abc=def=ghi' });
  });

  it('parse com whitespace em torno', () => {
    expect(parse('  pedi_ai_access = abc123  ;  other = xyz  ')).toEqual({
      pedi_ai_access: 'abc123',
      other: 'xyz',
    });
  });

  it('parse com encoding URL (espaços como %20)', () => {
    expect(parse('key=hello%20world')).toEqual({ key: 'hello world' });
  });

  it('parse cookie malformado (sem `=`) — ignora silenciosamente', () => {
    expect(parse('a=1;invalidcookie;b=2')).toEqual({ a: '1', b: '2' });
  });

  it('parse com encoding inválido — usa raw como fallback', () => {
    // `%ZZ` é encoding inválido — não deve lançar.
    const result = parse('key=%ZZinvalid');
    expect(result.key).toBe('%ZZinvalid');
  });

  it('parse cookie header vazio retorna objeto vazio', () => {
    expect(parse('')).toEqual({});
  });

  it('parse valor vazio é preservado', () => {
    expect(parse('key=')).toEqual({ key: '' });
  });
});
