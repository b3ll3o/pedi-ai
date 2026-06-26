#!/bin/sh
# .husky/pre-commit — security scan antes de cada commit.
#
# Se `gitleaks` estiver instalado, faz varredura dos arquivos modificados.
# Caso contrário, emite um aviso (não bloqueia) para evitar atrapalhar
# desenvolvedores que ainda não têm a ferramenta.
#
# Instalação: `brew install gitleaks` ou ver https://github.com/gitleaks/gitleaks

if command -v gitleaks >/dev/null 2>&1; then
  echo "[gitleaks] scanning staged files..."
  gitleaks protect --staged --redact --no-banner \
    --config .gitleaks.toml 2>/dev/null || \
  gitleaks protect --staged --redact --no-banner
  exit $?
elif command -v pnpm >/dev/null 2>&1; then
  echo "[gitleaks] binary not found — tentando via pnpm dlx..."
  pnpm dlx gitleaks protect --staged --redact --no-banner
  exit $?
else
  echo "❌ gitleaks não está instalado. Instale antes de commitar:"
  echo "   brew install gitleaks"
  echo "   ou: https://github.com/gitleaks/gitleaks"
  echo ""
  echo "Para ignorar este check (NÃO recomendado), use: git commit --no-verify"
  exit 1
fi