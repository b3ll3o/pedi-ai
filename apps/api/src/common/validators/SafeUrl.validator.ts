import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Validador de URL segura para campos `imageUrl`/`logoUrl`/`websiteUrl`.
 *
 * Restringe:
 * - Protocolo: apenas `https:` ou `http:` (sem `javascript:`, `data:`,
 *   `file:`, `vbscript:`, etc.).
 * - Host: não pode ser literal IPv4/IPv6 privado (RFC 1918 / loopback /
 *   link-local), a menos que `allowPrivate` esteja ligado (usado em dev).
 * - Host: não pode ser hostname "localhost" em produção.
 *
 * Casos de uso:
 * - imageUrl em Product/Category — impede XSS via `javascript:alert(1)` em
 *   `<a href>` e SSRF parcial via IP interno.
 * - logoUrl em Restaurant — mesma proteção.
 *
 * Decisões:
 * - Apenas http(s). Outros protocolos são vetados por padrão. Se precisarmos
 *   suportar `data:` para imagens inline (não recomendado), criamos validator
 *   separado `DataImageUrl`.
 * - `javascript:` é bloqueado por filtro de protocolo, mas a validação extra
 *   por hostname protege contra SSRF.
 */

/**
 * Heurística para detectar hosts internos/privados via IPv4.
 * Retorna true se o octeto estiver em faixa privada.
 */
function isPrivateIPv4(a: number, b: number): boolean {
  if (a === 10) return true; // RFC 1918
  if (a === 127) return true; // loopback
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC 1918
  if (a === 192 && b === 168) return true; // RFC 1918
  if (a === 169 && b === 254) return true; // link-local / cloud metadata!
  if (a === 0) return true; // 0.0.0.0/8
  return false;
}

/**
 * Heurística para detectar hosts internos/privados via IPv6.
 */
function isPrivateIPv6(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA
  if (lower.startsWith('fe80')) return true; // link-local
  return false;
}

/**
 * Heurística para detectar hosts internos/privados. Não é perfeita (finge
 * bypass via DNS rebinding), mas combinada com o resto do stack é uma boa
 * primeira linha.
 */
function isPrivateHost(hostname: string): boolean {
  // IPv4
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = hostname.match(ipv4);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (Number.isNaN(a) || Number.isNaN(b)) return true;
    return isPrivateIPv4(a, b);
  }
  // IPv6
  if (hostname.includes(':')) {
    return isPrivateIPv6(hostname);
  }
  // "localhost" é tratado em outro lugar.
  return false;
}

export function IsSafeUrl(options?: ValidationOptions & { allowPrivate?: boolean }) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSafeUrl',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate: (value: unknown): boolean => {
          if (typeof value !== 'string' || value.trim() === '') return false;

          let parsed: URL;
          try {
            parsed = new URL(value);
          } catch {
            return false;
          }

          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
          if (!parsed.hostname) return false;
          if (process.env.NODE_ENV === 'production' && parsed.hostname === 'localhost') {
            return false;
          }
          if (!options?.allowPrivate && isPrivateHost(parsed.hostname)) {
            return false;
          }
          return true;
        },
        defaultMessage: () => 'URL inválida ou não permitida (apenas http(s) e host público)',
      },
    });
  };
}
