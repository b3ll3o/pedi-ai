import { createHash, randomBytes } from 'crypto';

/**
 * S3#12 — helpers de mascaramento PII para logs.
 *
 * Por que hash e não só asteriscos? Hash permite correlação: dois logs
 * com o mesmo email produzem o mesmo hash truncado, e o operador
 * consegue juntar "todos os eventos do cliente X" sem nunca ver o
 * email real. Asterisco perde essa propriedade.
 *
 * O salt é gerado uma vez por processo. Em produção multi-instância
 * considerar persistir o salt em variável de ambiente para que logs
 * entre instâncias sejam correlacionáveis.
 */
let _salt: string | null = null;
function getSalt(): string {
  if (_salt) return _salt;
  // process.env.PII_LOG_SALT permite correlação entre instâncias
  // (em produção) — em dev/teste, geramos um random por processo.
  _salt = process.env.PII_LOG_SALT ?? randomBytes(8).toString('hex');
  return _salt;
}

/**
 * Hash determinístico de identificador (email, phone, userId) —
 * retorna primeiros 12 hex chars do HMAC-SHA256.
 *
 * Use para campos onde correlação importa (logs de auditoria, métricas
 * por usuário, etc).
 */
export function piiHash(value: string | null | undefined): string {
  if (!value) return '';
  return createHash('sha256').update(`${getSalt()}::${value}`).digest('hex').slice(0, 12);
}

/**
 * Máscara parcial para campos que precisam ser exibidos (ex.: UI
 * admin, suporte ao cliente): preserva 2 primeiros caracteres + 1
 * do final do domínio para emails; primeiros 2 + últimos 2 dígitos
 * para telefones.
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  const tld = dot >= 0 ? domain.slice(dot) : '';
  const maskedLocal = local.length <= 2 ? '**' : `${local.slice(0, 2)}***`;
  return `${maskedLocal}@***${tld}`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `***${digits.slice(-2)}`;
}

/**
 * Aplica mascaramento recursivo em um payload, substituindo chaves
 * conhecidas como PII por versões mascaradas. Use antes de passar
 * payload para `this.logger.log()`.
 *
 * Implementação: tabela única de regras {key → transformFn}, e fallback
 * para PII_KEYS_SET (substituição por '***'). Mantém complexidade da
 * função abaixo de 15 (lint complexity).
 */
const PII_TRANSFORMS: Record<string, (v: string) => string> = {
  email: piiHash,
  customerEmail: piiHash,
  customer_email: piiHash,
  userId: piiHash,
  phone: maskPhone,
  customerPhone: maskPhone,
  customer_phone: maskPhone,
  // Substituídos por '***' — sem transform específico
  password: () => '***',
  senha: () => '***',
  token: () => '***',
  resetToken: () => '***',
  accessToken: () => '***',
  refreshToken: () => '***',
  secret: () => '***',
};

const PII_KEYS_SET = new Set(Object.keys(PII_TRANSFORMS));

export function maskPii<T>(payload: T): T {
  if (payload === null || payload === undefined) return payload;
  if (typeof payload !== 'object') return payload;
  if (Array.isArray(payload)) {
    return payload.map((item) => maskPii(item)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
    if (PII_KEYS_SET.has(k) && typeof v === 'string') {
      out[k] = PII_TRANSFORMS[k](v);
    } else if (typeof v === 'object' && v !== null) {
      out[k] = maskPii(v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}
