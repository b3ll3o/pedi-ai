/**
 * Email Service — Resend
 *
 * **POR QUE RESEND?**
 * - API moderna (REST, fetch-based, sem SDK legado).
 * - Plano grátis: 100 emails/dia + 3.000/mês.
 * - Tracking de abertura/clique built-in.
 * - Compatível com React Email templates.
 * - Setup simples (API key + from address).
 *
 * **LGPD:**
 * - Link de descadastro (unsubscribe) incluído em emails de marketing.
 * - Não inclui PII desnecessária (apenas dados essenciais da transação).
 * - Templates armazenados como código (auditáveis).
 *
 * **Fail-safe:**
 * - Sem `RESEND_API_KEY` configurada → no-op silencioso + log warn.
 * - Erro de envio → log error + retém em fila local (TODO: implementar BullMQ queue).
 */

import { trackEvent } from '@/components/analytics/PlausibleAnalytics';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@pedi.ai';
const RESEND_FROM_NAME = process.env.RESEND_FROM_NAME ?? 'PediAI';
const NODE_ENV = process.env.NODE_ENV ?? 'development';

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  /** HTML body. Se ambos `html` e `text` forem fornecidos, `text` é o fallback. */
  html: string;
  text?: string;
  /** Reply-To customizado (default: noreply@pedi.ai). */
  replyTo?: string;
  /** Tags pra tracking no Resend. */
  tags?: { name: string; value: string }[];
  /** Incluir header List-Unsubscribe (obrigatório para emails marketing). */
  marketing?: boolean;
}

export interface SendEmailResult {
  success: boolean;
  /** ID do email no Resend (se enviado). */
  id?: string;
  /** Mensagem de erro (se falhou). */
  error?: string;
}

/**
 * Envia email via Resend API.
 *
 * Documentação: https://resend.com/docs/api-reference/emails/send-email
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  // No-op silencioso em dev/test sem API key.
  if (!RESEND_API_KEY) {
    if (NODE_ENV === 'production') {
      console.warn(
        '[email] RESEND_API_KEY não configurada em produção — email NÃO foi enviado. ' +
          `Assunto: "${options.subject}", Para: ${JSON.stringify(options.to)}`
      );
    } else {
      console.log(
        `[email:dev] Para: ${JSON.stringify(options.to)} | Assunto: ${options.subject}`
      );
    }
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${RESEND_API_KEY}`,
  };

  const body = {
    from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
    to: recipients.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)),
    subject: options.subject,
    html: options.html,
    text: options.text,
    reply_to: options.replyTo,
    tags: options.tags,
    headers: options.marketing
      ? {
          'List-Unsubscribe': `<mailto:${RESEND_FROM_EMAIL}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        }
      : undefined,
  };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[email] Resend API error: ${response.status} ${errorText}`);
      return { success: false, error: `Resend API returned ${response.status}` };
    }

    const result = await response.json();
    return { success: true, id: result.id };
  } catch (error) {
    console.error(`[email] Erro ao enviar email:`, error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Wrapper de tracking: dispara evento Plausible após envio bem-sucedido.
 */
export async function sendEmailTracked(
  eventName: string,
  options: SendEmailOptions
): Promise<SendEmailResult> {
  const result = await sendEmail(options);
  if (result.success && typeof window !== 'undefined') {
    trackEvent('email_sent', { onboardingStep: eventName });
  }
  return result;
}