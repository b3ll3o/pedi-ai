import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../common/prisma.service';
import { QRCodeCryptoService } from './qr-crypto.service';

@Injectable()
export class TablesService {
  constructor(
    private prisma: PrismaService,
    private qrService: QRCodeCryptoService
  ) {}

  async findByRestaurant(restaurantId: string) {
    return this.prisma.table.findMany({
      where: { restaurantId, active: true },
      orderBy: { number: 'asc' },
    });
  }

  async findById(id: string) {
    const table = await this.prisma.table.findUnique({ where: { id } });
    if (!table) {
      throw new NotFoundException('Mesa não encontrada');
    }
    return table;
  }

  async validateQrCode(restaurantId: string, tableId: string, signature: string): Promise<boolean> {
    const secret = process.env.QR_SECRET_KEY;
    if (!secret) {
      return false;
    }

    const payload = { restauranteId: restaurantId, mesaId: tableId, assinatura: signature };
    return this.qrService.validarAssinatura(payload, secret);
  }

  async validateTable(restaurantId: string, tableId: string) {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, restaurantId, active: true },
    });
    return table !== null;
  }

  async create(data: { restaurantId: string; name: string; number?: number; capacity?: number }) {
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
    data: Partial<{ name: string; number: number; capacity: number; active: boolean }>
  ) {
    return this.prisma.table.update({ where: { id }, data });
  }

  async deactivate(id: string) {
    return this.prisma.table.update({ where: { id }, data: { active: false } });
  }

  async reactivate(id: string) {
    return this.prisma.table.update({ where: { id }, data: { active: true } });
  }

  async generateQrCode(id: string) {
    const table = await this.findById(id);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const qrUrl = `${baseUrl}/menu/${table.restaurantId}?table_id=${id}`;
    return { table, qr_url: qrUrl };
  }
}
