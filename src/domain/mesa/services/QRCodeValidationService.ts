import { QRCodePayloadProps } from '../value-objects/QRCodePayload';

/**
 * Interface para serviço de validação e geração de assinaturas de QR Code.
 * A implementação concreto (QRCodeCryptoService) fica em infrastructure.
 */
export interface IQRCodeValidationService {
  /**
   * Valida a assinatura do payload do QR code usando HMAC-SHA256
   */
  validarAssinatura(payload: QRCodePayloadProps, secret: string): boolean;

  /**
   * Gera uma assinatura HMAC-SHA256 para o par restauranteId:mesaId
   */
  gerarAssinatura(restauranteId: string, mesaId: string, secret: string): string;
}
