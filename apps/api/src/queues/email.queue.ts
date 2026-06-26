import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { QueueService } from './queue.module';

/**
 * Fila de envio de e-mails (reset de senha, etc).
 *
 * Antes: `console.log` no `AuthService.requestPasswordReset` (A3).
 * Depois: enfileira via BullMQ com retry exponencial (3 tentativas).
 *
 * Em dev/CI sem Redis, opera em modo no-op (apenas log).
 */
export const EMAIL_QUEUE_NAME = 'email';

export interface EmailJob {
  to: string;
  subject: string;
  body: string;
  type: 'password-reset' | 'order-confirmation' | 'generic';
}

@Injectable()
export class EmailQueue implements OnModuleInit {
  private readonly logger = new Logger(EmailQueue.name);

  constructor(private readonly queueService: QueueService) {}

  onModuleInit() {
    // HIGH-012 (2ª varredura QA): o handler do BullMQ recebe o `Job<T>`
    // completo, onde `data` é o `EmailJob`. Para acessar `job.id`, precisamos
    // tipar corretamente o handler — antes o tipo estava errado e
    // `job.id` era confundido com `EmailJob.id`.
    this.queueService.register<EmailJob>(
      {
        name: EMAIL_QUEUE_NAME,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
        },
      },
      async (job) => {
        // `job` aqui é o payload `EmailJob` (já extraído pelo worker em
        // `queue.module.ts:88`). O ID real do job BullMQ é logado pelo
        // próprio worker (linha 90 do queue.module.ts) — aqui só precisamos
        // do conteúdo do email.
        // Implementação concreta: SMTP via nodemailer / Mailgun / SES.
        // Stub atual: log + audit. Em produção, substituir por adapter SMTP.
        //
        // Auditoria ACHADO-4 (Re-varredura 5): antes logava `job.to` (email do
        // destinatário) em texto puro — viola LGPD. Agora mascara o email
        // (`us***@dominio.com`) para manter diagnóstico operacional sem
        // expor PII em logs agregados.
        const maskedTo = maskEmail(job.to);
        this.logger.log(`[email] enviando '${job.subject}' para ${maskedTo} (tipo=${job.type})`);
        // TODO(EMAIL-001): integrar com SMTP (Mailpit em dev / SES em prod)
      }
    );
  }

  async sendPasswordReset(email: string, resetLink: string): Promise<void> {
    await this.queueService.enqueue<EmailJob>(EMAIL_QUEUE_NAME, {
      to: email,
      subject: 'Redefinição de senha',
      body: `Clique no link para redefinir sua senha: ${resetLink}`,
      type: 'password-reset',
    });
  }
}

/**
 * Mascara email para logs: `usuario@dominio.com` → `us***@dominio.com`.
 * Mantém apenas 2 primeiros chars do usuário + domínio completo (necessário
 * para diagnóstico de qual servidor SMTP receber o email).
 */
function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}
