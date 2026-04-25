import { ValueObjectClass } from '@/domain/shared';

export interface QRCodePayloadProps {
  restauranteId: string;
  mesaId: string;
  assinatura: string;
}

/**
 * Value Object que representa o payload codificado no QR Code de uma mesa.
 * Contém restauranteId, mesaId e assinatura HMAC-SHA256.
 * 
 * NOTA: A lógica de validação e geração de assinatura foi movida para
 * QRCodeCryptoService (infrastructure) para manter o domain puro.
 */
export class QRCodePayload extends ValueObjectClass<QRCodePayloadProps> {
  get restauranteId(): string {
    return this.props.restauranteId;
  }

  get mesaId(): string {
    return this.props.mesaId;
  }

  get assinatura(): string {
    return this.props.assinatura;
  }

  /**
   * Reconstrói um QRCodePayload a partir de props já existentes.
   * Usado quando o payload é decodificado do QR Code.
   */
  static reconstruir(props: QRCodePayloadProps): QRCodePayload {
    return new QRCodePayload(props);
  }
}
