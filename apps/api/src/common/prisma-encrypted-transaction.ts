import { Prisma, PrismaClient } from '@prisma/client';

import { PiiCryptoService } from './pii-crypto.service';
import { createPiiPrismaExtension, PiiPrismaClient } from './pii-prisma.extension';

/**
 * Auditoria P0-06 — helper livre para transações com PII encriptada.
 *
 * ## Por que este arquivo existe
 *
 * `PrismaService.withEncryptedTransaction()` cobre o caso comum (o serviço
 * NestJS injetado). Mas há callers que recebem um `PrismaClient` cru — por
 * exemplo scripts de migração/backfill, seeds e testes de integração — e
 * que também escrevem PII. Para eles, esta função aplica a mesma garantia
 * sem exigir o container de DI.
 *
 * ## A armadilha que este helper evita
 *
 * A tentação natural é fazer:
 *
 * ```ts
 * await prisma.$transaction(async (tx) => {
 *   const ext = prismaService.getExtendedClient(); // ❌ ERRADO
 *   return ext.usersProfile.create({ data: { name } });
 * });
 * ```
 *
 * `getExtendedClient()` devolve um client **novo**, com conexão própria.
 * As escritas feitas por ele **não participam da transação** e, portanto,
 * **não sofrem rollback**: se o callback lançar depois, a linha fica no
 * banco. Isso foi confirmado empiricamente e é coberto por
 * `tests/integration/pii-encryption-transaction.int-spec.ts`.
 *
 * A forma correta é estender o client **antes** de abrir a transação, para
 * que o `tx` entregue ao callback já herde a extension:
 *
 * ```ts
 * await comTransacaoEncriptada(prisma, piiCrypto, async (tx) => {
 *   return tx.usersProfile.create({ data: { name } }); // ✅ encriptado E atômico
 * });
 * ```
 *
 * ## Nota sobre o Prisma 7
 *
 * No Prisma 7.8 as extensions são propagadas automaticamente para o `tx`
 * de um `$transaction` chamado a partir de um client estendido. Este helper
 * torna essa dependência **explícita** em vez de implícita: se um upgrade
 * futuro do Prisma mudar a semântica de propagação, o ponto de correção é
 * único e os testes de integração acusam a regressão.
 */

/** Cliente de transação com a extension de PII aplicada. */
export type TransacaoPiiClient = Omit<
  PiiPrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;

/** Options aceitas por `$transaction` interativo do Prisma. */
export interface OpcoesTransacaoPii {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

/**
 * Executa `callback` dentro de uma transação cujo `tx` já tem a extension
 * de encriptação de PII aplicada.
 *
 * @param prisma  Client base (pode ou não já estar estendido — estender
 *                duas vezes é idempotente porque `encryptObject` só
 *                encripta campos registrados e a extension é aplicada
 *                uma única vez por chamada).
 * @param crypto  Serviço de cripto que fornece a chave. Se estiver
 *                desabilitado (`isEnabled() === false`), a extension vira
 *                no-op e os dados seguem em plaintext — comportamento
 *                intencional em dev sem `PII_ENCRYPTION_KEY`.
 * @param callback Recebe o `tx` estendido.
 * @param opcoes  Repassadas ao `$transaction` (isolationLevel, timeout...).
 */
export async function comTransacaoEncriptada<T>(
  prisma: PrismaClient,
  crypto: PiiCryptoService,
  callback: (tx: TransacaoPiiClient) => Promise<T>,
  opcoes?: OpcoesTransacaoPii
): Promise<T> {
  const estendido = prisma.$extends(createPiiPrismaExtension(crypto));
  return estendido.$transaction(
    callback as (tx: unknown) => Promise<T>,
    opcoes
  ) as unknown as Promise<T>;
}
