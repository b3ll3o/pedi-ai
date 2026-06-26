import * as crypto from 'crypto';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * PII encryption at-rest.
 *
 * Algoritmo: AES-256-GCM autenticado.
 *  - `iv` (12 bytes) por ciphertext — random nonce.
 *  - `authTag` (16 bytes) — autenticação GCM.
 *  - Key derivation: se `PII_ENCRYPTION_KEY` for hex (64 chars), usa direto;
 *    caso contrário, deriva com SHA-256 da string.
 *
 * Formato do ciphertext: `v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>`.
 * O prefixo `v1:` permite rotação futura para `v2:`.
 *
 * Onde aplicar:
 *  - `UsersProfile.name` — PII direta.
 *  - `Restaurant.phone` — PII direta.
 *  - `Restaurant.address` — PII direta.
 *  - `email` permanece em plaintext (necessário para lookup de login).
 *    Se a LGPD exigir email at-rest criptografado, adicionaremos
 *    `emailHash` (HMAC-SHA256 determinístico) para lookup + email
 *    criptografado para display. Fora de escopo deste batch.
 *
 * Por que app-level (e não pgcrypto)?
 *  - Portável (qualquer Postgres, qualquer cloud).
 *  - Permite re-criptografar com nova chave sem SQL.
 *  - Não dependemos de extensões de servidor.
 *  - GCM dá AEAD: tampering é detectado e o read falha.
 *
 * Risco residual: se logs dumparem o valor antes da criptografia, ele
 * vaza. Mitigação: nunca logar PII em plaintext (verificar logger usage).
 */
@Injectable()
export class PiiCryptoService implements OnModuleInit {
  private readonly logger = new Logger(PiiCryptoService.name);
  private masterKey: Buffer | null = null;

  // Versão do esquema. Incrementar quando o formato mudar para suportar
  // múltiplas versões durante rotação.
  static readonly VERSION = 'v1';

  // Campos que devem ser criptografados antes de persistir / descriptografados
  // ao ler. O Prisma extension usa este registro.
  //
  // Auditoria ACHADO-N16 (Re-varredura 9): `order.customerPhone`,
  // `customerName`, `customerEmail` são PII direta em plaintext. Cleanup
  // de 90 dias (N7+N8) cobre só `cancelled`/`pending_payment`; pedidos
  // pagos ficam 5 anos (fiscal) — vetor LGPD Art. 46. Agora registrados
  // aqui para criptografia at-rest, complementado pelo job de redação
  // (N40) que anonimiza após 5 anos.
  private static readonly ENCRYPTED_FIELDS = new Map<string, Set<string>>([
    ['usersProfile', new Set(['name'])],
    ['restaurant', new Set(['phone', 'address'])],
    ['order', new Set(['customerPhone', 'customerName', 'customerEmail'])],
  ]);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const raw = this.configService.get<string>('PII_ENCRYPTION_KEY');
    if (!raw) {
      // Auditoria ACHADO-N2 (Re-varredura 8): em produção/staging a falta
      // de PII_ENCRYPTION_KEY era apenas warn e seguia em plaintext
      // silenciosamente — falha de LGPD grave. Agora: fail-CLOSED em
      // prod/staging (boot aborta), warn em dev (UX preservada).
      const isStrict = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
      if (isStrict) {
        throw new Error(
          'PII_ENCRYPTION_KEY obrigatória em produção/staging. Sem ela, PII seria ' +
            'persistido em plaintext (LGPD Art. 46). Configure antes de subir.'
        );
      }
      this.logger.warn(
        'PII_ENCRYPTION_KEY não configurada — campos PII serão persistidos em plaintext. Configure antes de produção.'
      );
      return;
    }
    // Validação de força mínima da chave (32+ chars = 256 bits).
    if (raw.length < 32) {
      const isStrict = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
      if (isStrict) {
        throw new Error(
          `PII_ENCRYPTION_KEY muito curta (${raw.length} chars, mínimo 32). Use uma chave ` +
            'criptograficamente segura (32+ chars aleatórios).'
        );
      }
      this.logger.warn(
        `PII_ENCRYPTION_KEY tem apenas ${raw.length} chars — recomendado ≥32 para AES-256.`
      );
    }
    this.masterKey = this.deriveKey(raw);
    this.logger.log('PII encryption ativada (AES-256-GCM)');
  }

  private deriveKey(raw: string): Buffer {
    // Se for hex de 64 chars (32 bytes), usa direto. Caso contrário, deriva
    // com SHA-256 para garantir 32 bytes estáveis.
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
      return Buffer.from(raw, 'hex');
    }
    return crypto.createHash('sha256').update(raw, 'utf8').digest();
  }

  /**
   * Indica se o serviço está armado. Em dev/test sem chave, retorna false
   * e os métodos encrypt/decrypt operam como no-op (compatibilidade).
   */
  isEnabled(): boolean {
    return this.masterKey !== null;
  }

  encrypt(plaintext: string | null | undefined): string | null {
    if (plaintext === null || plaintext === undefined) return null;
    if (plaintext === '') return '';
    if (!this.masterKey) {
      // Sem chave: persiste como sentinel para deixar claro que é plaintext
      // intencional. Em produção, falharia; em dev, facilita testes.
      return plaintext;
    }
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [
      PiiCryptoService.VERSION,
      iv.toString('hex'),
      authTag.toString('hex'),
      ciphertext.toString('hex'),
    ].join(':');
  }

  decrypt(blob: string | null | undefined): string | null {
    if (blob === null || blob === undefined) return null;
    if (blob === '') return '';
    if (!this.masterKey) {
      return blob;
    }
    const parts = blob.split(':');
    if (parts.length !== 4 || parts[0] !== PiiCryptoService.VERSION) {
      // Não está no formato esperado — pode ser plaintext legado. Logamos
      // uma única vez por processo para evitar spam.
      this.logger.warn('Valor PII em formato inesperado — retornando como plaintext');
      return blob;
    }
    const [, ivHex, tagHex, ctHex] = parts;
    try {
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(tagHex, 'hex');
      const ct = Buffer.from(ctHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
      decipher.setAuthTag(authTag);
      const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
      return plaintext.toString('utf8');
    } catch (err) {
      this.logger.error(
        `Falha ao decriptar PII (possível tampering ou chave errada): ${(err as Error).message}`
      );
      return null;
    }
  }

  /**
   * Indica se um campo de uma model é PII criptografado.
   */
  static isEncryptedField(model: string, field: string): boolean {
    return PiiCryptoService.ENCRYPTED_FIELDS.get(model)?.has(field) ?? false;
  }

  /**
   * Lista os campos PII de uma model. Usado pelo Prisma extension.
   */
  static getEncryptedFields(model: string): Set<string> {
    return PiiCryptoService.ENCRYPTED_FIELDS.get(model) ?? new Set();
  }

  /**
   * Registra um novo campo como PII criptografado. Útil para testes ou
   * para campos dinâmicos.
   */
  static registerEncryptedField(model: string, field: string): void {
    if (!PiiCryptoService.ENCRYPTED_FIELDS.has(model)) {
      PiiCryptoService.ENCRYPTED_FIELDS.set(model, new Set());
    }
    PiiCryptoService.ENCRYPTED_FIELDS.get(model)!.add(field);
  }
}
