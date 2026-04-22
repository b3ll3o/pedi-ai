# Design: Otimização de Testes E2E

## Technical Approach

Usar recursos nativos do Playwright (route interception, fixtures avançados, tags) para otimizar a execução de testes sem alterar a estrutura de Page Objects existente.

## Architecture Decisions

### Decision: Network Blocking via page.route()

**Choice**: Interceptar requests no nível da página usando `page.route()` com patterns glob
**Alternatives considered**:
- Usar `browserContext.route()` - mais complexo para compartilhar entre testes
- Usar proxy HTTP externo - adiciona dependência externa
**Rationale**: `page.route()` é simples, integrado ao Playwright e permite patterns poderosos com wildcards

### Decision: Tags via grep/grepInvert no playwright.config

**Choice**: Usar sistema nativo de tags do Playwright (`@tag`)
**Alternatives considered**:
- Criar filtro customizado - retrabalho desnecessário
- Usar ambiente CI variável - acoplamento desnecessário
**Rationale**: Playwright já tem suporte nativo a tags que funciona com `grep` e `grepInvert`

### Decision: Soft Assertions via expect().soft

**Choice**: Usar `expect().soft()` do Playwright
**Alternatives considered**:
- Implementar wrapper customizado - código adicional para manter
- Usar try/catch manual - código verboso
**Rationale**: `expect().soft()` é feature nativa do Playwright que coleta erros sem parar

### Decision: Session Reuse via storageState

**Choice**: Usar `storageState` em fixture para persistir sessão autenticada
**Alternatives considered**:
- Compartilhar page instance entre testes - risco de estado contaminado
- Criar API de token manual - complexidade desnecessária
**Rationale**: `storageState` salva cookies/localStorage e pode ser compartilhado entre contextos

## Data Flow

### Network Blocking Flow
```
Teste executa
  → page.route('**/*.ttf', route => route.abort())
  → page.route('**/analytics/**', route => route.abort())
  → Página carrega sem recursos bloqueados
  → Teste executa mais rápido
```

### Fixture de Sessão Reutilizável
```
Teste 1 (authenticated)
  → Login via UI
  → Salva storageState em arquivo tmp
Teste 2 (authenticated)
  → Carrega storageState do arquivo tmp
  → Skip login
  → Tempo economizado: ~2-3s por teste
```

### Tag Execution Flow
```
pnpm test:e2e:smoke
  → playwright.config.ts grep="@smoke"
  → Executa apenas testes @smoke
  → ~30 testes em ~2 minutos
```

## File Changes

### Modified Files

| Arquivo | Mudança |
|---------|---------|
| `tests/e2e/playwright.config.ts` | Adicionar network blocking, tags pattern, shards |
| `tests/e2e/tests/shared/fixtures/index.ts` | Adicionar softAssertions helper, authenticated reuse fixture |
| `tests/e2e/package.json` | Adicionar scripts test:e2e:smoke, test:e2e:critical |

### New Files

| Arquivo | Descrição |
|---------|-----------|
| `tests/e2e/tests/shared/helpers/soft-assertions.ts` | Wrapper para expect().soft() |
| `tests/e2e/tests/shared/helpers/network-block.ts` | Funções de blocking reutilizáveis |

## Interfaces / Contracts

### Network Block Helper
```typescript
// tests/e2e/tests/shared/helpers/network-block.ts
export function setupNetworkBlocking(page: Page) {
  // Fonts
  page.route('**/fonts.googleapis.com/**', route => route.abort())
  page.route('**/fonts.gstatic.com/**', route => route.abort())
  // Analytics
  page.route('**/google-analytics.com/**', route => route.abort())
  page.route('**/facebook.net/**', route => route.abort())
  // Images placeholder (opcional)
  page.route('**/via.placeholder.com/**', route => route.abort())
}
```

### Soft Expect Helper
```typescript
// tests/e2e/tests/shared/helpers/soft-assertions.ts
import { test as base } from '@playwright/test'

export const softExpect = base.expect.configure({ soft: true })

// Uso:
// await softExpect(page.locator('.title')).toHaveText('Esperado')
// await softExpect(page.locator('.subtitle')).toHaveText('Outro')
// Se ambos falharem, relatório mostra os 2 erros
```

### Tag Scripts (package.json)
```json
{
  "test:e2e:smoke": "playwright test --grep=@smoke",
  "test:e2e:critical": "playwright test --grep=@critical",
  "test:e2e:full": "playwright test --project=chromium-headless"
}
```

## Testing Strategy

1. **Antes de implementar**: Medir tempo atual com `time pnpm test:e2e`
2. **Após network blocking**: Medir novamente, esperar redução de 20-30%
3. **Após fixture reuse**: Medir novamente, esperar redução adicional de 20-30%
4. **Validação final**: Suite completa deve executar em < 5 minutos

## Migration / Rollback

### Rollback
1. Restaurar `playwright.config.ts` original
2. Remover scripts do `package.json`
3. Remover arquivos em `helpers/`

### Riscos de Migração
- **Bloquear recurso necessário**: Adicionar wildcard específico para permitir
- **Soft expect mudar comportamento**: Manter como opcional, não substituir expect padrão

## Open Questions

1. Devemos block todas as imagens ou apenas placeholders?
2. Devemos manter video/trace para debugging local ou apenas em CI?
3. Devemos criar fixture de "clean state" com reset de DB ou usar soft delete?

---

**Status**: Ready for `sdd-tasks`