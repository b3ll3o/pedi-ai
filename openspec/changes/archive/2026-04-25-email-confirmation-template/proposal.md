# Proposal: Email de Confirmação Customizado - Pedi-AI

## Intent

Substituir o template genérico de email de confirmação do Supabase por um template personalizado que segue a identidade visual do Pedi-AI (cores, tipografia, logo), proporcionando uma experiência mais profissional e memorável para os usuários.

## Scope

### In Scope

- Criar template HTML customizado para email de confirmação do Supabase
- Criar template HTML customizado para email de reset de senha
- Criar template HTML customizado para email de convite de staff
- Aplicar estilo consistente em todos os templates de autenticação
- Aplicar paleta de cores oficial do Pedi-AI (#E85D04, #F48C06, #DC2626)
- Incluir logo e branding consistente com a landing page
- Configurar no Supabase Dashboard o novo template
- Documentar variáveis disponíveis do Supabase para referência
- Templates HTML físicos criados em `src/templates/email/`:
  - `confirmation.html` - Confirmação de cadastro
  - `reset-password.html` - Recuperação de senha
  - `staff-invitation.html` - Convite de staff
  - `magic-link.html` - Login sem senha
  - `email-change.html` - Confirmação de mudança de email
  - `reauthentication.html` - Reautenticação
  - `password-changed.html` - Notificação de senha alterada
  - `email-changed.html` - Notificação de email alterado
  - `phone-changed.html` - Notificação de telefone alterado
  - `identity-linked.html` - Notificação de identidade vinculada
  - `identity-unlinked.html` - Notificação de identidade desvinculada
  - `mfa-factor-enrolled.html` - Notificação de MFA adicionado
  - `mfa-factor-unenrolled.html` - Notificação de MFA removido
  - `partials/header.html` - Partial do header
  - `partials/footer.html` - Partial do footer

### Out of Scope

- Alterar lógica de autenticação ou fluxo de cadastro
- Implementar versões dark mode para emails (clientes de email não suportam bem)
- Testes E2E específicos para email (testar manualmente)

## Approach

### Templates HTML Criados

Todos os 13 templates do Supabase Auth foram criados em `src/templates/email/`:

**Autenticação (6):**
1. Confirm Signup - `confirmation.html`
2. Invite User - `staff-invitation.html`
3. Magic Link - `magic-link.html`
4. Change Email Address - `email-change.html`
5. Reset Password - `reset-password.html`
6. Reauthentication - `reauthentication.html`

**Notificações de Segurança (7):**
7. Password Changed - `password-changed.html`
8. Email Address Changed - `email-changed.html`
9. Phone Number Changed - `phone-changed.html`
10. Identity Linked - `identity-linked.html`
11. Identity Unlinked - `identity-unlinked.html`
12. MFA Factor Enrolled - `mfa-factor-enrolled.html`
13. MFA Factor Unenrolled - `mfa-factor-unenrolled.html`

### Passo 1: Obter Logo Hospedado

O logo do projeto está em `/public/logo.png`. Precisamos de uma URL pública para incluir no email. Opções:
- Usar o domínio de produção (se já deployado)
- Fazer upload para um CDN/bucket do Supabase Storage
- Usar base64 inline (não recomendado para emails)

### Passo 2: Configurar Template no Supabase

1. Acessar Supabase Dashboard → Authentication → Email Templates
2. Editar template "Confirm signup"
3. Substituir HTML pelo template customizado
4. Configurar variáveis:
   - `{{ .User.Email }}` para email do usuário
   - `{{ .ConfirmationURL }}` para link de confirmação

### Passo 3: Template HTML

O template deve seguir as diretrizes:
- Tabela-based layout para compatibilidade com clientes de email antigos
- Max-width de 480px para leitura confortável
- Gradiente laranja (#E85D04 → #F48C06) no header
- CTA button com sombra e gradiente
- Disclaimer de segurança
- Footer com branding

## Affected Areas

### Arquivos do projeto:
- `src/templates/email/confirmation.html` - Template de confirmação de email (NOVO)
- `src/templates/email/reset-password.html` - Template de reset de senha (NOVO)
- `src/templates/email/staff-invitation.html` - Template de convite de staff (NOVO)
- `src/templates/email/partials/header.html` - Partial do header (NOVO)
- `src/templates/email/partials/footer.html` - Partial do footer (NOVO)
- `/public/logo.png` - já existe, precisa de URL pública para hospedagem
- Supabase Dashboard (configuração externa)

### Configuração Externa:
- Supabase Authentication → Email Templates

## Risks

### Risk 1: Logo não carrega em clientes de email
- **Probabilidade**: Média (alguns bloqueiam imagens externas)
- **Impacto**: Email sem logo visual
- **Mitigação**: Incluir texto "Pedi-AI" como fallback no alt tag

### Risk 2: Link de confirmação não funciona
- **Probabilidade**: Baixa
- **Impacto**: Usuário não consegue confirmar email
- **Mitigação**: Testar manualmente após implementação; incluir link textual como fallback

### Risk 3: Template quebrado em clientes específicos
- **Probabilidade**: Média (Outlook é conhecido por problemas)
- **Impacto**: Experiência visual ruim
- **Mitigação**: Usar tabela-based layout; testar em principais clientes (Gmail, Outlook, Apple Mail)

## Rollback Plan

1. Acessar Supabase Dashboard → Authentication → Email Templates
2. Clicar em "Reset to default" ouColar template original do Supabase
3. Verificar funcionamento do fluxo de cadastro

## Success Criteria

- [x] Templates HTML criados seguindo identidade visual (13 templates)
- [ ] Configurar todos os templates no Supabase Dashboard
- [ ] Testar emails de autenticação (confirmação, reset, convite, magic link)
- [ ] Testar notificações de segurança

## Variáveis do Template

| Variável | Descrição |
|----------|-----------|
| `{{ .User.Email }}` | Email do usuário |
| `{{ .ConfirmationURL }}` | Link de confirmação |
| `{{ .Token }}` | Token de confirmação |
| `{{ .TokenHash }}` | Hash do token |
| `{{ .OTP }}` | Código OTP |
| `{{ .SiteURL }}` | URL do site configurada |

## Anexo: Template HTML Completo

Os templates HTML completos estão disponíveis em:
- `src/templates/email/confirmation.html`
- `src/templates/email/reset-password.html`
- `src/templates/email/staff-invitation.html`

Estes arquivos contêm o HTML completo com variáveis Supabase (`{{ .User.Email }}`, `{{ .ConfirmationURL }}`, etc.) e placeholder `{{LOGO_URL}}` para a URL do logo.

### Template de Reset de Senha

O mesmo template HTML é usado, com as seguintes alterações:
- Substituir o texto do heading: "Olá, {{ .User.Email }}!" → pode permanecer
- Substituir o texto principal: "Obrigigado por criar sua conta..." → "Você solicitou a redefinição de senha para sua conta Pedi-AI. Clique no botão abaixo para criar uma nova senha."
- Substituir o CTA: "Confirmar Email" → "Redefinir Senha"
- Substituir o disclaimer: "Se você não criou uma conta..." → "Se você não solicitou esta redefinição, ignore este email."
- Usar `{{ .ConfirmationURL }}` para o link de reset

### Template de Convite de Staff

O mesmo template HTML é usado, com as seguintes alterações:
- Substituir o texto principal: "Você foi convidado para fazer parte da equipe do restaurante [Nome]. Clique no botão abaixo para aceitar o convite e criar sua senha."
- Substituir o CTA: "Confirmar Email" → "Aceitar Convite"

## Sugestões de Assunto

| Tipo | Assunto |
|------|---------|
| **Confirm Email** | 📱 Confirme seu email para ativar sua conta Pedi-AI |
| **Reset de Senha** | Redefina sua senha - Pedi-AI |
| **Staff Invitation** | Você foi convidado para a equipe Pedi-AI |
| **Alternativo** | Pedi-AI - Confirme seu cadastro |
| **Curto** | Ative sua conta: Confirme seu email |