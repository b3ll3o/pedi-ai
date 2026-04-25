import { UseCase } from '../../shared/types/UseCase';
import { QRCodePayload } from '@/domain/mesa';
import { IQRCodeValidationService } from '@/domain/mesa';

export interface MesaValidada {
  restauranteId: string;
  mesaId: string;
  valido: boolean;
}

export interface ValidarQRCodeInput {
  qrCode: string;
  secret: string;
}

/**
 * Caso de uso para decodificar e validar um QR code de mesa.
 * O QR code é um JSON stringified e base64 encoded do QRCodePayload.
 */
export class ValidarQRCodeUseCase implements UseCase<ValidarQRCodeInput, MesaValidada> {
  constructor(private qrCodeValidationService: IQRCodeValidationService) {}

  execute(input: ValidarQRCodeInput): MesaValidada {
    try {
      // Decodificar o QR code (base64 -> JSON)
      const decoded = Buffer.from(input.qrCode, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded) as {
        restauranteId: string;
        mesaId: string;
        assinatura: string;
      };

      // Reconstruir o QRCodePayload
      const qrCodePayload = QRCodePayload.reconstruir({
        restauranteId: payload.restauranteId,
        mesaId: payload.mesaId,
        assinatura: payload.assinatura,
      });

      // Validar a assinatura usando o serviço de infraestrutura
      const valido = this.qrCodeValidationService.validarAssinatura(
        qrCodePayload,
        input.secret
      );

      return {
        restauranteId: payload.restauranteId,
        mesaId: payload.mesaId,
        valido,
      };
    } catch {
      // QR code mal formado ou dados inválidos
      return {
        restauranteId: '',
        mesaId: '',
        valido: false,
      };
    }
  }
}
