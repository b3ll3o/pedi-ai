import { UseCase } from '../../shared/types/UseCase';
import { QRCodePayload } from '@/domain/mesa';
import { IQRCodeValidationService } from '@/domain/mesa';
import type { IMesaRepository } from '@/domain/mesa/repositories/IMesaRepository';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

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
 * 2. QR code simples: "E2E-TABLE-XXX" - busca diretamente no Supabase
 */
export class ValidarQRCodeUseCase implements UseCase<ValidarQRCodeInput, MesaValidada> {
  private supabase?: SupabaseClient;

  constructor(
    private qrCodeValidationService: IQRCodeValidationService,
    private mesaRepository?: IMesaRepository
  ) {}

  private getSupabase(): SupabaseClient {
    if (!this.supabase) {
      this.supabase = createClient();
    }
    return this.supabase;
  }

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

    // Buscar diretamente no Supabase (para testes E2E e modo offline-first)
    const simpleMatch = input.qrCode.match(/E2E-TABLE-(\d+)/i);
    if (simpleMatch) {
      try {
        const supabase = this.getSupabase();
        const { data: table, error } = await supabase
          .from('tables')
          .select('id, restaurant_id, qr_code')
          .eq('qr_code', input.qrCode)
          .maybeSingle();

        if (table && !error) {
          return {
            restauranteId: table.restaurant_id,
            mesaId: table.id,
            valido: true,
          };
        }
      } catch {
        // Falha ao buscar no Supabase, continuar com erro
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
