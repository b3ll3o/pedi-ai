import { Logger, Module, OnModuleInit } from '@nestjs/common';

import { assertSecretStrength } from '../auth/secret-strength';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule implements OnModuleInit {
  private readonly logger = new Logger(PaymentsModule.name);

  /**
   * Auditoria C-S-01: `MP_WEBHOOK_SECRET` valida HMAC dos webhooks PIX.
   * Sem ele, o controller **recusa 100% dos webhooks** (validação de assinatura
   * é obrigatória) — sem warning no boot, isso só aparece quando o MP tenta
   * notificar e o cliente percebe que pagamentos não estão sendo confirmados.
   * Fail-fast em prod.
   */
  onModuleInit() {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) {
      const msg = 'MP_WEBHOOK_SECRET ausente — webhooks PIX serão recusados.';
      if (process.env.NODE_ENV === 'production') {
        throw new Error(msg);
      }
      this.logger.warn(msg);
    } else {
      assertSecretStrength('MP_WEBHOOK_SECRET', secret);
    }
  }
}
