import * as crypto from 'crypto';

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../common/prisma.service';
import { EmailQueue } from '../queues/email.queue';

import { RefreshTokenService } from './refresh-token.service';

// ─── Requisitos de senha forte ────────────────────────────────────────────────
const SENHA_MIN_CARACTERES = 8;
const SENHA_REGEX_FORCA = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

/**
 * Cost factor do bcrypt. 12 é o mínimo recomendado para 2026
 * (NIST SP 800-63B + benchmarks de defesa contra GPU/ASIC).
 */
const BCRYPT_COST = 12;

/**
 * Cache LRU simples para HIBP — evita bater na API externa a cada signup.
 * Limite: 256 entradas (suficiente para um pool razoável de senhas testadas).
 * Auditoria B2.
 */
const HIBP_CACHE = new Map<string, { breached: boolean; expiresAt: number }>();
const HIBP_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora
const HIBP_CACHE_MAX = 256;
const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/';

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

  const cached = HIBP_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
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

    if (HIBP_CACHE.size >= HIBP_CACHE_MAX) {
      // Eviction simples: remove a primeira entrada.
      const firstKey = HIBP_CACHE.keys().next().value;
      if (firstKey !== undefined) HIBP_CACHE.delete(firstKey);
    }
    HIBP_CACHE.set(cacheKey, {
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
    const user = await this.prisma.usersProfile.findUnique({
      where: { email: data.email },
    });

    if (!user || !user.passwordHash) {
      // Mensagem genérica para evitar enumeração de emails.
      throw new UnauthorizedException('Email ou senha incorretos');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou senha incorretos');
    }

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

    const accessToken = this.jwtService.sign({
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

  async logout(refreshToken: string | undefined): Promise<{ success: true }> {
    if (refreshToken) {
      try {
        const { userId } = await this.refreshTokenService.validateAndRotate(refreshToken);
        await this.refreshTokenService.revokeAllForUser(userId, 'user_logout');
      } catch {
        // Token inválido — logout idempotente.
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
    const expiresAt = new Date(Date.now() + 3600000); // 1 hora

    await this.prisma.passwordResetToken.create({
      data: {
        token: tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    // Enfileira envio do e-mail com o token opaco (auditoria A3).
    // URL de reset é construída a partir de variáveis de ambiente.
    const baseUrl = process.env.APP_PUBLIC_URL ?? 'http://localhost:3000';
    const resetLink = `${baseUrl}/auth/reset-password?token=${token}`;
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
    const accessToken = this.jwtService.sign({
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
}
