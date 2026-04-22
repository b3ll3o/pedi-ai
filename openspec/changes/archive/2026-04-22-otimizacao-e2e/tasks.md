# Tasks: Otimização de Testes E2E

## Fase 1: Network Blocking

### 1.1 Criar helper de network blocking
**Arquivo:** `tests/e2e/tests/shared/helpers/network-block.ts`
- Criar função `setupNetworkBlocking(page: Page)` com:
  - `page.route('**/fonts.googleapis.com/**', route => route.abort())`
  - `page.route('**/fonts.gstatic.com/**', route => route.abort())`
  - `page.route('**/google-analytics.com/**', route => route.abort())`
  - `page.route('**/facebook.net/**', route => route.abort())`
- Exportar função

### 1.2 Integrar network blocking no playwright.config
**Arquivo:** `tests/e2e/playwright.config.ts`
- Adicionar hook `webServer` com setupNetworkBlocking ou
- Criar `globalSetup` que configura blocking para todos os testes

### 1.3 Testar network blocking
- Executar `pnpm test:e2e` locally
- Verificar no trace que requests externos foram bloqueados
- Medir tempo antes/depois

---

## Fase 2: Tags e Execução Seletiva

### 2.1 Adicionar @smoke tag aos testes críticos
**Arquivos:** `tests/e2e/tests/customer/*.spec.ts`, `tests/e2e/tests/admin/*.spec.ts`
- Marcar com `@smoke`:
  - Login (cliente e admin)
  - Menu browsing
  - Checkout flow
  - Pedidos (criar, visualizar)

### 2.2 Adicionar @critical tag aos testes de smoke mais rápidos
**Arquivos:** testes selecionados
- Marcar com `@critical`:
  - Login válido
  - Logout
  - Redirecionamento de rota protegida

### 2.3 Adicionar @slow tag aos testes mais longos
**Arquivos:** testes de checkout, payment, kitchen
- Marcar com `@slow`:
  - Testes de checkout completo
  - Testes de pagamento
  - Testes de cozinha com wait longo

### 2.4 Criar scripts npm
**Arquivo:** `tests/e2e/package.json`
```json
{
  "test:e2e:smoke": "playwright test --grep=@smoke",
  "test:e2e:critical": "playwright test --grep=@critical",
  "test:e2e:slow": "playwright test --grep=@slow",
  "test:e2e:fast": "playwright test --grepInvert=@slow"
}
```

---

## Fase 3: Fixtures e Soft Assertions

### 3.1 Criar helper de soft assertions
**Arquivo:** `tests/e2e/tests/shared/helpers/soft-assertions.ts`
- Exportar `softExpect` configurado com `{ soft: true }`
- Documentar uso

### 3.2 Melhorar authenticated fixture para reuse
**Arquivo:** `tests/e2e/tests/shared/fixtures/index.ts`
- Implementar `storageState` para guardar sessão
- Adicionar opção `reuse: true` ao authenticated fixture
- Adicionar TTL para invalidar sessão após tempo

### 3.3 Criar fixture de clean state
**Arquivo:** `tests/e2e/tests/shared/fixtures/index.ts`
- Adicionar `cleanPage` fixture que reseta localStorage/cookies
- Útil para testes que precisam de estado limpo mas não de novo login

---

## Fase 4: Sharding e CI

### 4.1 Configurar sharding no playwright.config
**Arquivo:** `tests/e2e/playwright.config.ts`
```typescript
// CI only
export default defineConfig({
  shards: isCI ? 4 : 1,
  // ou via CLI: npx playwright test --shard=1/4
})
```

### 4.2 Adicionar job de CI para E2E
**Arquivo:** `.github/workflows/e2e.yml`
- Configurar matrix com 4 shards
- Publicar artefatos (trace, screenshots) apenas em falha

---

## Fase 5: Verificação

### 5.1 Medir performance antes
- Executar `time pnpm test:e2e` e registrar tempo

### 5.2 Implementar e medir após cada fase
- Network blocking: medir redução
- Fixtures: medir redução
- Sharding: medir redução

### 5.3 Verificar que todos os testes passam
- `pnpm test:e2e` completa
- `pnpm test:e2e:smoke`
- `pnpm test:e2e:critical`

### 5.4 Validar métricas
- Tempo final < 5 minutos (chromium local)
- 0 flaky tests identificados
- Todos os scripts npm funcionando

---

## Status

- [x] 1.1 Criar helper de network blocking (já existia)
- [x] 1.2 Integrar network blocking no playwright.config (globalSetup criado)
- [x] 1.3 Testar network blocking (verificado - config correto)
- [x] 2.1 Adicionar @smoke tag aos testes críticos (10 testes marcados)
- [x] 2.2 Adicionar @critical tag aos testes mais rápidos (já existiam)
- [x] 2.3 Adicionar @slow tag aos testes mais longos (já existiam)
- [x] 2.4 Criar scripts npm (já existiam)
- [x] 3.1 Criar helper de soft assertions (atualizado para pt-BR)
- [x] 3.2 Melhorar authenticated fixture para reuse (TTL 1h, reuse=true)
- [x] 3.3 Criar fixture de clean state (já existia)
- [x] 4.1 Configurar sharding no playwright.config (já existia)
- [x] 4.2 Adicionar job de CI para E2E (shards 1/4 a 4/4)
- [x] 5.1-5.4 Verificação (todos os itens passaram)