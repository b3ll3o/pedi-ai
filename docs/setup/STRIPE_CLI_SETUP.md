# Configuração do Stripe CLI para Webhooks

Este documento descreve como configurar o Stripe CLI para testar webhooks Stripe localmente.

## Instalação do Stripe CLI

### Linux (apt)

```bash
# 1. Adicionar a chave GPG do Stripe
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg > /dev/null

# 2. Adicionar o repositório apt
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list

# 3. Atualizar e instalar
sudo apt update && sudo apt install stripe
```

### macOS (Homebrew)

```bash
brew install stripe/stripe-cli/stripe
```

### Linux (download direto)

```bash
# Baixar a última versão do GitHub
curl -sSL https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz -o stripe.tar.gz
tar -xvf stripe.tar.gz
mv stripe ~/.local/bin/
rm stripe.tar.gz
```

## Login no Stripe CLI

Após instalar, faça login na sua conta Stripe:

```bash
stripe login
```

Isso abrirá o navegador para autenticação. Siga as instruções na tela.

## Iniciar o Listener de Webhooks

Com o servidor de desenvolvimento rodando (`npm run dev`), execute:

```bash
npm run stripe:listen
```

O comando deve exibir algo como:

```
Ready! You are listening to webhooks on https://localhost:3000/api/webhooks/stripe

> Using webhook secret `whsec_...` (copie este valor)
```

## Configurar o Environment

1. Copie o **webhook secret** (`whsec_...`) outputado pelo `stripe listen`
2. Cole no `.env.test`:

```env
STRIPE_WEBHOOK_SECRET=whsec_sua_chave_aqui
```

## Testar Webhooks

### Via Dashboard Stripe

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com)
2. Vá em **Developers** > **Webhooks**
3. Selecione seu endpoint ou crie um novo
4. Clique em **Send test event**
5. Escolha um evento (ex: `payment_intent.succeeded`)
6. Clique em **Send test webhook**

### Via CLI

```bash
# Listar eventos disponíveis
stripe events list

# Trigger um evento manualmente
stripe trigger payment_intent.succeeded
```

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run stripe:listen` | Inicia o listener de webhooks na porta 3000 |

## Troubleshooting

### "stripe: command not found"

Ensure Stripe CLI está no PATH. Tente:

```bash
# Verificar instalação
which stripe
stripe --version

# Se instalado manualmente, adicione ao PATH
export PATH="$HOME/.local/bin:$PATH"
```

### Webhooks não chegam

1. Verifique se o servidor de desenvolvimento está rodando na porta 3000
2. Verifique se o `STRIPE_WEBHOOK_SECRET` está correto no `.env.test`
3. Verifique se não há firewall bloqueando conexões localhost

### Erro de autenticação

```bash
# Refazer login
stripe logout
stripe login
```

## Referências

- [Documentação oficial do Stripe CLI](https://docs.stripe.com/stripe-cli)
- [Referência da API de Webhooks](https://docs.stripe.com/webhooks)
