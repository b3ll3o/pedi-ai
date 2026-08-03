#!/usr/bin/env sh
# scripts/check-dev-env.sh
# Verifica se a máquina do dev tem tudo que os hooks do Husky exigem.
# Documentado em docs/guides/HUSKY.md
# Uso: pnpm env:check

. "$(dirname -- "$0")/../.husky/_lib.sh"

echo "🔍 Verificando ambiente de desenvolvimento pedi-ai…"

# Ferramentas essenciais
command -v gitleaks >/dev/null 2>&1 \
  && log_ok "gitleaks $(gitleaks version)" \
  || log_err "gitleaks NÃO instalado (brew install gitleaks)"

command -v pnpm >/dev/null 2>&1 \
  && log_ok "pnpm $(pnpm -v)" \
  || log_err "pnpm NÃO instalado (https://pnpm.io/installation)"

# Ferramentas opcionais
command -v secretlint >/dev/null 2>&1 \
  && log_ok "secretlint $(secretlint --version 2>/dev/null || echo installed)" \
  || log_warn "secretlint NÃO instalado (opcional; instale via pnpm add -D secretlint @secretlint/secretlint-rule-preset-recommend)"

# Versão do Node
if check_node 2>/dev/null; then
  log_ok "Node $(node -v)"
else
  log_err "Node errado (esperado $(cat .nvmrc), atual $(node -v))"
fi

# Lockfile
[ -f pnpm-lock.yaml ] \
  && log_ok "pnpm-lock.yaml presente" \
  || log_err "pnpm-lock.yaml ausente (rode pnpm install)"

echo ""
echo "✨ Verificação concluída. Veja docs/guides/HUSKY.md para troubleshooting."
