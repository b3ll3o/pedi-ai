import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Table } from '@prisma/client';

import { PrismaService } from '../common/prisma.service';

import { QRCodeCryptoService } from './qr-crypto.service';

/**
 * Service de mesas com tenant isolation.
 *
 * Validação de QR inclui checagem de **timestamp window** (4h) para
 * prevenir reuso de QR codes antigos.
 */
@Injectable()
export class TablesService {
  private readonly logger = new Logger(TablesService.name);

  /** Janela de validade do QR code em ms (4 horas). */
  static readonly QR_TIMESTAMP_WINDOW_MS = 4 * 60 * 60 * 1000;

  // Auditoria ACHADO-N18 (Re-varredura 9): secret do QR lido em cada
  // `validateQrCode` / `assinarQrCode` (hot path em produção — QRs são
  // escaneados continuamente). Agora extraído em campo readonly inicializado
  // no construtor — `process.env.QR_SECRET_KEY` é lido uma única vez.
  private readonly qrSecret: string | null = process.env.QR_SECRET_KEY ?? null;

  constructor(
    private prisma: PrismaService,
    private qrService: QRCodeCryptoService
  ) {}

  async findByRestaurant(restaurantId: string) {
    // Auditoria A12: `restaurantId` agora é **obrigatório**. Sem tenant
    // vinculado ao JWT, negamos o acesso (antes retornávamos mesas "órfãs"
    // sem restaurante, o que vazava dados de migração para qualquer
    // usuário sem `restaurantId` no JWT).
    if (!restaurantId) {
      throw new ForbiddenException('Usuário sem restaurante vinculado');
    }
    return this.prisma.table.findMany({
      where: { active: true, restaurantId },
      orderBy: { number: 'asc' },
    });
  }

  async findById(id: string, requesterRestaurantId?: string | null) {
    const table = await this.prisma.table.findUnique({ where: { id } });
    if (!table) {
      throw new NotFoundException('Mesa não encontrada');
    }
    if (requesterRestaurantId && table.restaurantId !== requesterRestaurantId) {
      throw new ForbiddenException('Mesa pertence a outro restaurante');
    }
    return table;
  }

  /**
   * Validação server-side do QR code:
   * 1. Assinatura HMAC-SHA256 (via `QRCodeCryptoService`).
   * 2. Janela de timestamp (4h) — previne reuso de QR antigos.
   * 3. Comparação timing-safe.
   */
  async validateQrCode(
    restaurantId: string,
    tableId: string,
    timestamp: number,
    signature: string
  ): Promise<boolean> {
    // Auditoria ACHADO-N18: secret lido uma única vez no construtor.
    if (!this.qrSecret) {
      // Auditoria M-11: fail-silent é vetor de bug operacional invisível.
      // Sem secret, 100% dos QRs seriam rejeitados — melhor alardar agora.
      this.logger.error('QR_SECRET_KEY não configurado — recusando validação QR');
      return false;
    }

    // Janela de timestamp
    const now = Date.now();
    if (
      typeof timestamp !== 'number' ||
      isNaN(timestamp) ||
      Math.abs(now - timestamp) > TablesService.QR_TIMESTAMP_WINDOW_MS
    ) {
      return false;
    }

    const payload = {
      restauranteId: restaurantId,
      mesaId: tableId,
      timestamp,
      assinatura: signature,
    };
    return this.qrService.validarAssinatura(payload, this.qrSecret);
  }

  /**
   * Assina um QR code incluindo o timestamp no MAC. Chamado pelo
   * `generateQrCode` e em testes. Mantém o formato canônico em
   * sincronia com `QRCodeCryptoService.validarAssinatura`.
   */
  assinarQrCode(restaurantId: string, tableId: string, timestamp: number): string | null {
    // Auditoria ACHADO-N18: secret lido uma única vez no construtor.
    if (!this.qrSecret) return null;
    return this.qrService.gerarAssinatura(restaurantId, tableId, timestamp, this.qrSecret);
  }

  async validateTable(restaurantId: string, tableId: string) {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, restaurantId, active: true },
    });
    return table !== null;
  }

  /**
   * Validação consolidada do QR code em **1 única query** (auditoria M17).
   *
   * Antes, o controller chamava:
   *   1. `validateQrCode` (HMAC, sem query)
   *   2. `validateTable` (1 query)
   *   3. `findById` (outra query)
   * = 2 queries + 1 validação de assinatura. Esta função faz:
   *   - 1 query para buscar a mesa (com `active` e `restaurantId` no WHERE);
   *   - valida HMAC localmente;
   *   - retorna a mesa **apenas se** assinatura + ownership + ativo casam.
   *
   * Reduz round-trips ao banco em ~50% (2 → 1).
   */
  async validateQrAndGet(
    restaurantId: string,
    tableId: string,
    timestamp: number,
    signature: string
  ): Promise<{ valid: true; table: Table } | { valid: false; error: string }> {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, restaurantId, active: true },
    });
    if (!table) {
      return { valid: false, error: 'Mesa não encontrada ou inativa' };
    }
    const signatureOk = await this.validateQrCode(restaurantId, tableId, timestamp, signature);
    if (!signatureOk) {
      return { valid: false, error: 'Assinatura inválida' };
    }
    return { valid: true, table };
  }

  async create(data: {
    restaurantId: string | null;
    name: string;
    number?: number;
    capacity?: number;
  }) {
    if (!data.restaurantId) {
      throw new ForbiddenException('Restaurante é obrigatório');
    }
    return this.prisma.table.create({
      data: {
        restaurantId: data.restaurantId,
        name: data.name,
        number: data.number,
        capacity: data.capacity,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{ name: string; number: number; capacity: number; active: boolean }>,
    requesterRestaurantId?: string | null
  ) {
    await this.findById(id, requesterRestaurantId); // valida ownership
    return this.prisma.table.update({ where: { id }, data });
  }

  async deactivate(id: string, requesterRestaurantId?: string | null) {
    await this.findById(id, requesterRestaurantId);
    return this.prisma.table.update({ where: { id }, data: { active: false } });
  }

  async reactivate(id: string, requesterRestaurantId?: string | null) {
    await this.findById(id, requesterRestaurantId);
    return this.prisma.table.update({ where: { id }, data: { active: true } });
  }

  async generateQrCode(id: string, requesterRestaurantId?: string | null) {
    const table = await this.findById(id, requesterRestaurantId);
    // Auditoria ACHADO-N23 (Re-varredura 9): backend lendo `NEXT_PUBLIC_BASE_URL`
    // é vazamento arquitetural — prefixo `NEXT_PUBLIC_` significa "exposto ao
    // browser" (convenção Next.js). Backend deve usar variáveis próprias.
    // Ordem de resolução: QR_BASE_URL (dedicada) > APP_PUBLIC_URL (já usada
    // em auth.service.ts) > fallback dev.
    const baseUrl =
      process.env.QR_BASE_URL || process.env.APP_PUBLIC_URL || 'http://localhost:3000';
    const qrUrl = `${baseUrl}/menu/${table.restaurantId}?table_id=${id}`;
    // B1: camelCase canônico + alias snake_case para compatibilidade.
    return { table, qrUrl, qr_url: qrUrl };
  }
}
