import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

import {
  createPiiPrismaExtension,
  detectRawQueryModel,
  PII_PROTECTED_MODELS,
} from './pii-prisma.extension';
import { PiiCryptoService } from './pii-crypto.service';

/**
 * PrismaService que aplica a extensão de PII encryption.
 *
 * **Auditoria M11** — mudanças vs. versão anterior:
 *
 * 1. **FAIL LOUD em produção/staging se a extensão falhar** — antes, o
 *    serviço continuava rodando sem PII (apenas log de erro). Em
 *    produção, isso significa que dados novos seriam persistidos em
 *    plaintext silenciosamente — risco sério de LGPD/GDPR.
 *
 * 2. **Guard em `$queryRaw`/`$executeRaw` para models PII** (L-NEW-04) —
 *    a API de extensions do Prisma (`$allModels.$allOperations`) intercepta
 *    apenas delegates de modelo (`this.user.findMany`, `this.order.create`,
 *    etc.). `$queryRaw`/`$executeRaw` passam **sem** encriptação automática.
 *    Aqui, **bloqueamos** raw queries que tocam models PII (`UsersProfile`)
 *    — heurística simples baseada em regex do nome da tabela. False
 *    negatives são aceitos (em produção, monitoring cobre), mas
 *    **tentativas óbvias** de ler/escrever PII via SQL cru falham alto.
 *
 * 3. **Mantém `Object.assign` como trade-off pragmático** — a alternativa
 *    "pura" exigiria refatorar todos os call sites para usar
 *    `this.extendedClient.user.findMany(...)`. Para evitar um patch
 *    invasivo em 30+ arquivos, aceitamos o trade-off conhecido (PII via
 *    raw SQL exige cuidado manual) e tornamos o risco visível via logs.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private piiApplied = false;

  constructor(private readonly piiCrypto: PiiCryptoService) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    if (!this.piiCrypto.isEnabled()) {
      this.logger.warn(
        'PII_ENCRYPTION_KEY não configurada — campos PII em plaintext. Defina antes de produção.'
      );
      return;
    }

    try {
      const extended = this.$extends(createPiiPrismaExtension(this.piiCrypto));
      // Copia delegates do proxy estendido para esta instância, para que
      // chamadas diretas a `this.user.findMany()` passem pela extensão.
      Object.assign(this, extended);
      this.piiApplied = true;
      this.logger.log('PII encryption extension aplicada ao Prisma');
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

  /**
   * Auditoria L-NEW-04: bloqueia `$queryRaw` que toca models PII.
   * Heurística: regex no nome da tabela (FROM/UPDATE/JOIN/INTO).
   * Para PII_PROTECTED_MODELS, lançar antes de chegar ao banco.
   */
  override $queryRaw<T = unknown>(
    query: TemplateStringsArray | Prisma.Sql,
    ...values: unknown[]
  ): Promise<T> {
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
    return super.$queryRaw(query as never, ...(values as never[])) as unknown as Promise<T>;
  }

  override $executeRaw(query: TemplateStringsArray | Prisma.Sql): Promise<number> {
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
