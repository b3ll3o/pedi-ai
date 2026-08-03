# .husky/_lib.sh — funções usadas por todos os hooks.
# Source via: . "$(dirname -- "$0")/_lib.sh"

RED=$'\033[31m'
GRN=$'\033[32m'
YLW=$'\033[33m'
RST=$'\033[0m'

log_ok() {
  printf "%b✅ %s%b\n" "$GRN" "$*" "$RST"
}

log_warn() {
  printf "%b⚠️  %s%b\n" "$YLW" "$*" "$RST"
}

log_err() {
  printf "%b❌ %s%b\n" "$RED" "$*" "$RST"
}

# Falha dura se a ferramenta não está no PATH
need() {
  command -v "$1" >/dev/null 2>&1 || {
    log_err "$1 não está instalado"
    case "$1" in
      gitleaks) log_err "  brew install gitleaks  (macOS)" ;;
      secretlint) log_err "  pnpm add -D secretlint @secretlint/preset-recommend" ;;
    esac
    exit 1
  }
}

# Valida Node version vs .nvmrc (aceita .nvmrc major-only ou full)
check_node() {
  local expected actual
  expected=$(tr -d '[:space:]' < .nvmrc)
  actual=$(node -v | tr -d 'v')
  case "$actual" in
    "$expected"*) ;; # actual começa com expected → OK
    *)
      log_err "Node $actual, esperado $expected (de .nvmrc)"
      log_err "  Use: nvm use   ou   nvm install $expected"
      exit 1
      ;;
  esac
}
