import styles from './page.module.css';

export const metadata = {
  title: 'Política de Privacidade — PediAI',
  description: 'Política de Privacidade da PediAI conforme Lei nº 13.709/2018 (LGPD).',
};

const content = String.raw`# Política de Privacidade — PediAI

> **Última atualização:** 06 de julho de 2026
> **Versão:** 1.0.0
> **Encarregado de Dados (DPO):** dpo@pedi.ai

A PediAI valoriza sua privacidade. Esta Política descreve como coletamos, usamos, armazenamos e protegemos seus dados pessoais, em conformidade com a **Lei nº 13.709/2018 (LGPD — Lei Geral de Proteção de Dados)**.

---

## 1. Quem somos

**PediAI Tecnologia Ltda.**
CNPJ: XX.XXX.XXX/0001-XX
Endereço: São Paulo/SP, Brasil
**DPO:** dpo@pedi.ai

---

## 2. Dados que coletamos

### 2.1. Dados do Usuário (dono/gerente de restaurante)

Coletamos quando você cria uma conta:
- Nome completo
- Email
- Telefone (opcional)
- Senha (hasheada com bcrypt, nunca armazenada em texto puro)
- Foto de perfil (opcional)

### 2.2. Dados do Restaurante

- Nome do estabelecimento
- CNPJ
- Endereço
- Telefone para contato com clientes
- Logo e imagens (hospedadas em CDN)
- Configurações de cardápio (produtos, preços, categorias)
- Dados de pagamento (processados por Asaas, não armazenados por nós)

### 2.3. Dados do Cliente Final (em nome do Restaurante)

Quando um cliente acessa o cardápio digital e faz um pedido:
- Nome (opcional)
- Telefone (obrigatório para notificação)
- Endereço de entrega (se aplicável)
- Histórico de pedidos
- Preferências alimentares (se informadas)

> **Importante:** o Restaurante é o **controlador** dos dados do Cliente Final. A PediAI atua como **operadora**, processando dados em nome do Restaurante conforme contrato.

### 2.4. Dados técnicos

Coletados automaticamente:
- Endereço IP (mascarado em logs, conforme auditoria LGPD)
- Tipo de dispositivo e navegador
- Sistema operacional
- Páginas acessadas (via Plausible Analytics — sem cookies, sem PII)
- Logs de erro (via Sentry — com PII mascarado)

---

## 3. Como usamos seus dados

| Finalidade | Base legal (LGPD) |
|---|---|
| Operar a Plataforma (criar cardápio, processar pedidos) | Execução de contrato (Art. 7º, V) |
| Cobrança e billing | Execução de contrato (Art. 7º, V) |
| Suporte ao cliente | Legítimo interesse (Art. 7º, IX) |
| Comunicações transacionais (email de pedido, cobrança) | Execução de contrato (Art. 7º, V) |
| Comunicações de marketing (novidades, promoções) | Consentimento (Art. 7º, I) — opt-in |
| Prevenção de fraude e segurança | Legítimo interesse (Art. 7º, IX) |
| Cumprimento de obrigações legais/fiscais | Obrigação legal (Art. 7º, II) |
| Analytics agregado (Plausible) | Legítimo interesse (Art. 7º, IX) |

**Nunca** vendemos seus dados. **Nunca** compartilhamos com terceiros para fins de marketing.

---

## 4. Com quem compartilhamos dados

### 4.1. Operadores (processam dados em nosso nome)

- **Mercado Pago** — processamento de pagamento PIX dos pedidos de Clientes Finais
- **Asaas** — cobrança recorrente da assinatura SaaS
- **Resend** — envio de emails transacionais
- **Vercel** — hosting do frontend (Next.js)
- **Fly.io / VPS** — hosting do backend (NestJS + Postgres)
- **Cloudflare** — CDN e proteção DDoS
- **Sentry** — error tracking (com PII mascarado)
- **Plausible** — analytics (sem cookies, sem PII)

### 4.2. Autoridades

Compartilhamos dados com autoridades quando:
- Determinação judicial ou requisição do Ministério Público.
- Obrigação legal (ex.: Receita Federal, ANPD).
- Proteção de direitos em processos judiciais.

---

## 5. Por quanto tempo mantemos seus dados

| Tipo de dado | Prazo de retenção | Base |
|---|---|---|
| Dados cadastrais (Usuário) | Enquanto a conta existir + 90 dias após encerramento | Contrato + obrigação legal |
| Histórico de pedidos | 5 anos após último pedido | Obrigação fiscal (CTN, Art. 173/74) |
| Registros fiscais (NFe) | 5 anos | Obrigação legal |
| Logs de acesso | 6 meses | Marco Civil da Internet (Art. 15) |
| Logs de erro (Sentry) | 90 dias | Legítimo interesse |
| Analytics agregado | 24 meses | Legítimo interesse |

Após esses prazos, os dados são **excluídos irreversivelmente**.

---

## 6. Seus direitos (LGPD, Art. 18)

Você tem direito a:

6.1. **Confirmação** da existência de tratamento.

6.2. **Acesso** aos seus dados.

6.3. **Correção** de dados incompletos, inexatos ou desatualizados.

6.4. **Anonimização, bloqueio ou eliminação** de dados desnecessários ou tratados em desconformidade.

6.5. **Portabilidade** dos seus dados (em formato estruturado, JSON).

6.6. **Eliminação** dos dados tratados com consentimento.

6.7. **Informação** sobre entidades públicas e privadas com as quais compartilhamos dados.

6.8. **Revogação do consentimento** (para tratamentos que dependem dele).

**Como exercer:** envie email para **dpo@pedi.ai** com seu pedido. Responderemos em até **15 dias úteis**.

---

## 7. Segurança da informação

Adotamos medidas técnicas e administrativas para proteger seus dados:

- ✅ Senhas hasheadas com **bcrypt** (nunca armazenadas em texto puro)
- ✅ Comunicação criptografada **TLS 1.3** (HTTPS)
- ✅ Tokens JWT com **expiração curta** (15 min) + refresh tokens rotacionados
- ✅ **Rate limiting** contra ataques de força bruta
- ✅ **CORS restrito** (sem wildcard em produção)
- ✅ **Helmet + CSP** com nonce por request
- ✅ **Bcrypt timing-safe equal** em comparações
- ✅ **Logs com PII mascarado** (IPs em produção)
- ✅ **Backup automático** do banco (criptografado em repouso)
- ✅ **Auditoria de segurança** periódica (varredura 8-10 documentada)
- ✅ **OpenTelemetry** para rastreamento de incidentes
- ✅ **Sentry** para detecção proativa de bugs/erros

---

## 8. Cookies

A PediAI utiliza **apenas cookies estritamente necessários**:

| Cookie | Finalidade | Duração |
|---|---|---|
| \`pedi_auth_refresh_token\` | Manter sessão logada | 7 dias (httpOnly, secure) |
| \`pedi_auth_access_token\` | Espelho para server-side gate | 15 min (httpOnly, secure) |
| \`pedi_cart_id\` | Identificar carrinho offline | 30 dias |

**Não usamos cookies de tracking, analytics ou publicidade de terceiros.**

Plausible Analytics é **cookie-less** por padrão — dispensa consentimento prévio conforme orientação da ANPD.

---

## 9. Transferência internacional

Seus dados são **armazenados primariamente no Brasil** (Postgres em VPS brasileiro).

Em caso de transferência internacional (ex.: Cloudflare CDN nos EUA), garantimos:
- Cláusulas contratuais padrão (Standard Contractual Clauses).
- Criptografia em trânsito e em repouso.
- Provedores em conformidade com LGPD e GDPR.

---

## 10. Dados de menores

A Plataforma **não é direcionada a menores de 18 anos**. Não coletamos intencionalmente dados de crianças.

Se identificarmos dados de menores coletados sem consentimento dos responsáveis, removeremos imediatamente.

---

## 11. Alterações nesta Política

Podemos atualizar esta Política. Avisaremos por:
- Email cadastrado (com 30 dias de antecedência para mudanças relevantes).
- Banner na Plataforma.

A versão atual está sempre disponível em **https://pedi.ai/privacidade** com a data da última atualização no topo.

---

## 12. Contato

**Encarregado de Dados (DPO):**
📧 dpo@pedi.ai

**Suporte geral:**
📧 contato@pedi.ai
💬 https://pedi.ai/suporte

**Direitos do titular (LGPD Art. 18):**
📧 dpo@pedi.ai (resposta em até 15 dias úteis)

---

**Você sempre pode revogar consentimentos, solicitar portabilidade ou eliminar seus dados. Basta enviar email para dpo@pedi.ai.**`;

export default function PrivacidadePage() {
  return (
    <main className={styles.container}>
      <h1>Política de Privacidade</h1>
      <pre className={styles.content}>{content}</pre>
    </main>
  );
}
