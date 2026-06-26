import { Prisma, PrismaClient } from '@prisma/client';

import { PiiCryptoService } from './pii-crypto.service';

/**
 * Prisma Client Extension que aplica encrypt/decrypt transparente nos
 * campos PII registrados em `PiiCryptoService.ENCRYPTED_FIELDS`.
 *
 * O extension intercepta:
 *  - `create`, `createMany`, `update`, `updateMany`, `upsert` — encripta
 *    campos PII antes de chegar ao DB.
 *  - `findUnique`, `findFirst`, `findMany` — decripta campos PII ao ler.
 *
 * Trade-off: encriptar PII no nível da model é uma mitigação em profundidade
 * (defense-in-depth) — mesmo um dump do DB vaza apenas ciphertext, não PII
 * em claro. Lookup de email continua em plaintext (necessário para login).
 */
export function createPiiPrismaExtension(crypto: PiiCryptoService) {
  return Prisma.defineExtension({
    name: 'pii-encryption',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Mapeia a nomeclatura de operation para identificar leitura vs escrita.
          const isWrite =
            operation === 'create' ||
            operation === 'createMany' ||
            operation === 'createManyAndReturn' ||
            operation === 'update' ||
            operation === 'updateMany' ||
            operation === 'upsert';
          const isRead =
            operation === 'findUnique' ||
            operation === 'findUniqueOrThrow' ||
            operation === 'findFirst' ||
            operation === 'findFirstOrThrow' ||
            operation === 'findMany';

          const encryptedFields = model
            ? PiiCryptoService.getEncryptedFields(model)
            : new Set<string>();

          if (encryptedFields.size === 0 || !crypto.isEnabled()) {
            return query(args);
          }

          if (isWrite) {
            args = encryptArgs(model as string, args, encryptedFields, crypto);
          }

          const result = await query(args);

          if (isRead) {
            return decryptResult(result, encryptedFields, crypto);
          }
          return result;
        },
      },
    },
  });
}

/**
 * Auditoria L-NEW-04: `$queryRaw` e `$executeRaw` são escapes do Prisma que
 * **não passam pelo extension de typed operations**. Como PII vive em colunas
 * específicas, qualquer `SELECT * FROM users` ou UPDATE direto via SQL cru
 * pode vazar plaintext.
 *
 * Defesa em profundidade: registramos um guard que **lança** quando raw
 * queries tocam models PII, forçando o dev a usar as operações tipadas
 * (findUnique, update, etc.) que passam pelo encrypt/decrypt. Útil em dev
 * e staging; em produção é fail-closed.
 *
 * Em produção, para legados que ainda usam raw queries (ex: relatórios
 * agregados), é necessário fazer `encrypt`/`decrypt` manualmente na SQL
 * — mas isso deve ser exceção justificada em code review.
 */
export const PII_PROTECTED_MODELS = new Set<string>(['UsersProfile', 'Order']);
// Auditoria ACHADO-N28 (Re-varredura 9): `Order` adicionado ao guard.
// `Order.customerPhone`, `customerName`, `customerEmail` são PII direta
// (registrados em `PiiCryptoService.ENCRYPTED_FIELDS`). Analytics ou
// relatórios que tentem `prisma.$queryRaw` sobre a tabela `Order` são
// bloqueados — força uso de operações tipadas que passam pela encriptação.
// Lembrete: o guard detecta pelo NOME DA TABELA — se a query usar alias
// (ex: `FROM "Order" o`), `detectRawQueryModel` ainda captura via regex
// pois matchamos o token imediatamente após FROM/UPDATE/JOIN/INTO.

export function assertNoRawPiiAccess(modelHint: string | undefined): void {
  if (!modelHint) return;
  if (PII_PROTECTED_MODELS.has(modelHint)) {
    throw new Error(
      `[PII] Raw query contra model PII '${modelHint}' é proibida. ` +
        'Use operações tipadas do Prisma (findUnique, update, etc.) que passam ' +
        'pela encriptação automática. Caso precise de agregação SQL, ' +
        'desencriptar manualmente com PiiCryptoService no nível da aplicação.'
    );
  }
}

/**
 * Helper que detecta qual model PII uma raw query pode estar tocando,
 * via heurística simples (nome da tabela no FROM/UPDATE/JOIN).
 *
 * Heurística cobre os padrões mais comuns:
 *   - `SELECT ... FROM "UsersProfile"`
 *   - `UPDATE "UsersProfile" SET ...`
 *   - `DELETE FROM "UsersProfile"`
 *
 * Não tenta ser parser SQL completo — se a heurística falhar, a query
 * passa (false negative). Em produção, adicionar monitoring em vez de
 * bloquear — bloquear com heurística imperfeita pode quebrar reports legítimos.
 */
export function detectRawQueryModel(sql: string): string | undefined {
  const normalized = sql.replace(/\s+/g, ' ').trim();
  // Match: FROM "Model" | UPDATE "Model" | JOIN "Model" | INTO "Model"
  const match = normalized.match(/(?:FROM|UPDATE|JOIN|INTO)\s+["']?([A-Za-z][A-Za-z0-9_]*)["']?/i);
  if (match && PII_PROTECTED_MODELS.has(match[1])) {
    return match[1];
  }
  return undefined;
}

type WriteArgs = {
  data?: Record<string, unknown> | Record<string, unknown>[];
  where?: Record<string, unknown>;
  create?: Record<string, unknown>;
  update?: Record<string, unknown>;
};

function encryptArgs(
  model: string,
  args: WriteArgs,
  fields: Set<string>,
  crypto: PiiCryptoService
): WriteArgs {
  const next: WriteArgs = { ...args };

  if (args.data) {
    next.data = Array.isArray(args.data)
      ? args.data.map((d) => encryptObject(model, d, fields, crypto))
      : encryptObject(model, args.data, fields, crypto);
  }
  if (args.create) {
    next.create = encryptObject(model, args.create, fields, crypto);
  }
  if (args.update) {
    next.update = encryptObject(model, args.update, fields, crypto);
  }

  return next;
}

function encryptObject(
  _model: string,
  obj: Record<string, unknown>,
  fields: Set<string>,
  crypto: PiiCryptoService
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...obj };
  for (const f of fields) {
    if (f in out) {
      const val = out[f];
      if (typeof val === 'string') {
        out[f] = crypto.encrypt(val);
      }
    }
  }
  return out;
}

function decryptResult(result: unknown, fields: Set<string>, crypto: PiiCryptoService): unknown {
  if (result === null || result === undefined) return result;
  if (Array.isArray(result)) {
    return result.map((r) => decryptSingle(r, fields, crypto));
  }
  return decryptSingle(result, fields, crypto);
}

function decryptSingle(value: unknown, fields: Set<string>, crypto: PiiCryptoService): unknown {
  if (value === null || typeof value !== 'object') return value;
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = { ...obj };
  for (const f of fields) {
    if (typeof out[f] === 'string') {
      out[f] = crypto.decrypt(out[f] as string);
    }
  }
  return out;
}

export type PiiPrismaClient = ReturnType<typeof createPiiPrismaExtension> & PrismaClient;
