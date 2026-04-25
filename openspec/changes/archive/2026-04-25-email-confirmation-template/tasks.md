# Tasks: Email de Confirmação Customizado - Pedi-AI

> ⚠️ **NOTA**: Esta mudança requer configuração manual no Supabase Dashboard.
> Execute os passos abaixo seguindo o guia: `EXECUCAO.md`

> ✅ **Templates HTML criados** em `src/templates/email/` (13 templates + 2 partials)

## Phase 1: Preparação

- [x] 1.1 Verificar se o bucket de storage do Supabase está configurado para arquivos públicos
- [x] 1.2 Fazer upload do logo (public/logo.png) para o Supabase Storage
- [x] 1.3 Obter a URL pública do logo hospedado no Supabase Storage
- [x] 1.4 Logo configurado em todos os 13 templates em `src/templates/email/`

## Phase 2: Configuração do Template de Confirmação

- [ ] 2.1 Acessar Supabase Dashboard → Authentication → Email Templates
- [ ] 2.2 Selecionar o template "Confirm signup" para edição
- [ ] 2.3 Copiar o conteúdo do arquivo `src/templates/email/confirmation.html` para o Supabase Dashboard
- [ ] 2.4 Configurar assunto: "📱 Confirme seu email para ativar sua conta Pedi-AI"
- [ ] 2.5 Salvar o template

## Phase 2.2: Configuração do Template de Reset de Senha

- [ ] 2.6 Selecionar o template "Reset password" para edição
- [ ] 2.7 Copiar conteúdo de `reset-password.html`
- [ ] 2.8 Configurar assunto: "Redefina sua senha - Pedi-AI"
- [ ] 2.9 Salvar o template

## Phase 2.3: Configuração do Template de Staff Invitation

- [ ] 2.10 Selecionar o template "Invite user" para edição
- [ ] 2.11 Copiar conteúdo de `staff-invitation.html`
- [ ] 2.12 Configurar assunto: "Você foi convidado para a equipe Pedi-AI"
- [ ] 2.13 Salvar o template

## Phase 2.4: Templates de Magic Link e Change Email

- [ ] 2.14 Configurar template "Magic Link" com conteúdo de `magic-link.html`
- [ ] 2.15 Configurar template "Change Email Address" com conteúdo de `email-change.html`
- [ ] 2.16 Configurar template "Reauthentication" com conteúdo de `reauthentication.html`

## Phase 2.5: Templates de Notificações de Segurança

- [ ] 2.17 Configurar template "Password Changed" com conteúdo de `password-changed.html`
- [ ] 2.18 Configurar template "Email Changed" com conteúdo de `email-changed.html`
- [ ] 2.19 Configurar template "Phone Changed" com conteúdo de `phone-changed.html`
- [ ] 2.20 Configurar template "Identity Linked" com conteúdo de `identity-linked.html`
- [ ] 2.21 Configurar template "Identity Unlinked" com conteúdo de `identity-unlinked.html`
- [ ] 2.22 Configurar template "MFA Factor Enrolled" com conteúdo de `mfa-factor-enrolled.html`
- [ ] 2.23 Configurar template "MFA Factor Unenrolled" com conteúdo de `mfa-factor-unenrolled.html`

## Phase 3: Testes

- [ ] 3.1 Criar uma conta de teste no ambiente de desenvolvimento
- [ ] 3.2 Verificar receipt do email de confirmação
- [ ] 3.3 Validar que o logo carrega corretamente no email
- [ ] 3.4 Validar que o botão CTA está funcional e redireciona para página correta
- [ ] 3.5 Testar renderização em Gmail (web)
- [ ] 3.6 Testar renderização em Outlook (desktop)
- [ ] 3.7 Testar renderização em Apple Mail
- [ ] 3.8 Testar fluxo de password reset (solicitar reset e verificar email)
- [ ] 3.9 Testar convite de staff (criar staff user e verificar email)
- [ ] 3.10 Executar todos os testes dentro de 24h (prazo de expiração do link)
- [ ] 3.11 Testar template Magic Link (solicitar link e verificar email)
- [ ] 3.12 Testar template Change Email Address
- [ ] 3.13 Testar template Reauthentication
- [ ] 3.14 Testar template Password Changed
- [ ] 3.15 Testar template Email Changed
- [ ] 3.16 Testar template Phone Changed
- [ ] 3.17 Testar template Identity Linked
- [ ] 3.18 Testar template Identity Unlinked
- [ ] 3.19 Testar template MFA Factor Enrolled
- [ ] 3.20 Testar template MFA Factor Unenrolled
- [ ] 3.21 Validar renderização de todos os 13 templates em Gmail, Outlook e Apple Mail

## Phase 4: Documentação

- [x] 4.1 Guia de execução criado em `EXECUCAO.md`
- [x] 4.2 Documentado que todos os templates de auth usam o mesmo layout base
- [x] 4.3 Documentadas variáveis disponíveis do Supabase para templates de email
- [x] 4.4 Logo URL: `https://trbegkizilsoomlxtaww.supabase.co/storage/v1/object/sign/product-images/logo.png?...`
- [x] 4.5 Templates HTML físicos criados em `src/templates/email/` (13 templates + 2 partials)

## Verification Criteria

- [x] Templates HTML criados seguindo identidade visual (13 templates)
- [ ] Todos os 13 templates configurados no Supabase Dashboard
- [ ] Emails de autenticação funcionando com branding correto
- [ ] Notificações de segurança funcionando com branding correto