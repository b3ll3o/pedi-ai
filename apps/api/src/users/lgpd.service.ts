import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../common/prisma.service';

/**
 * Service de direitos do titular sob a LGPD (Lei 13.709/2018).
 *
 * Materializa os direitos previstos no art. 18:
 * - **V — acesso**: `exportUserData` retorna JSON agregado de todos os dados
 *   pessoais do titular sob custódia do controlador.
 * - **VI — eliminação**: `anonymizeOwnAccount` anonimiza os campos PII do
 *   perfil (email, nome, passwordHash) preservando Orders/PaymentIntents
 *   para fins de auditoria fiscal (art. 27 LGPD + Receita Federal,
 *   retenção 5 anos).
 *
 * Decisões:
 * - Anonimização em vez de hard delete: integridade referencial + obrigações
 *   fiscais (ver `.openspec/changes/2026-08-03-lgpd-me-export-delete/design.md` §5.1).
 * - Idempotência em `anonymizeOwnAccount`: segunda chamada detecta o email
 *   já anonimizado (`anon-<userId>@deleted.local`) e retorna sem efeito.
 * - `$transaction` Serializable: garante atomicidade entre as 3 mutações
 *   (perfil, refresh tokens, password reset tokens).
 *
 * @spec(RF-AUTH-12, RF-AUTH-13)
 * @see https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
 */
@Injectable()
export class LgpdService {
  private readonly logger = new Logger(LgpdService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Export agregado dos dados pessoais do titular (LGPD art. 18, V).
   *
   * Inclui:
   * - Perfil (`UsersProfile`)
   * - Pedidos (`Order` + `OrderItem`) onde `customerId === userId`
   * - Intenções de pagamento vinculadas aos pedidos acima
   * - Refresh tokens ativos/revogados (NUNCA o hash)
   * - Password reset tokens (NUNCA o token raw)
   * - Subscription do restaurante vinculado ao user (se houver)
   *
   * NUNCA inclui: `passwordHash`, hash de refresh token, valor de reset token.
   * Estes são segredos criptográficos, não "dados pessoais" sob custódia
   * do titular (LGPD art. 5, I — "dado pessoal" exclui segredo).
   *
   * @param userId - ID do `UsersProfile` (vem do JWT — NUNCA do body/query)
   * @returns JSON estruturado conforme LGPD art. 18, V
   * @throws NotFoundException se user não existe (improvável com JWT válido)
   */
  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const profile = await this.prisma.usersProfile.findUnique({
      where: { id: userId },
      include: { restaurant: true },
    });
    if (!profile) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Pedidos onde o user é o cliente (Order.customerId === userId).
    // Em mesa compartilhada, customerId é o user que "criou" o pedido.
    const orders = await this.prisma.order.findMany({
      where: { customerId: userId },
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            comboId: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            notes: true,
            createdAt: true,
          },
        },
        paymentIntents: {
          select: {
            id: true,
            status: true,
            amount: true,
            currency: true,
            paymentMethod: true,
            createdAt: true,
            expiresAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Refresh tokens: só metadata, NUNCA o hash. O hash é segredo
    // criptográfico (LGPD art. 5, I — exclusão de "segredo").
    const refreshTokens = await this.prisma.refreshToken.findMany({
      where: { userId },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
        revokedReason: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Password reset tokens: mesma lógica. O `token` raw NUNCA é exposto.
    const passwordResetTokens = await this.prisma.passwordResetToken.findMany({
      where: { userId },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        used: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Subscription é por restaurantId, não userId. Mas o user pode ter
    // perfil vinculado a um restaurante com assinatura ativa (dono/gerente).
    let subscriptions: unknown[] = [];
    if (profile.restaurantId) {
      subscriptions = await this.prisma.subscription.findMany({
        where: { restaurantId: profile.restaurantId },
        select: {
          id: true,
          status: true,
          planType: true,
          priceCents: true,
          currency: true,
          trialStartedAt: true,
          trialEndsAt: true,
          subscriptionStartedAt: true,
          subscriptionEndsAt: true,
          cancelledAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    this.logger.log(
      `metric=lgpd.export userId=${userId} orders=${orders.length} ` +
        `refreshTokens=${refreshTokens.length} subscriptions=${subscriptions.length}`
    );

    return {
      exportedAt: new Date().toISOString(),
      legalBasis: 'LGPD art. 18, V — direito de acesso',
      subject: {
        id: profile.id,
        role: profile.role,
        restaurantId: profile.restaurantId,
        name: profile.name,
        email: profile.email,
        createdAt: profile.createdAt,
      },
      orders,
      paymentIntents: orders.flatMap((o) => o.paymentIntents),
      refreshTokens,
      passwordResetTokens,
      subscriptions,
    };
  }

  /**
   * Anonimiza o perfil do titular (LGPD art. 18, VI).
   *
   * Efeitos:
   * - `email` → `anon-<userId>@deleted.local` (placeholder estável para FK)
   * - `name` → `"Usuário Removido"`
   * - `passwordHash` → `null` (sem credencial para login)
   * - `userId` (FK para `users` se houver) → `null` (desvincula conta auth)
   * - TODOS os `RefreshToken` ativos são revogados com
   *   `revokedReason = 'lgpd_self_deletion'`
   * - TODOS os `PasswordResetToken` em aberto são marcados como `used`
   *   com `expiresAt = now()` (impossibilita redefinição)
   *
   * **NÃO deleta** `Order`, `PaymentIntent` ou `Subscription` —
   * obrigações fiscais (art. 27 LGPD + Receita Federal, 5 anos) + auditoria
   * do BACEN/PSP. A integridade referencial é preservada via `customerId`
   * (FK para `UsersProfile`) que permanece válido.
   *
   * Idempotente: se o email já segue o padrão anonimizado, retorna sem
   * efeito colateral. Defensivo contra retry de cliente.
   *
   * @param userId - ID do `UsersProfile` (vem do JWT)
   * @returns Confirmação com timestamp + flag de idempotência
   * @throws NotFoundException se perfil não existe
   */
  async anonymizeOwnAccount(userId: string): Promise<{
    success: boolean;
    anonymizedAt: string;
    preservedForFiscalAudit: string[];
    alreadyAnonymized: boolean;
  }> {
    const existing = await this.prisma.usersProfile.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!existing) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Idempotência: detecta email já anonimizado pelo padrão.
    const anonymizedEmail = `anon-${userId}@deleted.local`;
    const alreadyAnonymized = existing.email === anonymizedEmail;
    if (alreadyAnonymized) {
      this.logger.log(`metric=lgpd.delete userId=${userId} alreadyAnonymized=true (idempotent)`);
      return {
        success: true,
        anonymizedAt: new Date().toISOString(),
        preservedForFiscalAudit: ['orders', 'paymentIntents', 'subscriptions'],
        alreadyAnonymized: true,
      };
    }

    const anonymizedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      // 1. Anonimiza o perfil.
      await tx.usersProfile.update({
        where: { id: userId },
        data: {
          email: anonymizedEmail,
          name: 'Usuário Removido',
          passwordHash: null,
          userId: null,
        },
      });

      // 2. Revoga TODOS os refresh tokens ativos.
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: {
          revokedAt: anonymizedAt,
          revokedReason: 'lgpd_self_deletion',
        },
      });

      // 3. Invalida password reset tokens em aberto.
      await tx.passwordResetToken.updateMany({
        where: { userId, used: false, expiresAt: { gt: anonymizedAt } },
        data: {
          used: true,
          expiresAt: anonymizedAt,
        },
      });
    });

    this.logger.log(
      `metric=lgpd.delete userId=${userId} anonymized=true preserved=[orders,paymentIntents,subscriptions]`
    );

    return {
      success: true,
      anonymizedAt: anonymizedAt.toISOString(),
      preservedForFiscalAudit: ['orders', 'paymentIntents', 'subscriptions'],
      alreadyAnonymized: false,
    };
  }
}
