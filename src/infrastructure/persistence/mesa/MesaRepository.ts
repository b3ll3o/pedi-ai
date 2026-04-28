import { IMesaRepository } from '@/domain/mesa/repositories/IMesaRepository';
import { Mesa, MesaProps } from '@/domain/mesa/entities/Mesa';
import { QRCodePayload } from '@/domain/mesa/value-objects/QRCodePayload';
import { PediDatabase, MesaRecord } from '../database';

export class MesaRepository implements IMesaRepository {
  constructor(private db: PediDatabase) {}

  private toDomain(record: MesaRecord): Mesa {
    const props: MesaProps = {
      id: record.id,
      restauranteId: record.restauranteId,
      label: record.label,
      qrCodePayload: QRCodePayload.reconstruir(record.qrCodePayload),
      ativo: record.ativo,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
    return new Mesa(props);
  }

  private toRecord(mesa: Mesa): MesaRecord {
    return {
      id: mesa.id,
      restauranteId: mesa.restauranteId,
      label: mesa.label,
      qrCodePayload: {
        restauranteId: mesa.qrCodePayload.restauranteId,
        mesaId: mesa.qrCodePayload.mesaId,
        assinatura: mesa.qrCodePayload.assinatura,
      },
      ativo: mesa.ativo,
      createdAt: mesa.createdAt,
      updatedAt: mesa.updatedAt,
    };
  }

  async create(mesa: Mesa): Promise<Mesa> {
    await this.db.mesas.add(this.toRecord(mesa));
    return mesa;
  }

  async findById(id: string): Promise<Mesa | null> {
    const record = await this.db.mesas.get(id);
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByRestauranteId(restauranteId: string): Promise<Mesa[]> {
    const records = await this.db.mesas.where('restauranteId').equals(restauranteId).toArray();
    return records.map(r => this.toDomain(r));
  }

  async findByLabel(restauranteId: string, label: string): Promise<Mesa | null> {
    const records = await this.db.mesas
      .where('restauranteId')
      .equals(restauranteId)
      .toArray();
    const found = records.find(r => r.label === label);
    if (!found) return null;
    return this.toDomain(found);
  }

  /**
   * Busca mesa pelo QR code.
   * Suporta dois formatos:
   * 1. QR code complexo (base64 JSON): decodifica e busca por mesaId
   * 2. QR code simples (ex: "E2E-TABLE-001"): extrai número e busca por label contendo esse número
   */
  async findByQrCode(qrCode: string, restauranteId?: string): Promise<Mesa | null> {
    let mesaId: string | null = null;
    let tableNumber: string | null = null;

    // Tentar decodificar como base64 JSON (formato completo)
    try {
      const decoded = Buffer.from(qrCode, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded) as { mesaId?: string };
      if (payload.mesaId) {
        mesaId = payload.mesaId;
      }
    } catch {
      // Não é base64 JSON, tentar formato simples
    }

    // Se não conseguiu extrair mesaId, tentar formato simples "E2E-TABLE-XXX"
    if (!mesaId) {
      const simpleMatch = qrCode.match(/E2E-TABLE-(\d+)/i);
      if (simpleMatch) {
        tableNumber = simpleMatch[1];
      }
    }

    // Buscar mesas do restaurante
    const records = restauranteId
      ? await this.db.mesas.where('restauranteId').equals(restauranteId).toArray()
      : await this.db.mesas.toArray();

    // Se temos mesaId, buscar diretamente
    if (mesaId) {
      const found = records.find(r => r.id === mesaId || r.qrCodePayload?.mesaId === mesaId);
      if (found) return this.toDomain(found);
    }

    // Se temos tableNumber, buscar por label que contenha esse número
    if (tableNumber) {
      const found = records.find(r => r.label.includes(tableNumber!));
      if (found) return this.toDomain(found);
    }

    return null;
  }

  async update(mesa: Mesa): Promise<Mesa> {
    await this.db.mesas.put(this.toRecord(mesa));
    return mesa;
  }

  async delete(id: string): Promise<void> {
    await this.db.mesas.delete(id);
  }
}
