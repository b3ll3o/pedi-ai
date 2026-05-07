import { EntityClass } from '@/domain/shared';
import { QRCodePayload } from '../value-objects/QRCodePayload';

export interface MesaProps {
  id: string;
  restauranteId: string;
  label: string;
  qrCodePayload: QRCodePayload;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
  deletedAt: Date | null;
  version: number;
}

export class Mesa extends EntityClass<MesaProps> {
  get restauranteId(): string {
    return this.props.restauranteId;
  }

  get label(): string {
    return this.props.label;
  }

  get qrCodePayload(): QRCodePayload {
    return this.props.qrCodePayload;
  }

  get ativo(): boolean {
    return this.props.ativo;
  }

  get criadoEm(): Date {
    return this.props.criadoEm;
  }

  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get version(): number {
    return this.props.version;
  }

  /**
   * Verifica se a mesa foi excluída (soft delete).
   */
  get estaDeletada(): boolean {
    return this.props.deletedAt !== null;
  }

  equals(other: EntityClass<MesaProps>): boolean {
    if (!(other instanceof Mesa)) return false;
    return this.id === other.id;
  }

  desativar(): void {
    if (!this.props.ativo) return;
    Object.assign(this.props, {
      ativo: false,
      atualizadoEm: new Date(),
      version: this.props.version + 1,
    });
  }

  ativar(): void {
    if (this.props.ativo) return;
    Object.assign(this.props, {
      ativo: true,
      atualizadoEm: new Date(),
      version: this.props.version + 1,
    });
  }

  atualizarLabel(novoLabel: string): void {
    if (this.props.label === novoLabel) return;
    Object.assign(this.props, {
      label: novoLabel,
      atualizadoEm: new Date(),
      version: this.props.version + 1,
    });
  }

  /**
   * Soft delete: marca a mesa como excluída sem remover do banco.
   */
  marcarDeletada(): void {
    Object.assign(this.props, {
      deletedAt: new Date(),
      ativo: false,
      atualizadoEm: new Date(),
      version: this.props.version + 1,
    });
  }

  /**
   * Restaurar uma mesa previamente deletada (soft undelete).
   */
  restaurar(): void {
    Object.assign(this.props, {
      deletedAt: null,
      ativo: true,
      atualizadoEm: new Date(),
      version: this.props.version + 1,
    });
  }

  static criar(props: Omit<MesaProps, 'criadoEm' | 'atualizadoEm' | 'deletedAt' | 'version'>): Mesa {
    const now = new Date();
    return new Mesa({
      ...props,
      criadoEm: now,
      atualizadoEm: now,
      deletedAt: null,
      version: 1,
    });
  }
}
