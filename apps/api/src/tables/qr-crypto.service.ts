import * as crypto from 'crypto';

import { Injectable } from '@nestjs/common';

/**
 * QR code signing/verification.
 *
 * **Formato do payload assinado:** `${restauranteId}:${mesaId}:${timestamp}`
 * — incluir o timestamp no MAC impede que um QR capturado dentro da janela
 * de validade seja replayed indefinidamente (sem o timestamp, a assinatura
 * seria a mesma para qualquer timestamp).
 *
 * **Comparação timing-safe:** `crypto.timingSafeEqual` evita oráculo de
 * tempo. Strings são comparadas em hex (digest é hex). Length-mismatch
 * short-circuita antes do `timingSafeEqual` para evitar exception.
 */
@Injectable()
export class QRCodeCryptoService {
  /**
   * Computa o conteúdo canonical que será assinado.
   * Centralizado para garantir que `gerarAssinatura` e `validarAssinatura`
   * usem EXATAMENTE o mesmo formato.
   */
  private canonical(restauranteId: string, mesaId: string, timestamp: number): string {
    return `${restauranteId}:${mesaId}:${timestamp}`;
  }

  validarAssinatura(
    payload: { restauranteId: string; mesaId: string; timestamp: number; assinatura: string },
    secret: string
  ): boolean {
    const conteudo = this.canonical(payload.restauranteId, payload.mesaId, payload.timestamp);
    const assinaturaEsperada = crypto.createHmac('sha256', secret).update(conteudo).digest('hex');

    // Defensivo: timingSafeEqual exige buffers de mesmo comprimento.
    if (payload.assinatura.length !== assinaturaEsperada.length) {
      return false;
    }

    const a = Buffer.from(payload.assinatura, 'hex');
    const b = Buffer.from(assinaturaEsperada, 'hex');
    // Se algum dos lados não for hex válido, Buffer.from retorna Buffer vazio
    // ou com bytes inválidos — timingSafeEqual falhará de forma segura.
    return crypto.timingSafeEqual(a, b);
  }

  gerarAssinatura(
    restauranteId: string,
    mesaId: string,
    timestamp: number,
    secret: string
  ): string {
    const conteudo = this.canonical(restauranteId, mesaId, timestamp);
    return crypto.createHmac('sha256', secret).update(conteudo).digest('hex');
  }
}
