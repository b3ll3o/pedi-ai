# Mailpit - Servidor SMTP Local para Testes

Mailpit é um servidor SMTP mock leve que captura emails enviados pela aplicação durante testes de desenvolvimento.

## Instalação

### 1. Baixar o binário do Mailpit

```bash
# Criar diretório local para binários
mkdir -p ~/.local/bin

# Download da versão mais recente (Linux amd64)
curl -sL "https://github.com/axllent/mailpit/releases/download/v1.29.7/mailpit-linux-amd64.tar.gz" -o /tmp/mailpit.tar.gz

# Extrair e instalar
tar -xzf /tmp/mailpit.tar.gz -C ~/.local/bin
chmod +x ~/.local/bin/mailpit

# Adicionar ao PATH (adicione ao ~/.bashrc ou ~/.zshrc)
export PATH="$HOME/.local/bin:$PATH"
```

### 2. Verificar instalação

```bash
mailpit version
```

## Uso

### Iniciar o Mailpit

```bash
# Opção 1: npm script (já configurado no package.json)
npm run mailpit

# Opção 2: Diretamente
~/.local/bin/mailpit

# Opção 3: Docker (se preferir)
docker run -p 1025:1025 -p 8025:8025 mailpit/mailpit
```

### Acessar a interface web

- **UI Web**: http://localhost:8025
- **SMTP**: localhost:1025

### Configurar aplicação

Adicione as seguintes variáveis ao `.env.test` ou `.env.local`:

```env
SMTP_HOST=localhost
SMTP_PORT=1025
```

A aplicação usará automaticamente essas configurações para enviar emails via Mailpit.

## Testar funcionamento

### Enviar email de teste

```bash
# Usando netcat para enviar um email teste
nc localhost 1025 <<EOF
HELO localhost
MAIL FROM:<teste@local>
RCPT TO:<destinatario@local>
DATA
Subject: Email de teste

Olá, este é um email de teste.
.
QUIT
EOF
```

### Verificar na interface

1. Acesse http://localhost:8025
2. Você verá o email capturado na interface web

## Scripts disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run mailpit` | Inicia o servidor Mailpit |
| `npm run mailpit:start` | Alias para mailpit |

## Ports padrão

| Serviço | Porta |
|---------|-------|
| SMTP | 1025 |
| UI Web | 8025 |
| POP3 (opcional) | 1110 |

## Troubleshooting

### "mailpit: command not found"

Certifique-se de que `~/.local/bin` está no seu PATH:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Ou use o caminho completo:

```bash
~/.local/bin/mailpit
```

### Porta já em uso

Se a porta 1025 ou 8025 já estiver em uso:

```bash
# Verificar qual processo está usando a porta
lsof -i :1025
lsof -i :8025

# Matar o processo ou usar portas diferentes
mailpit --smtp :1026 --listen :8026
```

## Links úteis

- Repositório: https://github.com/axllent/mailpit
- Documentação: https://mailpit.axllent.dev/
