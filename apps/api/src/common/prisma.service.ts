import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { PiiCryptoService } from './pii-crypto.service';
import {
  comTransacaoEncriptada,
  OpcoesTransacaoPii,
  TransacaoPiiClient,
} from './prisma-encrypted-transaction';
import {
  createPiiPrismaExtension,
  detectRawQueryModel,
  PII_PROTECTED_MODELS,
  PiiPrismaClient,
} from './pii-prisma.extension';

/**
 * PrismaService que aplica a extensão de PII encryption.
 *
 * **Auditoria P0-06** — mudanças desta rodada:
 *
 * 1. **Extension aplicada no CONSTRUTOR, não em `onModuleInit`.** Antes,
 *    existia uma janela de boot: entre `new PrismaService(...)` e o fim do
 *    `onModuleInit()` (assíncrono, depois de `$connect`), qualquer escrita
 *    persistia PII em plaintext — permanentemente e sem nenhum sinal.
 *    Pior: a instalação era condicionada a `piiCrypto.isEnabled()` no
 *    instante do init; se a ordem de inicialização do Nest colocasse o
 *    `PiiCryptoService` depois, a extension jamais era aplicada. Agora ela
 *    é instalada no construtor e consulta `crypto.isEnabled()` *por
 *    chamada*, então passa a valer assim que a chave existir.
 *
 * 2. **`withEncryptedTransaction()` substitui o padrão perigoso de
 *    `getExtendedClient()` dentro de `$transaction`.** O docblock antigo
 *    recomendava chamar `getExtendedClient()` DENTRO do callback — mas
 *    aquele client tem conexão própria, logo as escritas **não participam
 *    da transação e não sofrem rollback**. A recomendação corrompia dados.
 *    Ver `tests/integration/pii-encryption-transaction.int-spec.ts`.
 *
 * **Auditoria M11** — mudanças anteriores, ainda válidas:
 *
 * 1. **FAIL LOUD em produção/staging se a extensão falhar** — em produção,
 *    seguir sem extension significa persistir PII em plaintext
 *    silenciosamente (risco LGPD/GDPR).
 *
 * 2. **Guard em `$queryRaw`/`$executeRaw` para models PII** (L-NEW-04) —
 *    a API de extensions do Prisma (`$allModels.$allOperations`) intercepta
 *    apenas delegates de modelo. `$queryRaw`/`$executeRaw` passam **sem**
 *    encriptação automática, então raw queries contra models PII falham alto.
 *
 * 3. **`Object.assign` mantido como trade-off pragmático** — a alternativa
 *    "pura" exigiria refatorar todos os call sites para
 *    `this.extendedClient.user.findMany(...)`. Verificado empiricamente no
 *    Prisma 7.8: o `$transaction` copiado é o do client estendido e o
 *    Prisma propaga as extensions para o `tx` do callback. Os testes de
 *    integração travam esse comportamento contra regressão em upgrades.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private piiApplied = false;

  constructor(private readonly piiCrypto: PiiCryptoService) {
    // Prisma 7 não aceita mais `super()` sem options — exige um driver adapter
    // (`@prisma/adapter-pg`, `@prisma/adapter-neon`, etc.). Usamos `PrismaPg`
    // apontando para `DATABASE_URL` (mesmo env que o Prisma 6 lia via schema).
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL é obrigatório para inicializar PrismaClient');
    }
    super({
      adapter: new PrismaPg({ connectionString }),
    });

    // Auditoria P0-06: instalar AQUI (e não em `onModuleInit`) fecha a
    // janela de boot em que escritas iam para o disco em plaintext.
    // A extension consulta `crypto.isEnabled()` a cada operação, então
    // funciona mesmo que a chave só seja carregada depois — não há mais
    // acoplamento com a ordem de inicialização dos providers do Nest.
    this.aplicarExtensaoPii();
  }

  /**
   * Aplica a extension de PII sobre `this`. Idempotente: chamadas
   * repetidas não empilham camadas de encriptação porque o
   * `Object.assign` substitui os delegates pelos do novo proxy.
   */
  private aplicarExtensaoPii(): void {
    try {
      const extended = this.$extends(createPiiPrismaExtension(this.piiCrypto));
      // `Object.assign` copia os delegates do proxy estendido — incluindo
      // `$transaction`, que por isso propaga as extensions para o `tx`
      // entregue ao callback (verificado no Prisma 7.8 e travado por
      // `tests/integration/pii-encryption-transaction.int-spec.ts`).
      Object.assign(this, extended);
      this.piiApplied = true;
    } catch (err) {
      const isStrict = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
      if (isStrict) {
        // FAIL LOUD em prod/staging — antes ficava silencioso.
        throw new Error(
          `Falha CRÍTICA ao aplicar PII extension — abortando boot para evitar ` +
            `persistência em plaintext: ${(err as Error).message}`
        );
      }
      // Em dev: apenas log + continua (para não atrapalhar onboarding).
      this.logger.error(
        `Falha ao aplicar PII extension: ${(err as Error).message}. ` +
          `Campos PII serão persistidos em plaintext.`
      );
    }
  }

  async onModuleInit() {
    await this.$connect();
    if (!this.piiCrypto.isEnabled()) {
      this.logger.warn(
        'PII_ENCRYPTION_KEY não configurada — campos PII em plaintext. Defina antes de produção.'
      );
      return;
    }

    if (this.piiApplied) {
      this.logger.log('PII encryption extension aplicada ao Prisma');
      return;
    }

    // Só chega aqui se a aplicação no construtor falhou em dev (em
    // prod/staging teria abortado o boot). Retentamos para dar uma
    // segunda chance antes de operar sem proteção.
    this.aplicarExtensaoPii();
    if (this.piiApplied) {
      this.logger.log('PII encryption extension aplicada ao Prisma');
    }
  }

  /**
   * Auditoria P0-06: executa `callback` dentro de uma transação cujo `tx`
   * tem a extension de PII garantidamente aplicada.
   *
   * **Use este método em vez de `getExtendedClient()` dentro de um
   * `$transaction`.** O client devolvido por `getExtendedClient()` tem
   * conexão própria: escritas feitas por ele **não participam da
   * transação** e **não sofrem rollback** se o callback lançar depois.
   *
   * ```ts
   * // ❌ ERRADO — escreve fora da transação, sem rollback
   * await this.prisma.$transaction(async (tx) => {
   *   const ext = this.prisma.getExtendedClient();
   *   return ext.usersProfile.create({ data: { name } });
   * });
   *
   * // ✅ CORRETO — encriptado E atômico
   * await this.prisma.withEncryptedTransaction(async (tx) => {
   *   return tx.usersProfile.create({ data: { name } });
   * });
   * ```
   *
   * @param callback Recebe o `tx` já estendido.
   * @param opcoes   Repassadas ao `$transaction` (isolationLevel, timeout...).
   */
  withEncryptedTransaction<T>(
    callback: (tx: TransacaoPiiClient) => Promise<T>,
    opcoes?: OpcoesTransacaoPii
  ): Promise<T> {
    return comTransacaoEncriptada(this, this.piiCrypto, callback, opcoes);
  }

  /**
   * Retorna o client Prisma com a extension de PII aplicada como **Proxy**.
   *
   * ⚠️ **NÃO use dentro de um callback de `$transaction`** — o client
   * retornado abre conexão própria e suas escritas ficam **fora** da
   * transação (sem rollback). Para esse caso, use
   * {@link withEncryptedTransaction}.
   *
   * Uso legítimo: obter um client estendido fora de qualquer transação,
   * quando o caller tem apenas uma referência genérica a `PrismaClient`.
   * Na prática, com a extension aplicada no construtor, os delegates de
   * `this` já passam pela encriptação — este método permanece por
   * compatibilidade com call sites existentes.
   */
  getExtendedClient(): PiiPrismaClient {
    // CRIT-003 (2ª varredura QA): retorno de `$extends(...)` não é
    // `PrismaClient` — é um tipo dinâmico. O tipo correto é exportado
    // de `pii-prisma.extension.ts` como `PiiPrismaClient` e preserva
    // os delegates tipados.
    return this.$extends(createPiiPrismaExtension(this.piiCrypto)) as PiiPrismaClient;
  }

  /**
   * Auditoria L-NEW-04: bloqueia `$queryRaw` que toca models PII.
   * Heurística: regex no nome da tabela (FROM/UPDATE/JOIN/INTO).
   * Para PII_PROTECTED_MODELS, lançar antes de chegar ao banco.
   *
   * CRIT-004 (2ª varredura QA): o tipo de retorno DEVE ser `PrismaPromise<T>`
   * (não `Promise<T>`) para preservar o contrato de `$transaction(array)`.
   * PrismaPromise é o que habilita chain de transações com delegates tipados.
   */
  override $queryRaw<T = unknown>(
    query: TemplateStringsArray | Prisma.Sql,
    ...values: unknown[]
  ): Prisma.PrismaPromise<T> {
    const sql = Array.isArray(query)
      ? query.join('')
      : ((query as Prisma.Sql).sql ?? String(query));
    const modelHint = detectRawQueryModel(sql);
    if (modelHint && PII_PROTECTED_MODELS.has(modelHint)) {
      throw new Error(
        `[PII] $queryRaw contra '${modelHint}' é proibida — use delegates tipados ` +
          `(findUnique/update/etc) que passam pela encriptação automática.`
      );
    }
    // Auditoria ACHADO-N29 (Re-varredura 9): `query as never` + cast duplo
    // mascarava intenção. Prisma's $queryRaw tem sobrecarga complexa
    // (TemplateStringsArray vs Sql) — a coerção `as never` é a forma
    // oficial de normalizar antes de delegar. Mantemos mas adicionamos
    // comentário explicando o porquê (em vez de flag "isso é seguro").
    return super.$queryRaw(query as TemplateStringsArray & Prisma.Sql, ...(values as never[]));
  }

  override $executeRaw(query: TemplateStringsArray | Prisma.Sql): Prisma.PrismaPromise<number> {
    const sql = Array.isArray(query)
      ? query.join('')
      : ((query as Prisma.Sql).sql ?? String(query));
    const modelHint = detectRawQueryModel(sql);
    if (modelHint && PII_PROTECTED_MODELS.has(modelHint)) {
      throw new Error(
        `[PII] $executeRaw contra '${modelHint}' é proibida — use delegates tipados ` +
          `que passam pela encriptação automática.`
      );
    }
    return super.$executeRaw(query as never);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
