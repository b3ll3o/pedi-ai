import { QRCodePayload } from '@/domain/mesa';
import { IQRCodeValidationService } from '@/domain/mesa';
import type { IMesaRepository } from '@/domain/mesa/repositories/IMesaRepository';

import { UseCase } from '../../shared/types/UseCase';

export interface ValidarQRCodeInput {
  qrCode: string;
  secret: string;
}

export interface MesaValidada {
  restauranteId: string;
  mesaId: string;
  valido: boolean;
}

/**
 * Caso de uso para decodificar e validar um QR code de mesa.
 * Suporta dois formatos:
 * 1. QR code complexo: JSON stringified e base64 encoded do QRCodePayload
 * 2. QR code simples: "E2E-TABLE-XXX" - busca via API
 */
/**
 * Use Case: decodificar e validar QR code de mesa (HMAC-SHA256).
 * @spec(RF-TABLE-03)
 */
export class ValidarQRCodeUseCase implements UseCase<ValidarQRCodeInput, MesaValidada> {
  constructor(
    private qrCodeValidationService: IQRCodeValidationService,
    private mesaRepository?: IMesaRepository
  ) {}

  async execute(input: ValidarQRCodeInput): Promise<MesaValidada> {
    // Primeiro, tentar decodificar como base64 JSON (formato completo)
    try {
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
      const valido = this.qrCodeValidationService.validarAssinatura(qrCodePayload, input.secret);

      return {
        restauranteId: payload.restauranteId,
        mesaId: payload.mesaId,
        valido,
      };
    } catch {
      // QR code mal formado ou dados inválidos - tentar formato simples
    }

    // Tentar formato simples "E2E-TABLE-XXX"
    // Primeiro tentar no repository local (IndexedDB)
    if (this.mesaRepository) {
      const mesa = await this.mesaRepository.findByQrCode(input.qrCode);
      if (mesa) {
        return {
          restauranteId: mesa.restauranteId,
          mesaId: mesa.id,
          valido: true,
        };
      }
    }

    // Buscar via API (para testes E2E e modo offline-first)
    const simpleMatch = input.qrCode.match(/E2E-TABLE-(\d+)/i);
    if (simpleMatch) {
      try {
        const response = await fetch(
          `/api/tables/by-qrcode?qr_code=${encodeURIComponent(input.qrCode)}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.table) {
            return {
              restauranteId: data.table.restaurant_id,
              mesaId: data.table.id,
              valido: true,
            };
          }
        }
      } catch {
        // Falha ao buscar via API, continuar com erro
      }
    }

    // QR code inválido
    return {
      restauranteId: '',
      mesaId: '',
      valido: false,
    };
  }
}
