# Guia de Execução: Email de Confirmação Customizado

Este é um guia passo-a-passo para implementar os templates de email customizados no Supabase.

---

## Pré-requisitos

- Acesso ao Supabase Dashboard (local: http://localhost:54323 ou cloud: https://supabase.com/dashboard)
- Arquivo `public/logo.png` do projeto
- Permissão para configurar templates de autenticação
- Templates HTML em `src/templates/email/` (já criados no projeto)

---

## Phase 1: Upload do Logo

### 1.1 Verificar Storage Configurado

1. Acesse o Supabase Dashboard
2. Vá em **Storage** → **Buckets**
3. Verifique se existe um bucket chamado `product-images`
4. Se não existir, crie um bucket público chamado `product-images`

### 1.2 Upload do Logo

1. No Supabase Dashboard, vá em **Storage** → **Buckets** → **product-images**
2. Clique em **Upload** ou arraste o arquivo `public/logo.png`
3. O arquivo será armazenado como `logo.png` (ou similar)
4. Copie a **Public URL** do arquivo

**URL típica:** `https://xxxxx.supabase.co/storage/v1/object/public/product-images/logo.png`

### 1.3 Documentar URL

Guarde a URL obtida. Ela será usada nos templates no formato:
```
https://xxxxx.supabase.co/storage/v1/object/public/product-images/logo.png
```

---

## Phase 2: Configurar Templates de Email

### Accessar Email Templates

1. No Supabase Dashboard, vá em **Authentication** → **Email Templates**
2. Você verá 4 templates:
   - Confirm signup
   - Reset password
   - Invite user
   - Change email address

### 2.x: Confirm Signup (Confirmação de Email)

1. Abra o arquivo `src/templates/email/confirmation.html`
2. Copie todo o conteúdo HTML (o logo já está configurado)
4. No Supabase Dashboard, vá em **Authentication** → **Email Templates**
5. Clique em **Edit** no template "Confirm signup"
6. No campo **Subject**, insira:
   ```
   📱 Confirme seu email para ativar sua conta Pedi-AI
   ```
7. No campo **Body**, cole o HTML copiado
8. Clique em **Save**

### 2.x: Reset Password (Reset de Senha)

1. Clique em **Edit** no template "Reset password"
2. No campo **Subject**, insira:
   ```
   Redefina sua senha - Pedi-AI
   ```
3. Use o mesmo HTML do template de confirmação, com estas modificações:
   - Texto principal: "Você solicitou a redefinição de senha para sua conta Pedi-AI. Clique no botão abaixo para criar uma nova senha."
   - CTA: "Redefinir Senha"
   - Disclaimer: "Se você não solicitou esta redefinição, ignore este email."
4. Clique em **Save**

### 2.x: Invite User (Convite de Staff)

1. Clique em **Edit** no template "Invite user"
2. No campo **Subject**, insira:
   ```
   Você foi convidado para a equipe Pedi-AI
   ```
3. Use o mesmo HTML do template de confirmação, com estas modificações:
   - Texto principal: "Você foi convidado para fazer parte da equipe do restaurante. Clique no botão abaixo para aceitar o convite e criar sua senha."
   - CTA: "Aceitar Convite"
4. Clique em **Save**

### 2.x: Magic Link

1. Abra `src/templates/email/magic-link.html`
2. Copie o HTML e cole no template "Magic Link" do Supabase
4. Subject: "Seu link de login - Pedi-AI"
5. Save

### 2.x: Change Email Address

1. Abra `src/templates/email/email-change.html`
2. Copie o HTML e cole no template "Change Email Address" do Supabase
4. Subject: "Confirme seu novo email - Pedi-AI"
5. Save

### 2.x: Reauthentication

1. Abra `src/templates/email/reauthentication.html`
2. Copie o HTML e cole no template "Reauthentication" do Supabase
4. Subject: "Confirme sua identidade - Pedi-AI"
5. Save

### 2.x: Notificações de Segurança

Repita o processo para cada template de notificação:
- `password-changed.html` → "Password Changed" (Subject: "Senha alterada - Pedi-AI")
- `email-changed.html` → "Email Changed" (Subject: "Email alterado - Pedi-AI")
- `phone-changed.html` → "Phone Changed" (Subject: "Telefone alterado - Pedi-AI")
- `identity-linked.html` → "Identity Linked" (Subject: "Nova identidade vinculada - Pedi-AI")
- `identity-unlinked.html` → "Identity Unlinked" (Subject: "Identidade desvinculada - Pedi-AI")
- `mfa-factor-enrolled.html` → "MFA Factor Enrolled" (Subject: "Método de MFA adicionado - Pedi-AI")
- `mfa-factor-unenrolled.html` → "MFA Factor Unenrolled" (Subject: "Método de MFA removido - Pedi-AI")

**Nota**: O logo já está configurado em todos os templates. Basta copiar o HTML e colar no Supabase.

---

## Phase 3: Testes

### Criar Conta de Teste

1. Acesse a aplicação em `http://localhost:3000`
2. Tente criar uma conta ou faça login
3. Verifique se recebe o email de confirmação

### Verificar Emails Recebidos

1. Para ambiente local, use **Inbucket** (incluído no Supabase CLI):
   - Acesse http://localhost:54324
   - Emails são interceptados localmente
2. Para ambiente de produção, verifique a caixa de entrada real

### Checklist de Verificação Visual

- [ ] Logo Pedi-AI aparece no email
- [ ] Cores laranja (#E85D04, #F48C06) estão aplicadas
- [ ] Botão CTA está visível e clicável
- [ ] Link funciona e redireciona corretamente
- [ ] Texto está em português brasileiro
- [ ] Disclaimer de segurança está presente

### Testar em Diferentes Clientes

| Cliente | Como Testar |
|---------|-------------|
| Gmail | Forward email para conta Gmail ou abra no Gmail mobile |
| Outlook | Abra no Outlook desktop ou web |
| Apple Mail | Abra no app Mail do macOS/iOS |

---

## Referência: Templates HTML do Projeto

Todos os 13 templates estão em `src/templates/email/`:

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `confirmation.html` | Auth | Confirmação de cadastro |
| `reset-password.html` | Auth | Recuperação de senha |
| `staff-invitation.html` | Auth | Convite de staff |
| `magic-link.html` | Auth | Login sem senha |
| `email-change.html` | Auth | Confirmação de mudança de email |
| `reauthentication.html` | Auth | Reautenticação |
| `password-changed.html` | Notification | Senha alterada |
| `email-changed.html` | Notification | Email alterado |
| `phone-changed.html` | Notification | Telefone alterado |
| `identity-linked.html` | Notification | Identidade vinculada |
| `identity-unlinked.html` | Notification | Identidade desvinculada |
| `mfa-factor-enrolled.html` | Notification | MFA adicionado |
| `mfa-factor-unenrolled.html` | Notification | MFA removido |

**Nota**: O logo já está configurado com a URL real em todos os templates.

---

## Rollback

Se precisar reverter para o template padrão:

1. No Supabase Dashboard, vá em **Authentication** → **Email Templates**
2. Clique em **Reset to default** para o template afetado
3. O template voltará ao padrão do Supabase

---

## Suporte

Se encontrar problemas:

1. Verifique se a URL do logo está correta e acessível
2. Teste o link de confirmação em janela anônima
3. Verifique se o email não foi marcado como spam