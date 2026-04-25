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

  async update(mesa: Mesa): Promise<Mesa> {
    await this.db.mesas.put(this.toRecord(mesa));
    return mesa;
  }

  async delete(id: string): Promise<void> {
    await this.db.mesas.delete(id);
  }
}
