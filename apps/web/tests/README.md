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

**Total: 107 arquivos de teste unitário**

Cobertura dos domínios: admin, autenticacao, cardapio, mesa, pagamento, pedido, shared (domain); application services; infrastructure (PixAdapter, stores); lib (auth, qr, sync).

---

### Testes de Integração — `tests/integration/`

|| Arquivo | Domínio | Casos cobertos |
||---------|---------|----------------|
|| `api/webhooks.test.ts` | API | Handlers de webhook Mercado Pago PIX |
|| `lib/sync.test.ts` | Sync | Sincronização offline com retry |
|| `lib/sync-exponential-backoff.test.ts` | Sync | Backoff exponencial para operações offline |

**Total: 3 arquivos de teste de integração**

---

### Testes E2E — `tests/e2e/`

Inventário completo em [`tests/e2e/FLUXOS.md`](./e2e/FLUXOS.md).

#### Cliente

| Fluxo           | Spec                               | Tags              | Tempo |
| --------------- | ---------------------------------- | ----------------- | ----- |
| auth            | `customer/auth.spec.ts`            | @smoke, @critical | ~15s  |
| register        | `customer/register.spec.ts`        | @smoke            | —     |
| menu            | `customer/menu.spec.ts`            | —                 | ~20s  |
| cart            | `customer/cart.spec.ts`            | —                 | ~25s  |
| checkout        | `customer/checkout.spec.ts`        | @smoke, @slow     | ~45s  |
| order           | `customer/order.spec.ts`           | @slow             | ~60s  |
| payment         | `customer/payment.spec.ts`         | @slow             | ~90s  |
| offline         | `customer/offline.spec.ts`         | —                 | ~30s  |
| combos          | `customer/combos.spec.ts`          | —                 | ~25s  |
| modifier-groups | `customer/modifier-groups.spec.ts` | —                 | ~30s  |

#### Administrador

| Fluxo            | Spec                             | Tags              | Tempo |
| ---------------- | -------------------------------- | ----------------- | ----- |
| auth             | `admin/auth.spec.ts`             | @smoke, @critical | ~15s  |
| categories       | `admin/categories.spec.ts`       | —                 | ~35s  |
| products         | `admin/products.spec.ts`         | —                 | ~40s  |
| orders           | `admin/orders.spec.ts`           | —                 | ~45s  |
| table-qr         | `admin/table-qr.spec.ts`         | —                 | ~30s  |
| combos-admin     | `admin/combos-admin.spec.ts`     | —                 | ~35s  |
| realtime-updates | `admin/realtime-updates.spec.ts` | —                 | ~50s  |

#### Realtime / Waiter

| Fluxo   | Spec                     | Tags  | Tempo |
| ------- | ------------------------ | ----- | ----- |
| kitchen | `waiter/kitchen.spec.ts` | @slow | ~70s  |

#### Landing

| Fluxo   | Spec                      | Tags   | Tempo |
| ------- | ------------------------- | ------ | ----- |
| landing | `landing/landing.spec.ts` | @smoke | —     |

**Total: 19 fluxos E2E cobrados em 19 spec files**

---

## Configuração de Ambiente

### Variáveis de ambiente E2E

```bash
# Copiar exemplo
cp .env.e2e.example .env.e2e

# Preencher com credenciais do ambiente
# DATABASE_URL=postgresql://postgres:password@localhost:5432/pedi_ai
# NEXT_PUBLIC_API_URL=http://localhost:3001
# JWT_SECRET=your-jwt-secret
```

### Mailpit (testes de email)

```bash
# Iniciar mailpit (captura emails localmente na porta 8025)
pnpm mailpit

# Ou em background
pnpm mailpit &
```

Acesse a interface web em `http://localhost:8025`.

### Preparação do ambiente E2E

```bash
# 1. Instalar dependências
pnpm install

# 2. Instalar navegadores Playwright
pnpm test:e2e:install-browsers

# 3. Iniciar infraestrutura (Docker)
docker-compose up -d

# 4. Aplicar schema e seed
cd apps/api && pnpm prisma db push && pnpm db:seed

# 5. Popular dados de teste
pnpm test:e2e:seed

# 6. Iniciar servidor de desenvolvimento
pnpm dev

# 7. Executar testes
pnpm test:e2e
```

---

## Limiar de Cobertura

|                                     | Tipo de código | Limiar mínimo |
| ----------------------------------- | -------------- | ------------- |
| Código existente                    | **50%**        |
| Código novo (novas funcionalidades) | **80%**        |

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

| Tag         | Uso                           |
| ----------- | ----------------------------- |
| `@smoke`    | Sanity — executa em CI rápido |
| `@critical` | Blockers de merge             |
| `@slow`     | Testes >30s                   |

Executar por tag:

```bash
pnpm test:e2e --grep "@smoke"
pnpm test:e2e --grep "@slow"
```
