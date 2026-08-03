# Design — Feature Flags Runtime

> Mudança: `.openspec/changes/feature-flags-runtime/` · **BC destino:** `admin` · **Status:** Proposta (não-aprovada).
> Aplicável após merge desta change + regeneração da RTM via `pnpm rtm`.

---

## 1. Visão Geral

```
[Owner] ──→ /admin/feature-flags (Next.js UI)
                   │
                   ▼
            REST /api/v1/admin/feature-flags  (NestJS, RBAC owner/manager)
                   │
                   ▼
   application/admin/feature-flags (use cases)
                   │
   ┌───────────────┼───────────────────────────────┐
   ▼               ▼                               ▼
FeatureFlagEvaluator (precedência)   FeatureFlagCache (Redis + LRU)   FeatureFlagAuditLogger
   │               │                               │
   └───────────────┴───────────────┬───────────────┘
                                   ▼
                       PrismaFeatureFlagRepository ──→ Postgres
                                   ▲
                                   │ polling 30s
                                   ▼
                  FeatureFlagClient (front) ──→ FeatureFlagProvider (React) ──→ useFeatureFlag(key)
                                                                │
                                                                ▼ fallback (se SDK offline)
                                                  apps/web/src/lib/feature-flags.ts (env-var legacy)
```

Camadas DDD (alinhadas ao BC `admin` em migração):

```
apps/api/src/domain/admin/feature-flags/         # FeatureFlag aggregate, VOs, repo interface, events
apps/api/src/application/admin/feature-flags/   # ToggleFeatureFlag, AdicionarOverride, AvaliarFeatureFlag, ListarFeatureFlagsUseCase
apps/api/src/infrastructure/admin/feature-flags/ # PrismaFeatureFlagRepository, FeatureFlagCache, FeatureFlagAuditLogger
apps/api/src/presentation/admin/feature-flags/   # FeatureFlagsController (REST) + DTOs + Guards
```

---

## 2. Requisitos Funcionais (RF-ADM-FF)

> Todos os RFs deste change seguem o prefixo **`RF-ADM-FF-NN`** (subdomínio Feature Flags dentro de `admin`), conforme aprovado em `proposal.md §4`. Mantêm a convenção de `RF-<CTX>-<NN>` definida em `.openspec/AGENTS.md §2.1`.

### `RF-ADM-FF-01` — Listar feature flags

**Ator:** `owner` ou `manager` autenticado.

**Trigger:** `GET /api/v1/admin/feature-flags`.

**Pré-condições:** Token JWT válido com papel `owner` ou `manager` no restaurante escopo (header `x-restaurante-id`).

**Pós-condições:** Lista paginada de flags com `{ key, description, valueType, defaultValue, enabled, overrideCount }`.

**Regras de negócio:**

- Cada flag **MUST** incluir contagem de overrides ativos (RF-ADM-FF-07 derivado).
- `manager` recebe a mesma resposta que `owner` neste endpoint (sem PII, sem campos sensíveis).

**Materialização:**

- `apps/api/src/presentation/admin/feature-flags/feature-flags.controller.ts` (handler `list`)
- `apps/api/src/application/admin/feature-flags/ListarFeatureFlagsUseCase.ts` (`@spec(RF-ADM-FF-01)`)

**Cenário BDD:** `features/admin/feature-flags/listar.feature` — `Cenário: Owner lista todas as flags com contagem de overrides`.

---

### `RF-ADM-FF-02` — Obter feature flag por chave

**Ator:** `owner` ou `manager`.

**Trigger:** `GET /api/v1/admin/feature-flags/:key`.

**Pós-condições:** Detalhe completo da flag incluindo overrides (RF-ADM-FF-07 inline).

**Regras:**

- **MUST** retornar `404` se a chave não existir (sem vazar existência para flag猜測).
- `defaultValue` **MUST** estar tipado de acordo com `valueType` (validado no DTO de saída).

**Materialização:**

- `ObterFeatureFlagPorChaveUseCase.ts` (`@spec(RF-ADM-FF-02)`)

**Cenário BDD:** `features/admin/feature-flags/obter.feature` — `Cenário: Owner obtém flag existente com overrides`.

---

### `RF-ADM-FF-03` — Criar feature flag

**Ator:** `owner`.

**Trigger:** `POST /api/v1/admin/feature-flags` com `{ key, description, valueType, defaultValue }`.

**Pré-condições:**

- `key` único, snake*case, ASCII `[a-z0-9*]{3,64}`.
- `defaultValue` compatível com `valueType` (validado por Zod).

**Pós-condições:** Flag persistida com `enabled = true` por padrão. Entrada em `FeatureFlagAuditLog` (`action = "CREATE"`).

**Regras:**

- **MUST NOT** permitir criar flag com `key` igual a uma flag de env-var se isso quebraria contrato (ex.: tentar criar `pix_enabled` minúsculo vs `PIX_ENABLED` do legado). Validação: `key` **MUST** seguir convenção `snake_case` e o mapper de compat é case-insensitive.
- **MUST** rejeitar criação de flag sem `valueType`.

**Materialização:**

- `CriarFeatureFlagUseCase.ts` (`@spec(RF-ADM-FF-03)`)
- Auditoria: `FeatureFlagAuditLogger.log({ action: "CREATE", actorId, before: null, after: flag })`.

**Cenário BDD:** `features/admin/feature-flags/criar.feature` — `Cenário: Owner cria flag booleana com sucesso`.

---

### `RF-ADM-FF-04` — Atualizar feature flag

**Ator:** `owner`.

**Trigger:** `PATCH /api/v1/admin/feature-flags/:key` com `{ description?, defaultValue?, enabled? }`.

**Pós-condições:** Flag atualizada; entrada em `FeatureFlagAuditLog` com `before` e `after`.

**Regras:**

- **MUST NOT** permitir alterar `key` (imutável — chave canônica).
- **MUST NOT** permitir alterar `valueType` depois da criação (quebra auditabilidade).
- `enabled = false` **MUST** fazer a flag ser tratada como "desligada" em todas as avaliações (precedência absoluta, antes mesmo de `defaultValue`).

**Materialização:**

- `AtualizarFeatureFlagUseCase.ts` (`@spec(RF-ADM-FF-04)`)

**Cenário BDD:** `features/admin/feature-flags/atualizar.feature` — `Cenário: Owner desabilita flag e auditoria registra before/after`.

---

### `RF-ADM-FF-05` — Adicionar override de feature flag

**Ator:** `owner`.

**Trigger:** `POST /api/v1/admin/feature-flags/:key/overrides` com `{ scope: GLOBAL|RESTAURANT|USER, scopeId?: string, value: Json, rolloutPct?: 0..100, expiresAt?: ISODate }`.

**Pré-condições:**

- Flag existe e está `enabled = true`.
- Se `scope = GLOBAL`, `scopeId` **MUST** ser `null`.
- Se `scope ∈ {RESTAURANT, USER}`, `scopeId` **MUST** ser não-nulo.
- `rolloutPct` quando presente **MUST** estar em `[0, 100]`.

**Pós-condições:** Override persistido. Entrada em `FeatureFlagAuditLog` (`action = "OVERRIDE_ADD"`).

**Regras:**

- **MUST** validar `value` contra `valueType` da flag (BOOLEAN/STRING/NUMBER/JSON) no DTO com Zod.
- `expiresAt` **MUST** ser no futuro.
- **MUST** impedir 2 overrides com mesma `(flagId, scope, scopeId)` (constraint `@@unique`).
- **MUST** invalidar entradas do cache Redis e LRU para esta chave.

**Materialização:**

- `AdicionarOverrideUseCase.ts` (`@spec(RF-ADM-FF-05)`)

**Cenário BDD:** `features/admin/feature-flags/overrides.feature`:

- `Cenário: Owner adiciona override RESTAURANT para restaurante X`.
- `Cenário: Rejeita override GLOBAL com scopeId não-nulo`.
- `Cenário: Rollout 50% por usuário é determinístico pelo userId`.

---

### `RF-ADM-FF-06` — Remover override de feature flag

**Ator:** `owner`.

**Trigger:** `DELETE /api/v1/admin/feature-flags/:key/overrides/:id`.

**Pós-condições:** Override removido. Entrada em `FeatureFlagAuditLog` (`action = "OVERRIDE_REMOVE"`, com snapshot `before`).

**Materialização:**

- `RemoverOverrideUseCase.ts` (`@spec(RF-ADM-FF-06)`)

**Cenário BDD:** `features/admin/feature-flags/overrides.feature` — `Cenário: Owner remove override RESTAURANT e cache invalida`.

---

### `RF-ADM-FF-07` — Listar overrides de uma flag

**Ator:** `owner` ou `manager`.

**Trigger:** `GET /api/v1/admin/feature-flags/:key/overrides`.

**Pós-condições:** Array de overrides ativos (não-expirados), ordenados por `scope` asc.

**Regras:**

- Filtra automaticamente overrides com `expiresAt < now()`.
- **MUST** paginar (limit 50, offset).

**Materialização:**

- `ListarOverridesUseCase.ts` (`@spec(RF-ADM-FF-07)`)

**Cenário BDD:** `features/admin/feature-flags/overrides.feature` — `Cenário: Manager lista overrides ativos excluindo expirados`.

---

### `RF-ADM-FF-08` — Avaliar feature flags (resolver valor final)

**Ator:** Sistema (front-end, back-end, jobs). Endpoint **público** (sem RBAC) para o front renderizar UI condicional.

**Trigger:** `GET /api/v1/admin/feature-flags/evaluate?keys=offline_enabled,pix_enabled&restaurantId=...&userId=...`.

**Pré-condições:** `keys` é CSV de 1-32 chaves válidas (snake_case).

**Pós-condições:** Mapa `{ key: resolvedValue }` respeitando **precedência** abaixo.

**Algoritmo de avaliação (RF-ADM-FF-08 MUST):**

Para cada `key`:

1. Se flag `enabled = false` → retorna `defaultValue` (desabilitada).
2. Senão, procurar override na ordem de precedência:
   1. `scope = USER` com `scopeId = "<restaurantId>:<userId>"` (override usuário + restaurante).
   2. `scope = RESTAURANT` com `scopeId = restaurantId`.
   3. `scope = USER` com `scopeId = userId` (override usuário global).
   4. `scope = GLOBAL` com `scopeId = null`.
3. Se override tem `rolloutPct` definido e `< 100`:
   - Calcula `hash = FNV-1a(64)(flagId + ":" + userId || restaurantId) % 100`.
   - Se `hash < rolloutPct`, aplica `value`; senão, cai para próxima regra da cadeia.
4. Sem override aplicável → `defaultValue`.

**Regras:**

- `evaluate()` **MUST** usar cache (Redis hit → LRU in-process → DB).
- **MUST** registrar métrica Prometheus `feature_flag_evaluations_total{key, scope, hit}`.
- **MUST** falhar de forma graciosa (RNF-AVAIL-FF-01): em erro de DB ou Redis, retorna `defaultValue` e loga warning.
- O endpoint **MUST** aplicar rate limit (100 req/min por IP) para evitar abuso — alinhado com `RNF-SEC-01` global.

**Materialização:**

- `apps/api/src/application/admin/feature-flags/AvaliarFeatureFlagUseCase.ts` (`@spec(RF-ADM-FF-08)`)
- `FeatureFlagEvaluator` (serviço puro, sem dependência de framework).

**Cenários BDD:** `features/admin/feature-flags/avaliar.feature`:

- `Cenário: Flag global default ON sem override`.
- `Cenário: Override por restaurante tem precedência sobre GLOBAL`.
- `Cenário: Override por usuário (restaurantId+userId) tem precedência sobre RESTAURANT`.
- `Cenário: Rollout 50% — mesma chave+userId retorna sempre o mesmo valor`.
- `Cenário: Fallback env-var quando DB indisponível`.

---

### `RF-ADM-FF-09` — Visualizar audit log de uma flag

**Ator:** `owner` ou `manager`.

**Trigger:** `GET /api/v1/admin/feature-flags/:key/audit?limit=50&offset=0`.

**Pós-condições:** Lista paginada de entradas `{ id, actorId, action, before, after, reason, createdAt }`.

**Regras:**

- **MUST** ordenar por `createdAt DESC`.
- `action` ∈ {`CREATE`, `UPDATE`, `TOGGLE`, `OVERRIDE_ADD`, `OVERRIDE_REMOVE`, `ROLLOUT_CHANGE`}.
- `manager` **MUST** ver o mesmo conteúdo que `owner` (sem mascaramento — auditoria é leitura, não mutação).

**Materialização:**

- `ListarAuditLogUseCase.ts` (`@spec(RF-ADM-FF-09)`)

**Cenário BDD:** `features/admin/feature-flags/audit.feature` — `Cenário: Manager consulta audit log ordenado por data decrescente`.

---

### `RF-ADM-FF-10` — Painel admin de feature flags

**Ator:** `owner` ou `manager` autenticado na UI Next.js.

**Trigger:** Navegação para `/admin/feature-flags`.

**Pós-condições:**

- Tabela com todas as flags (RF-ADM-FF-01 client-side).
- Botão de toggle on/off por linha (RF-ADM-FF-04 client-side).
- Botão "Gerenciar overrides" abre modal com formulário (RF-ADM-FF-05/06 client-side).
- Aba "Audit log" abre painel lateral com últimos 50 eventos (RF-ADM-FF-09 client-side).
- Estados de **erro**, **carregando** e **vazio** explícitos (loading skeleton + empty state + toast de erro).

**Regras:**

- **MUST** exibir tooltip "Propagação pode levar até 30 s" perto do toggle.
- **MUST** confirmar antes de mutação destrutiva (excluir override).
- **MUST** exibir timestamps relativos ("há 2 min") em audit log.
- i18n pt-BR (RNF-I18N-FF-01).

**Materialização:**

- `apps/web/src/components/admin/feature-flags/PainelFeatureFlags.tsx` (`@spec(RF-ADM-FF-10)`)
- `apps/web/src/components/admin/feature-flags/TabelaFeatureFlags.tsx`
- `apps/web/src/components/admin/feature-flags/ModalOverrideFeatureFlag.tsx`
- `apps/web/src/components/admin/feature-flags/AuditLogViewer.tsx`

**Cenário BDD:** `features/admin/feature-flags/ui-painel.feature`:

- `Cenário: Owner liga flag via toggle e vê confirmação`.
- `Cenário: Manager abre modal de override mas não vê botão "Salvar" (RBAC visual)`.

---

## 3. Requisitos Não-Funcionais (RNF-…-FF-01)

### `RNF-PERF-FF-01` — Latência de avaliação

**Categoria:** Performance (ISO 25010 — Eficiência de desempenho).

**Métrica:** `evaluate()` com 1 chave:

- **p99 < 5 ms** quando há cache hit (Redis ou LRU).
- **p99 < 50 ms** quando há cache miss (consulta Postgres + repopula cache).

**Verificação:**

- Benchmark `k6` com 1000 RPS sustentados por 60 s contra `/evaluate?keys=pix_enabled`.
- Métrica exposta em `/metrics` Prometheus: `feature_flag_evaluate_duration_seconds_bucket`.
- Teste de carga em CI nightly.

---

### `RNF-AVAIL-FF-01` — Fallback em falha de DB/Redis

**Categoria:** Disponibilidade.

**Métrica:** 100% dos requests de `/evaluate` retornam **algum valor** (DB, cache ou env-var) mesmo com Postgres e Redis fora do ar.

**Verificação:**

- Teste E2E derruba Postgres e Redis em `docker-compose`, verifica que `evaluate()` retorna `defaultValue` ou env-var legado.
- Circuit breaker: após 5 falhas consecutivas em 10 s, `evaluate()` bypassa DB por 30 s.
- Métrica Prometheus: `feature_flag_fallback_total{reason}`.

---

### `RNF-SEC-FF-01` — RBAC granular

**Categoria:** Segurança.

**Métrica:**

- `owner` **MUST** ter acesso a **todos** os métodos de flag (CRUD + override).
- `manager` **MUST** ter acesso **somente leitura** (listar, obter, audit, evaluate).
- `staff` **MUST NOT** ter acesso a nenhum endpoint admin de flag (apenas ao SDK de leitura client-side).
- Endpoint `/evaluate` é público mas **rate-limited** (100 req/min/IP).

**Verificação:**

- Teste E2E para cada papel × cada método × esperado (200/403).
- `Guard` no NestJS verifica papel antes do controller; **fail-closed**.

---

### `RNF-I18N-FF-01` — Localização pt-BR

**Categoria:** Localização.

**Métrica:** 100% das mensagens de erro e rótulos de UI em pt-BR.

**Verificação:**

- Snapshot test dos componentes React verifica string PT-BR.
- Teste E2E assina `lang: pt-BR` e varre `page.content()` procurando palavras-chave.

---

### `RNF-MAINT-FF-01` — SDK único tipado

**Categoria:** Manutenibilidade.

**Métrica:** 1 SDK (`@pedi-ai/feature-flags`) consumido por front e back; cobertura de tipos 100% nas flags seed.

**Verificação:**

- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`.
- Zod schema único em `packages/feature-flags/src/schema.ts` importado por front e back.
- Sem `any` em código de produção (`grep -rE ': any' apps/ packages/` retorna 0 hits no escopo do SDK).

---

### `RNF-RELI-FF-01` — Audit log imutável

**Categoria:** Confiabilidade.

**Métrica:** Toda mutação em `FeatureFlag` ou `FeatureFlagOverride` gera entrada em `FeatureFlagAuditLog` no mesmo `Prisma.$transaction` (atomicidade).

**Verificação:**

- Teste unitário mockando transação: se `INSERT INTO audit` falhar, mutação **deve** falhar.
- Constraint de FK `onDelete: Cascade` impede orphan de audit.

---

## 4. Mudanças no Schema (Prisma)

Adicionados em `apps/api/prisma/schema.prisma`:

```prisma
enum FlagScope {
  GLOBAL
  RESTAURANT
  USER
}

enum FlagValueType {
  BOOLEAN
  STRING
  NUMBER
  JSON
}

model FeatureFlag {
  id           String        @id @default(cuid())
  key          String        @unique
  description  String?
  valueType    FlagValueType @default(BOOLEAN)
  defaultValue Json
  enabled      Boolean       @default(true)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  updatedBy    String?

  overrides FeatureFlagOverride[]
  audits    FeatureFlagAuditLog[]

  @@map("feature_flags")
}

model FeatureFlagOverride {
  id         String    @id @default(cuid())
  flagId     String
  scope      FlagScope
  scopeId    String?
  rolloutPct Int?      // 0-100
  value      Json
  expiresAt  DateTime?
  createdAt  DateTime  @default(now())
  createdBy  String?

  flag FeatureFlag @relation(fields: [flagId], references: [id], onDelete: Cascade)

  @@unique([flagId, scope, scopeId])
  @@index([flagId, scope, scopeId])
  @@index([expiresAt])
  @@map("feature_flag_overrides")
}

model FeatureFlagAuditLog {
  id        String   @id @default(cuid())
  flagId    String
  actorId   String
  action    String   // CREATE | UPDATE | TOGGLE | OVERRIDE_ADD | OVERRIDE_REMOVE | ROLLOUT_CHANGE
  before    Json?
  after     Json?
  reason    String?
  createdAt DateTime @default(now())

  flag FeatureFlag @relation(fields: [flagId], references: [id], onDelete: Cascade)

  @@index([flagId, createdAt])
  @@index([actorId, createdAt])
  @@map("feature_flag_audit_logs")
}
```

**Conventions alinhadas com schema existente:**

- `id` como `cuid()` (consistente com demais models futuros; demais models legados usam `uuid()` — aceito em migration).
- Timestamps `createdAt` / `updatedAt` em todos os models.
- `@@map` snake_case no Postgres.
- `onDelete: Cascade` em FKs filhas — padrão do projeto para evitar orphans.
- Sem `softDelete` neste agregado — flag não é dado de negócio; auditoria substitui.

---

## 5. Contratos de API

Base: `/api/v1/admin/feature-flags`. Content-Type `application/json`. Auth via Bearer JWT.

| Método | Path                  | Auth                 | Request                                               | Response 200                                   | Erros                   |
| ------ | --------------------- | -------------------- | ----------------------------------------------------- | ---------------------------------------------- | ----------------------- |
| GET    | `/`                   | owner, manager       | `?limit=50&offset=0`                                  | `{ data: FeatureFlagResumo[], total: number }` | 401, 403                |
| GET    | `/:key`               | owner, manager       | —                                                     | `FeatureFlagDetalhe` (com overrides inline)    | 401, 403, 404           |
| POST   | `/`                   | owner                | `{ key, description?, valueType, defaultValue }`      | `FeatureFlag`                                  | 400, 401, 403, 409      |
| PATCH  | `/:key`               | owner                | `{ description?, defaultValue?, enabled? }`           | `FeatureFlag`                                  | 400, 401, 403, 404      |
| POST   | `/:key/overrides`     | owner                | `{ scope, scopeId?, value, rolloutPct?, expiresAt? }` | `FeatureFlagOverride`                          | 400, 401, 403, 404, 409 |
| DELETE | `/:key/overrides/:id` | owner                | —                                                     | 204 No Content                                 | 401, 403, 404           |
| GET    | `/:key/overrides`     | owner, manager       | `?limit=50&offset=0`                                  | `{ data: FeatureFlagOverride[] }`              | 401, 403, 404           |
| GET    | `/:key/audit`         | owner, manager       | `?limit=50&offset=0`                                  | `{ data: FeatureFlagAuditLog[] }`              | 401, 403, 404           |
| GET    | `/evaluate`           | público + rate-limit | `?keys=csv&restaurantId?&userId?`                     | `{ [key]: resolvedValue }`                     | 400, 429                |

### DTOs (Zod)

```typescript
// packages/feature-flags/src/schema.ts
export const FeatureFlagKeySchema = z.string().regex(/^[a-z0-9_]{3,64}$/);

export const CreateFeatureFlagDtoSchema = z
  .object({
    key: FeatureFlagKeySchema,
    description: z.string().max(500).optional(),
    valueType: z.enum(['BOOLEAN', 'STRING', 'NUMBER', 'JSON']),
    defaultValue: z.unknown(),
  })
  .refine((d) => valueMatchesType(d.defaultValue, d.valueType), {
    message: 'defaultValue incompatível com valueType',
    path: ['defaultValue'],
  });

export const OverrideScopeSchema = z.enum(['GLOBAL', 'RESTAURANT', 'USER']);

export const CreateOverrideDtoSchema = z
  .object({
    scope: OverrideScopeSchema,
    scopeId: z.string().nullable().optional(),
    value: z.unknown(),
    rolloutPct: z.number().int().min(0).max(100).optional(),
    expiresAt: z.string().datetime().optional(),
  })
  .refine((d) => (d.scope === 'GLOBAL' ? d.scopeId == null : d.scopeId != null), {
    message: 'scopeId requerido exceto para GLOBAL',
  });
```

---

## 6. Regras de Avaliação (detalhamento)

### 6.1 Pseudocódigo do `FeatureFlagEvaluator`

```typescript
/**
 * @spec(RF-ADM-FF-08, RNF-PERF-FF-01, RNF-AVAIL-FF-01)
 */
class FeatureFlagEvaluator {
  evaluate(key: string, ctx: { restaurantId?: string; userId?: string }): unknown {
    const flag = this.cache.get(key) ?? this.repo.findByKey(key);
    if (!flag) return this.envFallback(key);
    if (!flag.enabled) return flag.defaultValue;

    const candidates: Override[] = flag.overrides.filter((o) => !isExpired(o));
    // 1. USER (restaurantId+userId)
    if (ctx.restaurantId && ctx.userId) {
      const o = candidates.find(
        (o) => o.scope === 'USER' && o.scopeId === `${ctx.restaurantId}:${ctx.userId}`
      );
      if (o && this.passesRollout(o, flag.id, ctx.userId)) return o.value;
    }
    // 2. RESTAURANT
    if (ctx.restaurantId) {
      const o = candidates.find((o) => o.scope === 'RESTAURANT' && o.scopeId === ctx.restaurantId);
      if (o && this.passesRollout(o, flag.id, ctx.restaurantId)) return o.value;
    }
    // 3. USER (global)
    if (ctx.userId) {
      const o = candidates.find((o) => o.scope === 'USER' && o.scopeId === ctx.userId);
      if (o && this.passesRollout(o, flag.id, ctx.userId)) return o.value;
    }
    // 4. GLOBAL
    const g = candidates.find((o) => o.scope === 'GLOBAL');
    if (g && this.passesRollout(g, flag.id, ctx.userId ?? ctx.restaurantId ?? flag.id))
      return g.value;

    return flag.defaultValue;
  }

  private passesRollout(o: Override, flagId: string, subjectId: string): boolean {
    if (o.rolloutPct == null || o.rolloutPct === 100) return true;
    if (o.rolloutPct === 0) return false;
    const hash = fnv1a64(`${flagId}:${subjectId}`);
    return hash % 100 < o.rolloutPct;
  }
}
```

### 6.2 Ordem de precedência (resumo)

1. `USER(restaurantId+userId)`
2. `RESTAURANT(restaurantId)`
3. `USER(userId)`
4. `GLOBAL`
5. `defaultValue`

`enabled = false` zera tudo (curto-circuito antes da cadeia).

### 6.3 Cache

- **Camada 1**: Redis (`prefix = "ff:"`, `TTL = 60 s`).
- **Camada 2**: LRU in-process (`max = 1000 chaves`, `TTL = 60 s`).
- **Invalidação**: toda mutação (create/update/delete override) chama `cache.invalidate(key)`.
- **Stampede protection**: `singleflight` para evitar N requests ao DB em cache miss simultâneo.

---

## 7. Compatibilidade e Migração das 8 Flags Existentes

As 8 flags de `apps/web/src/lib/feature-flags.ts` viram **registros no DB** via seed script `apps/api/prisma/seed-feature-flags.ts`:

| Chave DB (snake_case)      | valueType | defaultValue                                                           | Env-var legado                          |
| -------------------------- | --------- | ---------------------------------------------------------------------- | --------------------------------------- |
| `offline_enabled`          | BOOLEAN   | `process.env.NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED === 'true'`           | `NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED`   |
| `pix_enabled`              | BOOLEAN   | `process.env.NEXT_PUBLIC_FEATURE_PIX_ENABLED === 'true'`               | `NEXT_PUBLIC_FEATURE_PIX_ENABLED`       |
| `waiter_mode_enabled`      | BOOLEAN   | `process.env.NEXT_PUBLIC_FEATURE_WAITER_MODE === 'true'`               | `NEXT_PUBLIC_FEATURE_WAITER_MODE`       |
| `qr_code_enabled`          | BOOLEAN   | `process.env.NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED === 'true'`           | `NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED`   |
| `combos_enabled`           | BOOLEAN   | `process.env.NEXT_PUBLIC_FEATURE_COMBOS_ENABLED === 'true'`            | `NEXT_PUBLIC_FEATURE_COMBOS_ENABLED`    |
| `analytics_enabled`        | BOOLEAN   | `process.env.NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED === 'true'`         | `NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED` |
| `cashback_enabled`         | BOOLEAN   | `false` (env-var `NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED` não consumida) | `NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED`  |
| `multi_restaurant_enabled` | BOOLEAN   | `process.env.NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT === 'true'`           | `NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT`   |

**Compat layer em `apps/web/src/lib/feature-flags.ts`:**

- As funções `isOfflineEnabled()`, etc., continuam existindo.
- Internamente passam a chamar `FeatureFlagClient.evaluate(key, ctx)` e só fazem fallback para `process.env` se o SDK estiver indisponível.
- Nenhum caller atual precisa mudar — refatoração é **opcional** e não-bloqueante.

---

## 8. SDK — `FeatureFlagClient` e `useFeatureFlag`

### 8.1 Server-side

```typescript
/** @spec(RF-ADM-FF-08, RNF-MAINT-FF-01) */
class FeatureFlagClient {
  constructor(private http: HttpClient) {}
  async evaluateBatch(keys: string[], ctx: EvalContext): Promise<Record<string, unknown>> {
    const qs = new URLSearchParams({ keys: keys.join(',') });
    if (ctx.restaurantId) qs.set('restaurantId', ctx.restaurantId);
    if (ctx.userId) qs.set('userId', ctx.userId);
    return this.http.get(`/api/v1/admin/feature-flags/evaluate?${qs}`);
  }
  isEnabled(key: string, ctx: EvalContext): Promise<boolean> {
    /* ... */
  }
}
```

### 8.2 Client-side (Next.js)

```typescript
/** @spec(RF-ADM-FF-08, RNF-MAINT-FF-01, RNF-AVAIL-FF-01) */
'use client';
const FeatureFlagContext = createContext<FeatureFlagClient | null>(null);

/** Provider faz polling 30s e expõe o client via context. */
export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  /* ... */
}

/** Hook tipado com fallback. */
export function useFeatureFlag<T = boolean>(key: string, fallback: T): T {
  const client = useContext(FeatureFlagContext);
  return (client?.get(key) as T) ?? fallback;
}
```

- Cache local **em memória** (Map) com TTL 30 s.
- Em `localStorage` apenas a **versão ETag** da última resposta para invalidar cache se DB mudou.

---

## 9. Cenários BDD (alto nível)

Arquivos Gherkin em `features/admin/feature-flags/`:

| Cenário                                                       | Arquivo             | RF mapeado                         |
| ------------------------------------------------------------- | ------------------- | ---------------------------------- |
| Owner lista todas as flags com contagem de overrides          | `listar.feature`    | `RF-ADM-FF-01`                     |
| Owner obtém flag existente com overrides                      | `obter.feature`     | `RF-ADM-FF-02`                     |
| Owner cria flag booleana com sucesso                          | `criar.feature`     | `RF-ADM-FF-03`                     |
| Owner desabilita flag e auditoria registra before/after       | `atualizar.feature` | `RF-ADM-FF-04`                     |
| Owner adiciona override RESTAURANT para restaurante X         | `overrides.feature` | `RF-ADM-FF-05`                     |
| Rejeita override GLOBAL com scopeId não-nulo                  | `overrides.feature` | `RF-ADM-FF-05`                     |
| Rollout 50% por usuário é determinístico pelo userId          | `overrides.feature` | `RF-ADM-FF-05`                     |
| Owner remove override RESTAURANT e cache invalida             | `overrides.feature` | `RF-ADM-FF-06`                     |
| Manager lista overrides ativos excluindo expirados            | `overrides.feature` | `RF-ADM-FF-07`                     |
| Flag global default ON sem override                           | `avaliar.feature`   | `RF-ADM-FF-08`                     |
| Override por restaurante tem precedência sobre GLOBAL         | `avaliar.feature`   | `RF-ADM-FF-08`                     |
| Override por usuário (restaurantId+userId) tem precedência    | `avaliar.feature`   | `RF-ADM-FF-08`                     |
| Rollout 50% — mesma chave+userId retorna sempre o mesmo valor | `avaliar.feature`   | `RF-ADM-FF-08`                     |
| Fallback env-var quando DB indisponível                       | `avaliar.feature`   | `RF-ADM-FF-08` + `RNF-AVAIL-FF-01` |
| Manager consulta audit log ordenado por data decrescente      | `audit.feature`     | `RF-ADM-FF-09`                     |
| Owner liga flag via toggle e vê confirmação                   | `ui-painel.feature` | `RF-ADM-FF-10`                     |
| Manager abre modal de override mas não vê botão "Salvar"      | `ui-painel.feature` | `RF-ADM-FF-10` + `RNF-SEC-FF-01`   |
| Apenas owner pode criar flag (RBAC)                           | `rbac.feature`      | `RNF-SEC-FF-01`                    |
| Manager não pode atualizar flag                               | `rbac.feature`      | `RNF-SEC-FF-01`                    |

---

## 10. Matriz de Rastreabilidade (RTM)

> RTM completa gerada por `pnpm rtm` em `docs/requirements/RTM.md`. Trecho:

| RF             | Origem                     | Materialização (código)                                                                                     | Cenário BDD         | Teste unitário                                   | Teste E2E                               | Status inicial |
| -------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------ | --------------------------------------- | -------------- |
| `RF-ADM-FF-01` | US-200 / BR-FF-01          | `ListarFeatureFlagsUseCase.ts`                                                                              | `listar.feature`    | `listar.use-case.spec.ts`                        | `admin/feature-flags/list.spec.ts`      | 🔴 Missing     |
| `RF-ADM-FF-02` | US-201 / BR-FF-01          | `ObterFeatureFlagPorChaveUseCase.ts`                                                                        | `obter.feature`     | `obter.use-case.spec.ts`                         | `admin/feature-flags/get.spec.ts`       | 🔴 Missing     |
| `RF-ADM-FF-03` | US-202 / BR-FF-01          | `CriarFeatureFlagUseCase.ts`                                                                                | `criar.feature`     | `criar.use-case.spec.ts`                         | `admin/feature-flags/create.spec.ts`    | 🔴 Missing     |
| `RF-ADM-FF-04` | US-203 / BR-FF-01          | `AtualizarFeatureFlagUseCase.ts`                                                                            | `atualizar.feature` | `atualizar.use-case.spec.ts`                     | `admin/feature-flags/update.spec.ts`    | 🔴 Missing     |
| `RF-ADM-FF-05` | US-204 / BR-FF-02          | `AdicionarOverrideUseCase.ts`                                                                               | `overrides.feature` | `adicionar-override.use-case.spec.ts`            | `admin/feature-flags/overrides.spec.ts` | 🔴 Missing     |
| `RF-ADM-FF-06` | US-205 / BR-FF-02          | `RemoverOverrideUseCase.ts`                                                                                 | `overrides.feature` | `remover-override.use-case.spec.ts`              | `admin/feature-flags/overrides.spec.ts` | 🔴 Missing     |
| `RF-ADM-FF-07` | US-206 / BR-FF-02          | `ListarOverridesUseCase.ts`                                                                                 | `overrides.feature` | `listar-overrides.use-case.spec.ts`              | `admin/feature-flags/overrides.spec.ts` | 🔴 Missing     |
| `RF-ADM-FF-08` | US-207 / BR-FF-03 (núcleo) | `AvaliarFeatureFlagUseCase.ts` + `FeatureFlagEvaluator`                                                     | `avaliar.feature`   | `avaliar.use-case.spec.ts` + `evaluator.spec.ts` | `admin/feature-flags/evaluate.spec.ts`  | 🔴 Missing     |
| `RF-ADM-FF-09` | US-208 / BR-FF-01          | `ListarAuditLogUseCase.ts`                                                                                  | `audit.feature`     | `listar-audit.use-case.spec.ts`                  | `admin/feature-flags/audit.spec.ts`     | 🔴 Missing     |
| `RF-ADM-FF-10` | US-209 / BR-FF-04          | `PainelFeatureFlags.tsx` + `TabelaFeatureFlags.tsx` + `ModalOverrideFeatureFlag.tsx` + `AuditLogViewer.tsx` | `ui-painel.feature` | `painel.component.spec.tsx`                      | `admin/feature-flags/ui.spec.ts`        | 🔴 Missing     |

> User stories de backlog serão criadas com `US-200` a `US-209` (próximos IDs livres; backlog atual não usa este range — ver `docs/requirements/BACKLOG.md` quando existir).

---

## 11. Próximos Requisitos (sinalização para `design.md` baseline futuro)

| ID                   | Descrição                                     | Quarter alvo |
| -------------------- | --------------------------------------------- | ------------ |
| `WIP-FF-EXPERIMENTS` | Experimentos A/B com cálculo de significância | Q2/2027      |
| `WIP-FF-WEBSOCKET`   | Auto-refresh por WebSocket para o front       | Q3/2027      |
| `WIP-FF-VERSIONING`  | Manter N valores anteriores de uma flag       | Q4/2027      |

---

## 12. Dependências e Coordenação

- **BC `autenticacao`**: depende de `RF-AUTH-03` (JWT validado) para extrair `userId` no header dos endpoints admin.
- **BC `admin`**: depende de papéis (`owner`, `manager`) já existentes (`RF-ADM-03`, `RF-ADM-06`).
- **OpenTelemetry**: reusa span atual `http.request` para métrica `feature_flag_evaluate_duration_seconds`.
- **Redis 7**: cliente `ioredis` já presente no monorepo (uso em `apps/api/src/queues/`).
- **Sem novas dependências npm externas**.

---

## 13. Critérios de Pronto Globais (Definition of Done)

- [ ] `pnpm validate:quick` verde (lint, typecheck, test, build).
- [ ] `pnpm rtm` regenera RTM sem `Missing` para RF-ADM-FF-01..10.
- [ ] Cobertura de testes ≥ 80% no novo módulo (`apps/api/src/{domain,application,infrastructure,presentation}/admin/feature-flags/`).
- [ ] Cobertura ≥ 80% no SDK (`packages/feature-flags/`).
- [ ] Todos os RFs têm **pelo menos 1 cenário BDD** mapeado (vide §10).
- [ ] Teste E2E de RBAC verde (`admin/feature-flags/rbac.spec.ts`).
- [ ] Documentação atualizada: `docs/guides/FEATURE_FLAGS.md` (a criar na F3) explica precedência, cache e fallback.
- [ ] Dashboard Grafana "Feature Flags" com as 2 métricas Prometheus criadas.
- [ ] PR aprovado por **pelo menos** 1 mantenedor + CI verde, conforme `.openspec/AGENTS.md §4`.
