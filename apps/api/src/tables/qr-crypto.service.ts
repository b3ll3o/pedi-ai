import { Injectable } from '@nestjs/common';

@Injectable()
export class QRCodeCryptoService {
  validarAssinatura(
    payload: { restauranteId: string; mesaId: string; assinatura: string },
    secret: string
  ): boolean {
    const conteudo = `${payload.restauranteId}:${payload.mesaId}`;
    const crypto = require('crypto');
    const assinaturaEsperada = crypto.createHmac('sha256', secret).update(conteudo).digest('hex');
    return payload.assinatura === assinaturaEsperada;
  }

  gerarAssinatura(restauranteId: string, mesaId: string, secret: string): string {
    const conteudo = `${restauranteId}:${mesaId}`;
    const crypto = require('crypto');
    return crypto.createHmac('sha256', secret).update(conteudo).digest('hex');
  }
}
