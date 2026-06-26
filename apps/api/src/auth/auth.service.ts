import * as crypto from 'crypto';

import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { piiHash } from '../common/logger/pii-mask';
import { PrismaService } from '../common/prisma.service';
import { PASSWORD_RESET_TTL_MS } from '../common/constants/time';
import { EmailQueue } from '../queues/email.queue';

import { RefreshTokenService } from './refresh-token.service';

// ─── Requisitos de senha forte ────────────────────────────────────────────────
const SENHA_MIN_CARACTERES = 8;
const SENHA_REGEX_FORCA = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

// `PASSWORD_RESET_TTL_MS` importado de `common/constants/time.ts`.

/**
 * Cost factor do bcrypt. 12 é o mínimo recomendado para 2026
 * (NIST SP 800-63B + benchmarks de defesa contra GPU/ASIC).
 */
const BCRYPT_COST = 12;

/**
 * Cache LRU para HIBP — evita bater na API externa a cada signup.
 *
 * Auditoria B2: limite de 256 entradas (suficiente para um pool razoável de
 * senhas testadas).
 *
 * Auditoria ACHADO-14 (Re-varredura 5): implementação LRU **real** (não FIFO).
 * Antes, o Map fazia eviction da primeira chave inserida — senhas testadas
 * mais recentemente (mas há muito tempo) permaneciam na frente. Agora um
 * `Set` mantém a ordem de acesso e `get`/`set` promovem a chave para o fim;
 * quando `size >= MAX`, a chave do **início** é removida (a menos
 * recentemente usada). Isso reflete melhor o uso real: senhas em tentativas
 * repetidas (e.g. brute force de uma única senha) devem hit cache, e
 * senhas únicas que só foram testadas uma vez devem ser evictadas primeiro.
 *
 * O TTL de 1h (HIBP_CACHE_TTL_MS) é verificado no `get` — entradas
 * expiradas são removidas e a request cai na API novamente.
 */
const HIBP_CACHE_MAX = 256;
const HIBP_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora
const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/';

/**
 * Entrada do cache. `expiresAt` em epoch ms (mais barato de comparar que Date).
 */
interface HibpCacheEntry {
  breached: boolean;
  expiresAt: number;
}

const hibpCacheMap = new Map<string, HibpCacheEntry>();

// ─── Login account lockout (auditoria ACHADO-N27 Re-varredura 9) ────────
/**
 * Cache LRU em memória para contar tentativas falhas de login POR EMAIL
 * (não por IP — throttler global já cobre IP).
 *
 * - Após `LOGIN_LOCKOUT_THRESHOLD` (5) falhas consecutivas dentro de
 *   `LOGIN_LOCKOUT_WINDOW_MS` (15 min), emails subsequentes retornam
 *   `UnauthorizedException` sem checar senha (defesa contra password
 *   spraying e credential stuffing).
 * - Lock expira após `LOGIN_LOCKOUT_DURATION_MS` (15 min) — janela igual
 *   ao de acumulação: usuário legítimo que errou senha 5x espera 15 min
 *   e tenta novamente.
 * - Sucesso no login reseta o contador (implementado em `login`).
 * - Cache compartilhado entre instâncias: aceitável porque a memória é
 *   por processo. Em produção com múltiplas réplicas, considerar Redis
 *   para coordenação — mas o throttler IP já mitiga a maioria dos
 *   ataques automatizados; este lockout é camada extra contra tentativas
 *   distribuídas no mesmo email.
 *
 * LRU real: hibpCacheTouch já implementa o pattern; replicamos aqui.
 */
const LOGIN_LOCKOUT_THRESHOLD = 5;
const LOGIN_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const LOGIN_LOCKOUT_MAX_ENTRIES = 10_000;

interface LoginAttemptEntry {
  failures: number;
  firstFailureAt: number; // epoch ms da 1ª falha dentro da janela
  lockedUntil: number; // epoch ms (0 = não bloqueado)
}
const loginAttemptsMap = new Map<string, LoginAttemptEntry>();

function loginAttemptsTouch(key: string): LoginAttemptEntry | undefined {
  const value = loginAttemptsMap.get(key);
  if (value === undefined) return undefined;
  loginAttemptsMap.delete(key);
  loginAttemptsMap.set(key, value);
  return value;
}

function loginAttemptsGet(key: string): LoginAttemptEntry | undefined {
  const value = loginAttemptsMap.get(key);
  if (value === undefined) return undefined;
  const now = Date.now();
  // Se lock expirou, evict.
  if (value.lockedUntil > 0 && value.lockedUntil <= now) {
    loginAttemptsMap.delete(key);
    return undefined;
  }
  // Se a janela de falhas expirou (sem ter virado lock), reseta contador.
  if (value.lockedUntil === 0 && now - value.firstFailureAt > LOGIN_LOCKOUT_WINDOW_MS) {
    loginAttemptsMap.delete(key);
    return undefined;
  }
  loginAttemptsTouch(key);
  return value;
}

function loginAttemptsRecordFailure(key: string): LoginAttemptEntry | undefined {
  const now = Date.now();
  const existing = loginAttemptsGet(key);
  let entry: LoginAttemptEntry;
  if (!existing) {
    entry = { failures: 1, firstFailureAt: now, lockedUntil: 0 };
  } else {
    entry = {
      failures: existing.failures + 1,
      firstFailureAt: existing.firstFailureAt,
      lockedUntil: 0,
    };
    if (entry.failures >= LOGIN_LOCKOUT_THRESHOLD) {
      entry.lockedUntil = now + LOGIN_LOCKOUT_DURATION_MS;
    }
  }
  loginAttemptsMap.set(key, entry);
  // Evict LRU enquanto estourar o limite.
  while (loginAttemptsMap.size > LOGIN_LOCKOUT_MAX_ENTRIES) {
    const lruKey = loginAttemptsMap.keys().next().value;
    if (lruKey === undefined) break;
    loginAttemptsMap.delete(lruKey);
  }
  return entry;
}

function loginAttemptsReset(key: string): void {
  loginAttemptsMap.delete(key);
}

/**
 * Promove a chave para "mais recentemente usada" — re-insert no Map
 * (Map preserva ordem de inserção, então delete+set move pro fim).
 */
function hibpCacheTouch(key: string): HibpCacheEntry | undefined {
  const value = hibpCacheMap.get(key);
  if (value === undefined) return undefined;
  hibpCacheMap.delete(key);
  hibpCacheMap.set(key, value);
  return value;
}

function hibpCacheGet(key: string): HibpCacheEntry | undefined {
  const value = hibpCacheMap.get(key);
  if (value === undefined) return undefined;
  // Expirada — evict on read.
  if (value.expiresAt <= Date.now()) {
    hibpCacheMap.delete(key);
    return undefined;
  }
  hibpCacheTouch(key);
  return value;
}

function hibpCacheSet(key: string, entry: HibpCacheEntry): void {
  // Se já existe, evicta e reinsere para mover pro fim.
  if (hibpCacheMap.has(key)) {
    hibpCacheMap.delete(key);
  }
  hibpCacheMap.set(key, entry);
  // Evict LRU enquanto estourar o limite.
  while (hibpCacheMap.size > HIBP_CACHE_MAX) {
    const lruKey = hibpCacheMap.keys().next().value;
    if (lruKey === undefined) break;
    hibpCacheMap.delete(lruKey);
  }
}

// ─── Helpers privados (top-level para reuso e testabilidade) ────────────────

/**
 * Verifica se a senha apareceu em vazamentos públicos via HIBP (k-anonymity).
 * Envia apenas os 5 primeiros caracteres do SHA-1 — a senha nunca sai do servidor.
 *
 * Fail-open em caso de outage da HIBP (não bloqueia signup por causa de
 * dependência externa indisponível). Recebe um logger para auditoria
 * estruturada (auditoria A10 — antes usava hack `Logger.prototype.warn?.call`).
 */
async function senhaFoiVazada(senha: string, logger: Logger): Promise<boolean> {
  const sha1 = crypto.createHash('sha1').update(senha).digest('hex').toUpperCase();
  const cacheKey = sha1.slice(0, 5) + ':' + sha1.slice(5);

  const cached = hibpCacheGet(cacheKey);
  if (cached !== undefined) {
    return cached.breached;
  }

  try {
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    const res = await fetch(HIBP_RANGE_URL + prefix, {
      headers: { 'User-Agent': 'pedi-ai-api/1.0' },
      // Timeout para não pendurar request indefinidamente.
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) return false;
    const text = await res.text();
    const breached = text.split('\n').some((line) => {
      const [s, count] = line.trim().split(':');
      return s === suffix && Number(count) > 0;
    });

    hibpCacheSet(cacheKey, {
      breached,
      expiresAt: Date.now() + HIBP_CACHE_TTL_MS,
    });
    return breached;
  } catch (err) {
    // Fail-open: outage da HIBP não deve bloquear signup.
    logger.warn(`Falha ao consultar HIBP (fail-open): ${(err as Error).message}`);
    return false;
  }
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  restaurantId?: string | null;
}

export interface AuthResponse {
  /** camelCase canônico (B1). */
  accessToken: string;
  refreshToken: string;
  /** Aliases snake_case para compatibilidade com frontends legados. */
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    restaurantId?: string | null;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
    private emailQueue: EmailQueue
  ) {}

  /**
   * Validação de força de senha (composição + breach check).
   * Auditoria A10: é método da classe (não top-level) para usar
   * `this.logger` na auditoria de falhas HIBP.
   */
  private async validarForcaSenha(senha: string): Promise<void> {
    if (senha.length < SENHA_MIN_CARACTERES) {
      throw new BadRequestException(`Senha deve ter no mínimo ${SENHA_MIN_CARACTERES} caracteres`);
    }
    if (!SENHA_REGEX_FORCA.test(senha)) {
      throw new BadRequestException(
        'Senha deve conter pelo menos 1 letra maiúscula, 1 número e 1 caractere especial'
      );
    }
    if (await senhaFoiVazada(senha, this.logger)) {
      throw new BadRequestException(
        'Esta senha apareceu em vazamentos públicos conhecidos. Escolha outra.'
      );
    }
  }

  async register(data: { email: string; password: string; name: string }) {
    await this.validarForcaSenha(data.password);

    const existing = await this.prisma.usersProfile.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('Este email já está cadastrado');
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_COST);

    const user = await this.prisma.usersProfile.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: 'cliente' as UserRole,
      },
    });

    return this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      restaurantId: user.restaurantId ?? null,
    });
  }

  async login(data: { email: string; password: string }) {
    // Auditoria ACHADO-N27 (Re-varredura 9): account lockout baseado em
    // contagem de falhas por email. Chave do cache é hash do email —
    // evita logar PII e mantém keys opacas em caso de memory dump.
    const lockoutKey = `login:${piiHash(data.email)}`;

    // Verifica lock ANTES de bater no banco (evita timing oracle).
    const existing = loginAttemptsGet(lockoutKey);
    if (existing && existing.lockedUntil > 0 && existing.lockedUntil > Date.now()) {
      this.logger.warn(
        `metric=login.account_locked emailHash=${piiHash(data.email)} ` +
          `failures=${existing.failures} retryAfterMs=${existing.lockedUntil - Date.now()}`
      );
      throw new UnauthorizedException('Email ou senha incorretos');
    }

    const user = await this.prisma.usersProfile.findUnique({
      where: { email: data.email },
    });

    if (!user || !user.passwordHash) {
      // Mensagem genérica para evitar enumeração de emails.
      // Registra falha mesmo para email inexistente — mesma defesa que
      // para email existente (impede enumeração via timing).
      loginAttemptsRecordFailure(lockoutKey);
      throw new UnauthorizedException('Email ou senha incorretos');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      const updated = loginAttemptsRecordFailure(lockoutKey);
      if (updated.lockedUntil > 0) {
        this.logger.warn(
          `metric=login.account_locked_triggered emailHash=${piiHash(data.email)} ` +
            `failures=${updated.failures}`
        );
      }
      throw new UnauthorizedException('Email ou senha incorretos');
    }

    // Sucesso: reset do contador.
    loginAttemptsReset(lockoutKey);

    return this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      restaurantId: user.restaurantId ?? null,
    });
  }

  /**
   * Troca um refresh token válido por um novo par (access + refresh).
   * Implementa **rotação**: o token apresentado é revogado e um novo é emitido
   * na mesma família. Reuso de token revogado invalida toda a família.
   *
   * Auditoria M7: `validateAndRotate` agora retorna `tokenId` —
   * eliminamos 1 query (findUnique do presented) e 1 hash duplicado.
   */
  async refresh(refreshToken: string) {
    const { userId, familyId, tokenId } =
      await this.refreshTokenService.validateAndRotate(refreshToken);

    const user = await this.prisma.usersProfile.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // Emite novo token na mesma família e revoga o presented (tokenId já conhecido).
    const issued = await this.refreshTokenService.issue(user.id, { familyId });
    await this.refreshTokenService.revoke(tokenId, issued.tokenId);

    // Auditoria ACHADO-N24 (Re-varredura 9): extraído para `signAccessToken`
    // — antes, este bloco duplicava o pattern de `generateTokens` (mesmo
    // iss/aud/env). DRY violation: evoluir para RS256 ou adicionar `kid`
    // exigiria atualizar 2 lugares.
    const accessToken = this.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId ?? null,
    });

    // Auditoria B1: emite ambos formatos (camel + snake) para compatibilidade.
    return {
      accessToken,
      refreshToken: issued.token,
      access_token: accessToken,
      refresh_token: issued.token,
    };
  }

  async logout(
    refreshToken: string | undefined,
    requesterUserId: string
  ): Promise<{ success: true }> {
    // Auditoria ACHADO-N5 (Re-varredura 8): antes, logout aceitava
    // refresh_token arbitrário do body e revogava todos os tokens do user
    // decodificado. Atacante autenticado poderia passar o refresh_token de
    // OUTRO usuário (vazado via XSS/logs/CSRF) e derrubar a sessão da
    // vítima — DoS + mascaramento de audit trail. Agora: comparar
    // `userId` extraído do token com o `requesterUserId` do JWT antes de
    // revogar. Mismatch → 403.
    if (refreshToken) {
      try {
        const { userId } = await this.refreshTokenService.validateAndRotate(refreshToken);
        if (userId !== requesterUserId) {
          // Token apresentado não pertence ao usuário autenticado —
          // situação anômala. Logamos para auditoria (sem expor o token).
          this.logger.warn(
            `[logout] tentativa de revogar refresh_token alheio (requesterUserId=${piiHash(requesterUserId)}, tokenUserId=${piiHash(userId)})`
          );
          throw new ForbiddenException('Refresh token não pertence ao usuário autenticado');
        }
        await this.refreshTokenService.revokeAllForUser(userId, 'user_logout');
      } catch (err) {
        if (err instanceof ForbiddenException) throw err;
        // Token inválido/expirado já revogado ou nunca existiu — não é
        // erro (idempotência de logout). Silencioso.
      }
    }
    return { success: true };
  }

  async validateUser(payload: {
    sub: string;
    email: string;
    role: string;
    restaurantId?: string | null;
  }) {
    const user = await this.prisma.usersProfile.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      restaurantId: user.restaurantId ?? payload.restaurantId ?? null,
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.usersProfile.findUnique({
      where: { email },
    });

    // Resposta genérica sempre — evita enumeração de emails.
    if (!user) {
      return { message: 'Se o email existir, um link de recuperação será enviado' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await this.prisma.passwordResetToken.create({
      data: {
        token: tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    // Enfileira envio do e-mail com o token opaco (auditoria A3).
    // URL de reset é construída a partir de variáveis de ambiente.
    //
    // Auditoria ACHADO-N9 (Re-varredura 8): token estava em query string,
    // que vaza em logs de proxy/CDN, header Referer se o usuário clicar
    // em link externo pós-reset, histórico de navegador/email servers que
    // logam URLs (Gmail/Outlook). Agora: token no FRAGMENTO (#token),
    // que NUNCA vai em Referer nem em logs HTTP. O front-end extrai o
    // fragmento com `new URL(...).hash` e envia via POST /auth/reset-password
    // (body, nunca URL).
    const baseUrl = process.env.APP_PUBLIC_URL ?? 'http://localhost:3000';
    const resetLink = `${baseUrl}/auth/reset-password#token=${token}`;
    await this.emailQueue.sendPasswordReset(email, resetLink);

    // ⚠️ SEGURANÇA: nunca logar tokens ou PII (email) — antes logava o email
    // em texto puro. Auditoria ACHADO-3 (Re-varredura 5): viola LGPD Art. 46
    // e princípio de minimização. Agora loga apenas hash truncado para
    // correlação operacional sem expor o email em si.
    // Auditoria A3 também: nunca logar tokens.
    const emailHash = crypto.createHash('sha256').update(email).digest('hex').slice(0, 12);
    this.logger.warn(
      `Password reset solicitado (emailHash=${emailHash}) — token gerado (NÃO logado). ` +
        `Email enfileirado.`
    );

    return { message: 'Se o email existir, um link de recuperação será enviado' };
  }

  async resetPassword(data: { token: string; newPassword: string }) {
    await this.validarForcaSenha(data.newPassword);

    const tokenHash = crypto.createHash('sha256').update(data.token).digest('hex');

    // Auditoria A-04: claim atômico do token via `updateMany` com `where: { used: false }`.
    // Sem isso, duas requests com o mesmo token válido em paralelo passariam
    // o `findFirst` e executariam o `$transaction` — vetor de DoS + last-write-wins
    // silencioso na senha. Aqui, se `count === 0` o token já foi consumido ou
    // é inválido. O `include: { user: true }` é recuperado separadamente.
    const claimed = await this.prisma.passwordResetToken.updateMany({
      where: {
        token: tokenHash,
        used: false,
        expiresAt: { gt: new Date() },
      },
      data: { used: true },
    });
    if (claimed.count === 0) {
      throw new BadRequestException('Token inválido, expirado ou já utilizado');
    }

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: { token: tokenHash },
      select: { userId: true },
    });
    if (!resetToken) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    const passwordHash = await bcrypt.hash(data.newPassword, BCRYPT_COST);

    await this.prisma.$transaction([
      this.prisma.usersProfile.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      // Invalida todos os refresh tokens ativos (forçar re-login).
      this.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'password_reset' },
      }),
    ]);

    return { message: 'Senha redefinida com sucesso' };
  }

  private async generateTokens(payload: {
    id: string;
    email: string;
    role: string;
    name: string;
    restaurantId?: string | null;
  }): Promise<AuthResponse> {
    // Auditoria ACHADO-N24 (Re-varredura 9): usa `signAccessToken` para
    // centralizar iss/aud/env (mesmo padrão do `refresh`).
    const accessToken = this.signAccessToken({
      sub: payload.id,
      email: payload.email,
      role: payload.role,
      restaurantId: payload.restaurantId ?? null,
    });

    const refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshTokenSecret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }

    // Refresh token: agora armazenado como hash no DB (rotação + revogação).
    const issued = await this.refreshTokenService.issue(payload.id);

    // Auditoria B1: padroniza em camelCase (`accessToken`/`refreshToken`).
    // Mantém `access_token`/`refresh_token` como alias para compatibilidade
    // com frontends legados — remova após migração completa do front.
    return {
      accessToken,
      refreshToken: issued.token,
      access_token: accessToken,
      refresh_token: issued.token,
      user: {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        restaurantId: payload.restaurantId ?? null,
      },
    };
  }

  /**
   * Emite o access token JWT incluindo iss/aud quando configurados via env.
   * Auditoria ACHADO-N24 (Re-varredura 9): centraliza a lógica de assinatura
   * do access token. Antes, `generateTokens` e `refresh` tinham blocos
   * duplicados de `iss`/`aud`/env — DRY violation. Agora ambos chamam este
   * método, e evoluções futuras (RS256, kid, jti) ficam em um único lugar.
   */
  private signAccessToken(payload: {
    sub: string;
    email: string;
    role: string;
    restaurantId: string | null;
  }): string {
    // Auditoria ACHADO-28 (Re-varredura 6): incluir `iss`/`aud` ao emitir o
    // JWT quando configurados via env. Sem iss/aud, um secret compartilhado
    // entre dois sistemas permite que tokens emitidos por um sejam aceitos
    // pelo outro (cenário de monorepo ou migração).
    const issuer = process.env.JWT_ISSUER;
    const audience = process.env.JWT_AUDIENCE;
    return this.jwtService.sign(payload, {
      ...(issuer ? { issuer } : {}),
      ...(audience ? { audience } : {}),
    });
  }
}
