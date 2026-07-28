/**
 * @spec(A11, A3)
 *
 * Módulo global de filas. Fornece `QueueService` (wrapper sobre BullMQ)
 * e `EmailQueue` (fila de e-mails para AuthService).
 *
 * `@Global()` permite que qualquer módulo injete QueueService/EmailQueue
 * sem precisar importar QueueModule explicitamente.
 *
 * Auditoria origem: A3 — fila de e-mails para reset de senha.
 */
import { Global, Module, OnModuleDestroy } from '@nestjs/common';

import { EmailQueue } from './email.queue';
import { QueueService } from './queue.service';

@Global()
@Module({
  providers: [QueueService, EmailQueue],
  exports: [QueueService, EmailQueue],
})
export class QueueModule implements OnModuleDestroy {
  constructor(private readonly queueService: QueueService) {}

  async onModuleDestroy() {
    await this.queueService.shutdown();
  }
}