# Testes — Pedi-AI

Documentação dos comandos de teste, inventário de cobertura e configuração de ambiente.

---

## Comandos

### Execução por tipo

```bash
# Testes unitários (Vitest)
pnpm test:unit

# Testes de integração (Vitest)
pnpm test:integration

# Testes end-to-end (Playwright)
pnpm test:e2e

# Cobertura de código (Vitest)
pnpm test:coverage
```

### Execução combinada

```bash
# Todos os testes (unit + integration + e2e)
pnpm test:all

# Watch mode (re-execução ao salvar)
pnpm test:watch
```

### E2E — opções adicionais

```bash
# Interface visual (Playwright UI)
pnpm test:e2e:ui

# Todos os browsers (chromium + firefox + webkit)
pnpm test:e2e:all

# Seed e cleanup do ambiente E2E
pnpm test:e2e:seed
pnpm test:e2e:cleanup
```

---

## Inventário de Testes

### Testes Unitários — `tests/unit/`

| Arquivo | Domínio | Casos cobertos |
|---------|---------|----------------|
| `application/admin/CriarGrupoModificadorUseCase.test.ts` | Admin | Criação de grupo de modificadores |
| `application/admin/AtualizarGrupoModificadorUseCase.test.ts` | Admin | Atualização de grupo de modificadores |
| `application/admin/ExcluirValorModificadorUseCase.test.ts` | Admin | Exclusão de valor de modificador |
| `application/admin/AtualizarValorModificadorUseCase.test.ts` | Admin | Atualização de valor de modificador |
| `application/admin/CriarValorModificadorUseCase.test.ts` | Admin | Criação de valor de modificador |
| `application/admin/ReativarRestauranteUseCase.test.ts` | Admin | Reativação de restaurante inativo |
| `application/auth/RecuperarSenhaUseCase.test.ts` | Auth | Fluxo de recuperação de senha |
| `application/auth/RedefinirSenhaUseCase.test.ts` | Auth | Redefinição de senha com token |
| `application/payment/IniciarReembolsoUseCase.test.ts` | Payment | Início de processo de reembolso |
| `application/payment/ProcessarWebhookUseCase.test.ts` | Payment | Processamento de webhooks de pagamento |
| `domain/auth/Usuario.test.ts` | Domain | Entidade de usuário e validações |
| `infrastructure/payment/PixPaymentAdapter.test.ts` | Payment | Adapter PIX |
| `infrastructure/payment/StripePaymentAdapter.test.ts` | Payment | Adapter Stripe |
| `lib/auth/admin.test.ts` | Auth | Lógica de autenticação admin |
| `lib/sync/broadcast-channel.test.ts` | Sync | BroadcastChannel API para cross-tab |
| `lib/sync/cart-sync.test.ts` | Sync | Sincronização de carrinho entre abas |
| `middleware.test.ts` | Infra | Middleware Next.js |
| `seo/landing-metadata.test.ts` | SEO | Metadata da landing page |

**Total: 18 arquivos de teste unitário**

---

### Testes de Integração — `tests/integration/`

| Arquivo | Domínio | Casos cobertos |
|---------|---------|----------------|
| `api/webhooks.test.ts` | API | Handlers de webhook (Stripe/PIX) |
| `lib/sync.test.ts` | Sync | Sincronização offline com retry |
| `lib/sync-exponential-backoff.test.ts` | Sync | Backoff exponencial para operações offline |

**Total: 3 arquivos de teste de integração**

---

### Testes E2E — `tests/e2e/`

Inventário completo em [`tests/e2e/FLUXOS.md`](./e2e/FLUXOS.md).

#### Cliente

| Fluxo | Spec | Tags | Tempo |
|-------|------|------|-------|
| auth | `customer/auth.spec.ts` | @smoke, @critical | ~15s |
| register | `customer/register.spec.ts` | @smoke | — |
| menu | `customer/menu.spec.ts` | — | ~20s |
| cart | `customer/cart.spec.ts` | — | ~25s |
| checkout | `customer/checkout.spec.ts` | @smoke, @slow | ~45s |
| order | `customer/order.spec.ts` | @slow | ~60s |
| payment | `customer/payment.spec.ts` | @slow | ~90s |
| offline | `customer/offline.spec.ts` | — | ~30s |
| combos | `customer/combos.spec.ts` | — | ~25s |
| modifier-groups | `customer/modifier-groups.spec.ts` | — | ~30s |

#### Administrador

| Fluxo | Spec | Tags | Tempo |
|-------|------|------|-------|
| auth | `admin/auth.spec.ts` | @smoke, @critical | ~15s |
| categories | `admin/categories.spec.ts` | — | ~35s |
| products | `admin/products.spec.ts` | — | ~40s |
| orders | `admin/orders.spec.ts` | — | ~45s |
| table-qr | `admin/table-qr.spec.ts` | — | ~30s |
| combos-admin | `admin/combos-admin.spec.ts` | — | ~35s |
| realtime-updates | `admin/realtime-updates.spec.ts` | — | ~50s |

#### Realtime / Waiter

| Fluxo | Spec | Tags | Tempo |
|-------|------|------|-------|
| kitchen | `waiter/kitchen.spec.ts` | @slow | ~70s |

#### Landing

| Fluxo | Spec | Tags | Tempo |
|-------|------|------|-------|
| landing | `landing/landing.spec.ts` | @smoke | — |

**Total: 19 fluxos E2E cobrados em 19 spec files**

---

## Configuração de Ambiente

### Variáveis de ambiente E2E

```bash
# Copiar exemplo
cp tests/e2e/.env.example tests/e2e/.env.e2e

# Preencher com credenciais Supabase Cloud
# NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Mailpit (testes de email)

```bash
# Iniciar mailpit (captura emails localmente na porta 8025)
pnpm mailpit

# Ou em background
pnpm mailpit:start &
```

Acesse a interface web em `http://localhost:8025`.

### Stripe CLI (webhooks local)

```bash
# Escutar eventos Stripe e redirecionar para localhost
pnpm stripe:listen

# Output esperado:
# > Ready! You are listening to Stripe events...
# > Forwarding webhook events to http://localhost:3000/api/webhooks/stripe
```

### Preparação do ambiente E2E

```bash
# 1. Instalar dependências
pnpm install

# 2. Instalar navegadores Playwright
pnpm install:browsers

# 3. Popular dados de teste no Supabase
pnpm test:e2e:seed

# 4. Iniciar servidor de desenvolvimento
pnpm dev

# 5. Executar testes
pnpm test:e2e
```

---

## Limiar de Cobertura

| Tipo de código | Limiar mínimo |
|----------------|---------------|
| Código existente | **50%** |
| Código novo (novas funcionalidades) | **80%** |

Verificar cobertura:

```bash
pnpm test:coverage
```

Métricas monitoradas:
- **Statements** — linhas executadas
- **Branches** — caminhos condicionais
- **Functions** — funções chamadas
- **Lines** — linhas totais

---

## Tags E2E

| Tag | Uso |
|-----|-----|
| `@smoke` | Sanity — executa em CI rápido |
| `@critical` | Blockers de merge |
| `@slow` | Testes >30s |

Executar por tag:

```bash
pnpm test:e2e --grep "@smoke"
pnpm test:e2e --grep "@slow"
```
