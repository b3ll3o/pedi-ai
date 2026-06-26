import { Logger, Module, OnModuleInit } from '@nestjs/common';

import { assertSecretStrength } from '../auth/secret-strength';

import { QRCodeCryptoService } from './qr-crypto.service';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';

/**
 * Auditoria A-S-01: `QR_SECRET_KEY` é a chave HMAC que autentica QR codes de
 * mesa. Sem ela, `TablesService.validateQrCode` retorna `false` silenciosamente,
 * efetivamente bloqueando 100% dos pedidos. Validar no boot (fail-fast em prod)
 * elimina diagnóstico tardio em produção.
 *
 * - dev/test: aceita chaves curtas com warning.
 * - prod: exige >= 32 chars (mesmo padrão de `JWT_SECRET`).
 */
@Module({
  controllers: [TablesController],
  providers: [TablesService, QRCodeCryptoService],
})
export class TablesModule implements OnModuleInit {
  private readonly logger = new Logger(TablesModule.name);

  onModuleInit() {
    assertSecretStrength('QR_SECRET_KEY', process.env.QR_SECRET_KEY);
    if (!process.env.QR_SECRET_KEY) {
      this.logger.warn(
        'QR_SECRET_KEY ausente — todos os QR codes serão rejeitados. Configure antes de produção.'
      );
    }
  }
}
