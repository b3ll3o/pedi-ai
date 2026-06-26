import * as crypto from 'crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../common/prisma.service';

/**
 * Service responsável pela rotação e revogação de refresh tokens.
 *
 * Política:
 * - Cada refresh emite um novo token e revoga o anterior (substituição em cadeia).
 * - Tokens são armazenados como **hash SHA-256** (nunca plain).
 * - Reuso de token revogado → invalida toda a família (possível roubo).
 * - Refresh tokens têm expiração de 7 dias; tokens revogados não podem ser usados.
 */
@Injectable()
export class RefreshTokenService {
  /** Duração padrão: 7 dias em ms. */
  static readonly DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria um refresh token novo para o usuário. Retorna o token **plain** (a ser
   * enviado ao cliente); o hash é o que persiste no banco.
   */
  async issue(
    userId: string,
    options: { familyId?: string; ttlMs?: number } = {}
  ): Promise<{ token: string; tokenId: string; familyId: string; expiresAt: Date }> {
    const tokenPlain = crypto.randomBytes(48).toString('base64url');
    const tokenHash = this.hash(tokenPlain);
    const familyId = options.familyId ?? crypto.randomUUID();
    const ttlMs = options.ttlMs ?? RefreshTokenService.DEFAULT_TTL_MS;
    const expiresAt = new Date(Date.now() + ttlMs);

    const record = await this.prisma.refreshToken.create({
      data: { userId, tokenHash, familyId, expiresAt },
      select: { id: true, familyId: true, expiresAt: true },
    });

    return {
      token: tokenPlain,
      tokenId: record.id,
      familyId: record.familyId,
      expiresAt: record.expiresAt,
    };
  }

  /**
   * Valida um refresh token presented. Em caso de sucesso, marca `lastUsedAt`.
   * Se detectar reuso de um token já revogado, revoga toda a família e lança.
   *
   * Auditoria M7: agora retorna também `tokenId` para que `auth.service.refresh`
   * não precise fazer um `findUnique` adicional só para descobrir o id do
   * token presented (DRY + 1 query a menos por refresh).
   */
  async validateAndRotate(
    presented: string
  ): Promise<{ userId: string; familyId: string; tokenId: string }> {
    const tokenHash = this.hash(presented);

    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true } } },
    });

    if (!record) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    if (record.revokedAt) {
      // REUSO DETECTADO — invalida toda a família (roubo provável).
      await this.prisma.refreshToken.updateMany({
        where: { familyId: record.familyId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'reuse_detected' },
      });
      throw new UnauthorizedException('Refresh token reutilizado — sessão invalidada');
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    });

    return { userId: record.userId, familyId: record.familyId, tokenId: record.id };
  }

  /**
   * Revoga um token (substituição por rotação). Use após emitir um novo.
   */
  async revoke(tokenId: string, replacedById: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date(), replacedById },
    });
  }

  /**
   * Revoga todos os tokens ativos do usuário (logout global).
   */
  async revokeAllForUser(userId: string, reason = 'user_logout'): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
    return result.count;
  }

  private hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
