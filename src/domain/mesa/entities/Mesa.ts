import { EntityClass } from '@/domain/shared';
import { QRCodePayload } from '../value-objects/QRCodePayload';

export interface MesaProps {
  id: string;
  restauranteId: string;
  label: string;
  qrCodePayload: QRCodePayload;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
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

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  equals(other: EntityClass<MesaProps>): boolean {
    if (!(other instanceof Mesa)) return false;
    return this.id === other.id;
  }

  desativar(): void {
    if (!this.props.ativo) return;
    Object.assign(this.props, {
      ativo: false,
      updatedAt: new Date(),
    });
  }

  ativar(): void {
    if (this.props.ativo) return;
    Object.assign(this.props, {
      ativo: true,
      updatedAt: new Date(),
    });
  }

  atualizarLabel(novoLabel: string): void {
    if (this.props.label === novoLabel) return;
    Object.assign(this.props, {
      label: novoLabel,
      updatedAt: new Date(),
    });
  }

  static criar(props: Omit<MesaProps, 'createdAt' | 'updatedAt'>): Mesa {
    const now = new Date();
    return new Mesa({
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }
}
