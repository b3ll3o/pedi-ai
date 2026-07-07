/**
 * Templates de Email Transacional
 *
 * **POR QUE TEMPLATES EM TSX?**
 * - Type-safe (autocomplete de variáveis)
 * - Testáveis (snapshot tests)
 * - Reutilizáveis (componentes React para header/footer)
 *
 * **Estilo:**
 * - Mobile-first (60%+ dos emails abertos em mobile)
 * - Inline CSS (clientes de email ignoram <style>)
 * - Tabelas para layout (clientes antigos ignoram flexbox)
 * - Sem imagens externas (filtros anti-spam)
 */

import { sendEmail, type SendEmailOptions } from './send-email';

/**
 * Layout base compartilhado por todos os emails.
 */
function baseLayout({ title, body, ctaLabel, ctaUrl }: {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; color: #111827;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header com logo -->
          <tr>
            <td style="background-color: #2563eb; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">PediAI</h1>
            </td>
          </tr>
          <!-- Conteúdo -->
          <tr>
            <td style="padding: 32px 24px;">
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">${title}</h2>
              <div style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                ${body}
              </div>
              ${ctaLabel && ctaUrl ? `
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
                  <tr>
                    <td style="background-color: #2563eb; border-radius: 6px;">
                      <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px;">
                        ${ctaLabel}
                      </a>
                    </td>
                  </tr>
                </table>
              ` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
                PediAI — Cardápio digital para restaurantes.<br>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://pedi-ai.com'}/privacidade" style="color: #2563eb;">Política de Privacidade</a> · <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://pedi-ai.com'}/termos" style="color: #2563eb;">Termos</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ── Template: Bem-vindo ao PediAI ──────────────────────
export function welcomeEmail({ userName, trialEndDate, loginUrl }: {
  userName: string;
  trialEndDate: Date;
  loginUrl: string;
}): SendEmailOptions {
  const trialEndFormatted = trialEndDate.toLocaleDateString('pt-BR');

  return {
    subject: `Bem-vindo ao PediAI, ${userName}! 🎉`,
    html: baseLayout({
      title: `Olá, ${userName}!`,
      body: `
        <p>Que bom ter você com a gente! 🎉</p>
        <p>Sua conta foi criada com sucesso e você tem <strong>14 dias de trial grátis</strong> para explorar todas as funcionalidades do PediAI.</p>
        <p>Seu trial termina em <strong>${trialEndFormatted}</strong>. Depois disso, é só assinar um dos nossos planos a partir de <strong>R$ 49,90/mês</strong>.</p>
        <p><strong>Próximos passos:</strong></p>
        <ol>
          <li>Configure seu restaurante (nome, endereço, horários)</li>
          <li>Adicione seus primeiros produtos ao cardápio</li>
          <li>Imprima o QR Code da mesa</li>
          <li>Receba seu primeiro pedido!</li>
        </ol>
        <p>Qualquer dúvida, é só responder este email. Estamos aqui pra ajudar.</p>
      `,
      ctaLabel: 'Acessar meu painel',
      ctaUrl: loginUrl,
    }),
    text: `Olá, ${userName}! Bem-vindo ao PediAI. Trial grátis até ${trialEndFormatted}. Acesse: ${loginUrl}`,
    tags: [{ name: 'template', value: 'welcome' }],
  };
}

// ── Template: Trial expira em X dias ────────────────────
export function trialExpiringEmail({ userName, daysLeft, upgradeUrl, planPrice }: {
  userName: string;
  daysLeft: number;
  upgradeUrl: string;
  planPrice: string;
}): SendEmailOptions {
  return {
    subject: `Seu trial do PediAI acaba em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'} ⏰`,
    html: baseLayout({
      title: `${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'} restantes`,
      body: `
        <p>Oi, ${userName}!</p>
        <p>Seu período de trial gratuito do PediAI acaba em <strong>${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}</strong>.</p>
        <p>Para continuar usando a plataforma sem interrupções, ative um dos nossos planos a partir de <strong>${planPrice}</strong>.</p>
        <p><strong>Por que assinar?</strong></p>
        <ul>
          <li>✅ Cardápio digital ilimitado</li>
          <li>✅ PIX integrado com confirmação automática</li>
          <li>✅ Kitchen Display em tempo real</li>
          <li>✅ Funciona offline (modo PWA)</li>
          <li>✅ QR Code por mesa</li>
          <li>✅ Analytics de vendas</li>
        </ul>
        <p>Sem fidelidade. Cancele quando quiser.</p>
      `,
      ctaLabel: 'Ativar plano agora',
      ctaUrl: upgradeUrl,
    }),
    tags: [{ name: 'template', value: 'trial_expiring' }, { name: 'days_left', value: String(daysLeft) }],
    marketing: true,
  };
}

// ── Template: Pagamento confirmado ──────────────────────
export function paymentConfirmedEmail({ userName, planName, amount, invoiceUrl }: {
  userName: string;
  planName: string;
  amount: string;
  invoiceUrl: string;
}): SendEmailOptions {
  return {
    subject: `✅ Pagamento confirmado — Plano ${planName}`,
    html: baseLayout({
      title: 'Pagamento confirmado!',
      body: `
        <p>Oi, ${userName}!</p>
        <p>Recebemos seu pagamento do plano <strong>${planName}</strong> no valor de <strong>${amount}</strong>.</p>
        <p>Sua assinatura está ativa e você tem acesso completo à plataforma.</p>
        <p>A nota fiscal e o histórico de pagamentos estão disponíveis no seu painel.</p>
      `,
      ctaLabel: 'Ver nota fiscal',
      ctaUrl: invoiceUrl,
    }),
    tags: [{ name: 'template', value: 'payment_confirmed' }],
  };
}

// ── Template: Pedido recebido (pra restaurante) ───────
export function orderReceivedEmail({ restaurantName, orderId, total, kitchenUrl }: {
  restaurantName: string;
  orderId: string;
  total: string;
  kitchenUrl: string;
}): SendEmailOptions {
  return {
    subject: `🍽️ Novo pedido recebido — #${orderId}`,
    html: baseLayout({
      title: 'Novo pedido!',
      body: `
        <p>Olá, ${restaurantName}!</p>
        <p>Você recebeu um novo pedido <strong>#${orderId}</strong> no valor de <strong>${total}</strong>.</p>
        <p>Acesse o Kitchen Display para ver os detalhes e iniciar o preparo.</p>
      `,
      ctaLabel: 'Ver na cozinha',
      ctaUrl: kitchenUrl,
    }),
    tags: [{ name: 'template', value: 'order_received' }],
  };
}

// ── Helper: envia um template com tracking ─────────────
export async function sendTemplate(template: SendEmailOptions): Promise<void> {
  await sendEmail(template);
}