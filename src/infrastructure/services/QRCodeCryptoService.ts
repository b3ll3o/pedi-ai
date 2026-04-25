import crypto from 'crypto';
import { IQRCodeValidationService } from '@/domain/mesa/services/QRCodeValidationService';
import { QRCodePayloadProps } from '@/domain/mesa/value-objects/QRCodePayload';

/**
 * Implementação de IQRCodeValidationService usando crypto nativo do Node.js.
 * Esta classe fica em infrastructure pois depende de side-effects (crypto).
 */
export class QRCodeCryptoService implements IQRCodeValidationService {
  /**
   * Valida a assinatura do payload usando HMAC-SHA256
   */
  validarAssinatura(payload: QRCodePayloadProps, secret: string): boolean {
    const conteudo = `${payload.restauranteId}:${payload.mesaId}`;
    const assinaturaEsperada = crypto
      .createHmac('sha256', secret)
      .update(conteudo)
      .digest('hex');
    return payload.assinatura === assinaturaEsperada;
  }

  /**
   * Gera uma assinatura HMAC-SHA256 para o par restauranteId:mesaId
   */
  gerarAssinatura(restauranteId: string, mesaId: string, secret: string): string {
    const conteudo = `${restauranteId}:${mesaId}`;
    return crypto.createHmac('sha256', secret).update(conteudo).digest('hex');
  }
}
