import * as crypto from 'crypto';

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  RawBodyRequest,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/auth.types';

import { CreatePixPaymentDto } from './dto/payments.dto';
import { PaymentsService } from './payments.service';

/**
 * IPs oficiais do Mercado Pago para webhooks (subset conhecido 2026).
 *
 * Lista pode ser sobrescrita por env var `MP_WEBHOOK_IPS` (CIDRs separados
 * por vírgula). Útil para incorporar novos ranges sem deploy de código, e
 * para IPv6 quando o MP começar a publicar rotas IPv6.
 *
 * Lista completa pode ser consultada em `https://api.mercadopago.com/v1/whitelisted_ips`.
 *
 * IMPORTANTE: validar a cada deploy (Mercado Pago pode expandir a lista).
 */
const MP_WEBHOOK_IPS_FALLBACK: ReadonlySet<string> = new Set([
  '209.225.49.0/24',
  '216.33.197.0/24',
  '64.7.192.0/24',
  // Faixas adicionais documentadas
  '190.210.40.0/24',
  '200.4.207.0/24',
]);

function loadMpWebhookIps(): ReadonlySet<string> {
  const envList = process.env.MP_WEBHOOK_IPS;
  if (!envList) return MP_WEBHOOK_IPS_FALLBACK;
  const parsed = envList
    .split(',')
    .map((cidr) => cidr.trim())
    .filter((cidr) => cidr.length > 0);
  if (parsed.length === 0) {
    // Env var presente mas vazia — usa fallback para não permitir lista vazia
    // acidentalmente em produção.
    return MP_WEBHOOK_IPS_FALLBACK;
  }
  return new Set(parsed);
}

/**
 * Valida IP em CIDR. Retorna true se `ip` pertence a `cidr` (IPv4 apenas).
 * Implementação simples — suficiente para o conjunto conhecido do MP.
 */
function ipInCidr(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) {
    return ip === cidr;
  }
  const [range, bits] = cidr.split('/');
  const mask = ~((1 << (32 - Number(bits))) - 1) >>> 0;
  const ipNum = ip.split('.').reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
  const rangeNum = range.split('.').reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
  return (ipNum & mask) === (rangeNum & mask);
}

@ApiTags('payments')
// Auditoria M-07: `@UseGuards(JwtAuthGuard)` explícito na classe — antes
// dependia do `APP_GUARD` global; agora, se alguém remover o guard global
// em refactor futuro, payments permanece protegido.
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('pix/create')
  @Roles('cliente', 'atendente', 'gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Criar pagamento PIX' })
  @ApiResponse({ status: 201, description: 'Pagamento PIX criado' })
  @ApiResponse({ status: 403, description: 'Acesso restrito' })
  async createPixPayment(
    @Req() req: { user: AuthenticatedUser },
    @Body() data: CreatePixPaymentDto
  ) {
    // Tenant isolation: o restaurantId do JWT deve bater com o do body.
    if (req.user.restaurantId && data.restaurantId !== req.user.restaurantId) {
      throw new ForbiddenException('Restaurante não corresponde ao usuário autenticado');
    }
    return this.paymentsService.createPixPayment(data);
  }

  @Get('pix/status/:orderId')
  @Roles('cliente', 'atendente', 'gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Verificar status do PIX' })
  @ApiResponse({ status: 200, description: 'Status do pagamento' })
  async getPixStatus(@Req() req: { user: AuthenticatedUser }, @Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentStatusByOrder(orderId, {
      requesterUserId: req.user.id,
      requesterRole: req.user.role,
      requesterRestaurantId: req.user.restaurantId ?? null,
    });
  }

  /**
   * Webhook PIX do Mercado Pago — PÚBLICO mas **fortemente protegido**:
   *
   * 1. Validação de **IP de origem** contra ranges conhecidos do MP.
   * 2. Validação de **assinatura HMAC-SHA256** (`x-signature`) usando `MP_WEBHOOK_SECRET`.
   * 3. Validação de **idempotência** via `WebhookEvent` (já implementada no service).
   * 4. **Nenhuma ação sensível** sem validar proveniência.
   */
  @Post('webhooks/pix')
  @Public()
  @ApiOperation({ summary: 'Webhook PIX do Mercado Pago (protegido por HMAC v1 + IP)' })
  @ApiResponse({ status: 200, description: 'Webhook processado' })
  @ApiResponse({ status: 401, description: 'Assinatura inválida' })
  async handlePixWebhook(
    @Req() req: RawBodyRequest<{ ip: string }>,
    @Headers('x-signature') signature: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body()
    data: {
      id: string | number;
      type: string;
      data: { id: string | number };
    }
  ) {
    // ─── 1. Validação de IP ────────────────────────────────────
    // `req.ip` é populado pelo Fastify via X-Forwarded-For quando atrás de proxy
    // (configurado em main.ts via trustProxy: true).
    this.validateWebhookSource(req.ip, data);

    // ─── 2. Validação de assinatura HMAC v1 do MP ──────────────
    // Esquema oficial: header `x-signature: t=<ts>,v1=<hex>` e
    // manifest = `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` + raw body.
    // Ver: https://www.mercadopago.com.br/developers/pt/reference/notifications/webhooks
    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.error('Webhook PIX sem raw body — rawBody parsing não habilitado');
      throw new BadRequestException('Raw body não disponível');
    }
    this.validateHmacSignatureV1(signature, requestId, String(data.id), rawBody);

    // ─── 3. Processamento ──────────────────────────────────────
    if (data.type !== 'payment' || !data.data?.id) {
      return { status: 'ignored' };
    }

    return this.processPaymentWebhook(String(data.id), String(data.data.id));
  }

  /**
   * Valida IP de origem do webhook contra a allowlist do Mercado Pago.
   * Lança `UnauthorizedException` se o IP não estiver na lista.
   *
   * Política:
   * - Em produção (`NODE_ENV=production|staging`): IP vazio é REJEITADO.
   *   Indica proxy mal configurado (perdeu `trustProxy` ou X-Forwarded-For).
   * - Em desenvolvimento: IP vazio é aceito para permitir testes locais.
   *
   * O IP é logado de forma mascarada em produção (LGPD) — último octeto
   * substituído por `0`.
   */
  private validateWebhookSource(
    sourceIp: string,
    data: {
      id: string | number;
      type: string;
      data: { id: string | number };
    }
  ): void {
    const isProd = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';

    if (!sourceIp) {
      if (isProd) {
        this.logger.error(
          `Webhook PIX sem IP de origem (event: ${data.id}) — proxy mal configurado`
        );
        // Métrica stub: webhook_source_ip_missing_total++
        throw new UnauthorizedException('Origem não detectada');
      }
      // Em dev/test sem proxy, req.ip pode vir vazio.
      return;
    }
    if (!this.isAllowedIp(sourceIp)) {
      this.logger.warn(
        `Webhook PIX recebido de IP não autorizado: ${this.maskIp(sourceIp, isProd)} (event: ${data.id})`
      );
      // Métrica stub: webhook_source_ip_unauthorized_total++
      throw new UnauthorizedException('Origem não autorizada');
    }
  }

  /**
   * Mascara o último octeto do IP para logs em produção (mitigação LGPD).
   * Mantém os 3 primeiros octetos para diagnóstico.
   */
  private maskIp(ip: string, shouldMask: boolean): string {
    if (!shouldMask) return ip;
    const parts = ip.split('.');
    if (parts.length !== 4) return '***';
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }

  /**
   * Valida a assinatura HMAC-SHA256 v1 do Mercado Pago.
   *
   * Esquema oficial:
   *   Header: `x-signature: t=<ts>,v1=<hex>`
   *   Manifest: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` + raw body
   *   Signature: HMAC-SHA256(secret, manifest).hex()
   *
   * Implementa também tolerância a skew de relógio (5 min) para evitar
   * rejeitar webhooks legítimos por drift. O `requestId` original do MP
   * é incorporado no manifest.
   *
   * Ver: https://www.mercadopago.com.br/developers/pt/reference/notifications/webhooks
   */
  private validateHmacSignatureV1(
    signature: string | undefined,
    requestId: string | undefined,
    eventId: string,
    rawBody: Buffer
  ): void {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.error('MP_WEBHOOK_SECRET não configurado — recusando webhook');
      throw new UnauthorizedException('Webhook secret não configurado');
    }

    if (!signature || !requestId) {
      this.logger.warn(`Webhook PIX sem assinatura ou requestId (event: ${eventId})`);
      throw new UnauthorizedException('Assinatura ausente');
    }

    // Parse `x-signature: t=<ts>,v1=<hex>` (ou `,v2=...` para versões futuras).
    const parts = signature.split(',').map((p) => p.trim());
    let ts: string | null = null;
    let v1: string | null = null;
    for (const part of parts) {
      if (part.startsWith('t=')) ts = part.slice(2);
      else if (part.startsWith('v1=')) v1 = part.slice(3);
    }

    if (!ts || !v1) {
      this.logger.warn(`Webhook PIX com signature malformada (event: ${eventId})`);
      throw new UnauthorizedException('Signature malformada');
    }

    // Tolerância de skew: 5 min.
    const tsNum = Number(ts);
    const skewMs = 5 * 60 * 1000;
    if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum * 1000) > skewMs) {
      this.logger.warn(`Webhook PIX com timestamp fora da janela (ts=${ts}, event=${eventId})`);
      throw new UnauthorizedException('Timestamp inválido');
    }

    // Manifest conforme doc oficial do MP v1.
    const manifest = `id:${eventId};request-id:${requestId};ts:${ts};${rawBody.toString('utf8')}`;
    const expectedV1 = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    const providedBuf = Buffer.from(v1, 'utf8');
    const expectedBuf = Buffer.from(expectedV1, 'utf8');

    if (
      providedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(providedBuf, expectedBuf)
    ) {
      this.logger.warn(
        `Webhook PIX com assinatura v1 inválida (event: ${eventId}, requestId: ${requestId})`
      );
      throw new UnauthorizedException('Assinatura inválida');
    }
  }

  /**
   * Busca status do pagamento no Mercado Pago e delega ao service.
   */
  private async processPaymentWebhook(
    eventId: string,
    paymentId: string
  ): Promise<{ status: string; message?: string; orderId?: string }> {
    const mpAccessToken = process.env.MP_ACCESS_TOKEN;
    if (!mpAccessToken) {
      this.logger.error('MP_ACCESS_TOKEN não configurado');
      return { status: 'error', message: 'MP_ACCESS_TOKEN not configured' };
    }

    try {
      // Auditoria M-NEW-07: AbortSignal.timeout impede que um webhook fique
      // pendurado indefinidamente quando o MP não responde.
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!mpResponse.ok) {
        this.logger.error(
          `Falha ao buscar pagamento no MP: ${mpResponse.status} ${mpResponse.statusText}`
        );
        return { status: 'error', message: 'Failed to fetch payment from Mercado Pago' };
      }

      const mpPayment = await mpResponse.json();
      const orderId = mpPayment.metadata?.order_id;

      return this.paymentsService.handleWebhook({
        eventId,
        paymentId,
        status: mpPayment.status,
        orderId,
      });
    } catch (error) {
      this.logger.error(
        `Erro ao processar webhook PIX: ${(error as Error).message}`,
        (error as Error).stack
      );
      return { status: 'error', message: 'Error processing webhook' };
    }
  }

  private isAllowedIp(ip: string): boolean {
    const allowedCidrs = loadMpWebhookIps();
    for (const range of allowedCidrs) {
      if (ipInCidr(ip, range)) return true;
    }
    return false;
  }
}
