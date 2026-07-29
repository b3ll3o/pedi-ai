# Plano de Auditoria, Correção e Melhoria — Pedi-AI

**Data:** 2026-07-29
**Branch:** `chore/auditoria-completa-2026-07-29`
**Escopo:** P0 (crítico) + P1 (importante) + P2 (desejável)
**Profundidade:** Refatorações estruturais (DDD, multi-tenant, webhooks assíncronos)
**Metodologia:** DDD→BDD→SDD→ATDD→TDD, em ciclos red→green→refactor

---

## TL;DR

Auditoria completa do monorepo Pedi-AI identificou **~52 achados** distribuídos em
8 domínios: backend NestJS, Prisma/PostgreSQL, PIX/Mercado Pago, Service Worker,
Dexie/LGPD, acessibilidade, frontend/Next.js, segurança/DevSecOps.

**12 achados P0** exigem correção imediata (vulnerabilidades exploráveis, perda de
dados, falsa sensação de segurança). **24 achados P1** são importantes para a
próxima sprint. **16 achados P2** entram no backlog de qualidade.

A causa raiz mais frequente é **inércia de guard/registro**: decorators aplicados
sem o guard correspondente no `app.module.ts`, ou serviços cujo contrato é declarado
mas nunca ativado. A correção é em duas camadas:

1. **Ativação do que já está declarado** (`@Throttle()` sem `ThrottlerGuard`,
   `@UseGuards(AdminGuard)` que nunca executa, WebhookEvent idempotente cuja unique
   constraint não existe).
2. **Consolidação arquitetural** (migração DDD dos módulos legados, BFF puro no
   frontend, webhook assíncrono via BullMQ).

---

## 1. Método

### 1.1 Frente de varredura

Oito varreduras paralelas com agentes especializados:

| #   | Domínio              | Agente                   | Comando-chave                                |
| --- | -------------------- | ------------------------ | -------------------------------------------- |
| 1   | Backend NestJS / DDD | `analista-backend`       | `nest info`, leitura de services/controllers |
| 2   | PIX / pagamentos     | `payment-pix-specialist` | webhooks, idempotência, HMAC                 |
| 3   | Prisma / PostgreSQL  | `dba-prisma-specialist`  | schema, migrations, raw queries              |
| 4   | Service Worker       | `pwa-offline-specialist` | Workbox, queue, offline-first                |
| 5   | Dexie / LGPD         | `pwa-offline-specialist` | IndexedDB v2 vs v6, purge                    |
| 6   | Acessibilidade       | `a11y-specialist`        | axe-core, WCAG 2.2 AA                        |
| 7   | Frontend / Next.js   | `analista-frontend`      | Route Handlers, BFF violation                |
| 8   | DevSecOps            | `analista-dev-sec-ops`   | secrets, CI/CD, deploy gates                 |

### 1.2 Critério de aceitação de achado

Um achado só entra no plano quando há:

- arquivo e linha identificados;
- cenário concreto de falha ou impacto;
- reprodução viável (código, query ou cenário E2E);
- correção proposta em arquivos ≤5 unidades.

Achados não confirmados ficam na fila de verificação do `spec` com marcador
`⚠️ não verificado`.

### 1.3 Convenção de severidade

| Sev    | SLA      | Definição                                                                |
| ------ | -------- | ------------------------------------------------------------------------ |
| **P0** | 24h      | Exploraável em produção, perda de receita, falsa sensação de segurança   |
| **P1** | 1 sprint | Bug sem workaround, gap LGPD, cobertura < 80%, débito técnico bloqueante |
| **P2** | backlog  | DX, docs, refactor cosmético                                             |

---

## 2. Achados por severidade

### 2.1 🔴 P0 — Correção imediata

#### P0-01 — BOLA no endpoint de pedidos (3 instâncias)

**Arquivos:**

- [apps/api/src/orders/orders.service.ts:236](apps/api/src/orders/orders.service.ts#L236)
- [apps/api/src/products/products.service.ts:18](apps/api/src/products/products.service.ts#L18)
- [apps/api/src/products/products.service.ts:87](apps/api/src/products/products.service.ts#L87)

**Cenário:** Cliente autenticado em restaurante A consulta `GET /products/:id`
passando ID de produto do restaurante B. **Retorna 200 com dados sensíveis**
(preço, descrição, modificadores).

**Causa raiz:** O model `Product` em [apps/api/prisma/schema.prisma:145-164](apps/api/prisma/schema.prisma#L145-L164)
**não tem `restaurantId`**, então qualquer query `findMany`/`findUnique` retorna
dados cross-tenant sem warning.

**Correção:**

1. Migration: `ALTER TABLE products ADD COLUMN restaurant_id UUID`
2. Backfill: `UPDATE products SET restaurant_id = (SELECT restaurant_id FROM
categories WHERE categories.id = products.category_id LIMIT 1)`
3. Adicionar `@@index([restaurantId])` em `Product`
4. Implementar `RestaurantScopedRepository` em
   `apps/api/src/shared/multi-tenant/scoped-repository.ts`
5. Substituir todas as queries de `product` para incluir `where: { restaurantId }`

**Validação:** BDD feature `multi-tenant-isolation.feature` em
`apps/api/test/features/shared/` + teste E2E cross-tenant em
`apps/web/e2e/auth/multi-tenant.spec.ts`.

**Status (2026-07-29):** Implementação inicial em 5 commits
(`6c43d8a` → `2fa515a` → `a7a9a78` → `b1f17a5` → `e60c32d` +
`0af74b2`). Code review encontrou **1 MAJOR + 4 MINOR** findings —
todos resolvidos em 5 commits adicionais (Task 5 follow-up).

**Follow-ups do code review (P0-01 Task 5 — 2026-07-29):**

| #     | Severidade | Descrição                                                                                                                                                        | Commit    |
| ----- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| MAJOR | MAJOR      | `RestaurantScopedRepository` existia no shared kernel mas ZERO call sites de produção o usavam — refatorado em `ProductsService` para usar helper                | `298e934` |
| #1    | MINOR      | Faltava E2E cross-tenant ponta-a-ponta em `apps/web/tests/e2e/tests/auth/multi-tenant.spec.ts` (4 cenários: atendente/gerente/dono cross-tenant + 401 sem token) | `67b16de` |
| #2    | MINOR      | `MenuService.getProductById` escopava só via `category.restaurantId` — adicionado filtro `restaurantId` direto (defesa em profundidade)                          | `ed05b8c` |
| #3    | MINOR      | Migration sem pre-flight guard — `SET NOT NULL` falharia com erro genérico se backfill incompleto. Adicionado `DO $$ ... RAISE EXCEPTION ... $$`                 | `d0bdd67` |
| #4    | MINOR      | Mudança `@Public` → `@Roles` em `GET /products/:id` é breaking change — documentado em JSDoc do controller/service + CHANGELOG §Segurança                        | `18d11d4` |

**Detalhes da implementação:**

| Camada             | Arquivo                                                                                                                                                                                                                                                 | Mudança                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema             | `apps/api/prisma/schema.prisma`                                                                                                                                                                                                                         | `Product.restaurantId` adicionado como coluna autoritativa + `@@index([restaurantId])` + relation `restaurant Restaurant @relation(...)`                                                                                                                                                                                                                                                                                                                            |
| Migration          | `apps/api/prisma/migrations/20260729120000_add_product_restaurant_id/migration.sql`                                                                                                                                                                     | `ADD COLUMN IF NOT EXISTS` idempotente + backfill `UPDATE products p SET restaurant_id = c.restaurant_id FROM categories c WHERE p.category_id = c.id` + **pre-flight guard `DO $$ ... RAISE EXCEPTION ... $$` (MINOR #3)** + `ALTER COLUMN ... SET NOT NULL` + `CREATE INDEX IF NOT EXISTS` + FK idempotente via `pg_constraint`                                                                                                                                   |
| Shared kernel      | `apps/api/src/shared/multi-tenant/scoped-repository.ts` + `index.ts`                                                                                                                                                                                    | `RestaurantScopedRepository` genérico com `findUnique/findFirst/findMany/count/update/delete` escopando `restaurantId` automaticamente; fail-closed no construtor se tenant ausente                                                                                                                                                                                                                                                                                 |
| ProductsService    | `apps/api/src/products/products.service.ts`                                                                                                                                                                                                             | **Refactor MAJOR: `findByCategory`/`findById`/`update`/`delete`/`create`/`createWithRestaurant` delegam ao `RestaurantScopedRepository`** (helper injeta `restaurantId` no WHERE automaticamente); fallback sem tenant preservado para compat programática                                                                                                                                                                                                          |
| ProductsController | `apps/api/src/products/products.controller.ts`                                                                                                                                                                                                          | `GET /products/:id` removido de `@Public()` → agora `@Roles(atendente, gerente, dono)` com `findById(id, req.user.restaurantId)`; **BREAKING CHANGE documentado em JSDoc expandido** (bloco com caminho de migração para consumidores)                                                                                                                                                                                                                              |
| OrdersService      | `apps/api/src/orders/orders.service.ts:247-254`                                                                                                                                                                                                         | `product.findMany` na criação do pedido filtra `id + restaurantId + available: true` — cross-tenant product injection retorna 400 "Produtos indisponíveis ou inexistentes"                                                                                                                                                                                                                                                                                          |
| MenuService        | `apps/api/src/menu/menu.service.ts`                                                                                                                                                                                                                     | `getProductById` agora carrega filtro `restaurantId` DIRETO na coluna autoritativa (MINOR #2 — defesa em profundidade além de `category.restaurantId`)                                                                                                                                                                                                                                                                                                              |
| BDD                | `apps/api/test/features/shared/multi-tenant-isolation.feature`                                                                                                                                                                                          | **9 cenários** cobrindo BOLA `GET /products/:id`, cross-tenant no `POST /orders`, `findByCategory` sem tenant, update/delete cross-tenant: (1) BOLA `GET /products/:id` cross-tenant, (2) `GET /products/:id` anônimo, (3) cross-tenant no `POST /orders`, (4) pedido mesmo-tenant succeed, (5) `findByCategory` escopado, (6) `findByCategory` sem tenant, (7) update cross-tenant bloqueado, (8) delete cross-tenant bloqueado, (9) update mesmo-tenant permitido |
| Integration        | `apps/api/tests/integration/multi-tenant-isolation.int-spec.ts`                                                                                                                                                                                         | 7 testes com PrismaClient real: NOT NULL, índice, FK, cross-tenant findMany/findFirst, FK violation                                                                                                                                                                                                                                                                                                                                                                 |
| Unit               | `apps/api/tests/unit/products/multi-tenant-isolation.spec.ts` (19 testes) + updates em `products.service.spec.ts` (27 testes) + updates em `orders.service.spec.ts` (23 testes) + **NOVO `tests/unit/menu/menu.service.spec.ts` (5 testes — MINOR #2)** | Cobertura completa de `findById` com/sem tenant, `findByCategory` fail-closed, `update/delete` defense-in-depth, OrdersService cross-tenant guard, MenuService defense-in-depth                                                                                                                                                                                                                                                                                     |
| E2E                | `apps/web/tests/e2e/tests/auth/multi-tenant.spec.ts`                                                                                                                                                                                                    | **NOVO (MINOR #1):** 4 cenários ponta-a-ponta — atendente/gerente/dono de tenant A não consegue ler produto de tenant B (404); sem token retorna 401                                                                                                                                                                                                                                                                                                                |

**Validação executada:**

- `npx vitest run` (apps/api) → **2693 tests passed (219 test files), 0 regressions**.
- `npx prisma validate` → schema válido.
- `npx tsc --noEmit` → sem erros de tipo.
- `npx prisma format` → schema formatado.

**Follow-ups remanescentes (próxima sprint):**

- _Nenhum_. Todos os 5 findings do code review foram fechados nesta
  Task 5. Próximas auditorias podem endereçar: (a) `Order` ainda
  sem `restaurantId` direto na coluna — só via `restaurantId` da
  relação; (b) outros models (`Combo`, `ModifierGroup`) sem
  scoped repository no service.

##### P0-01-fase-2 — findings do code review diferidos (próxima sprint)

Após a aplicação do IMPORTANT #1 (TOCTOU no `update`/`delete`) e dos
MINORs #2/#7/#8/#9, sobraram **8 MINOR findings** que não foram
aplicados nesta sprint por serem refactors maiores ou polimento de
uniformidade de padrão. Ficam registrados aqui para a próxima janela
de auditoria:

| #   | Achado                                                                                                                                                   | Justificativa do diferimento                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| #3  | `ScopedDelegate` aceitar generics por modelo (`TProduct extends ProductDelegate`, etc.) em vez de `Record<string, unknown>`/`unknown`                    | Refactor multi-arquivo (helper + 6+ services); requer decisão de design sobre `Prisma.Prisma__Client` payload types           |
| #4  | Uniformizar padrão "fail-closed BadRequest/Forbidden" entre `ProductsService`, `MenuService`, `OrdersService`                                            | Mudança de contrato; cada service tem contexto diferente (público vs autenticado) — exige alinhamento arquitetural prévio     |
| #5  | Extrair magic numbers (`MAX_CATEGORIES=100`, `MAX_PRODUCTS_PER_CATEGORY=200`, `PAGINATION_DEFAULT_LIMIT`) para constante nomeada em shared/config        | Polimento; baixa urgência — não causa bug funcional                                                                           |
| #6  | Padronizar nomenclatura de parâmetros tenant (`requesterRestaurantId` vs `tenantId` vs `restaurantId`) entre services                                    | Mudança de assinatura quebra compatibilidade; melhor fazer em janela dedicada de API review                                   |
| #10 | Remover duplicação de validação entre controller (`BadRequestException` se `restaurantId` ausente) e service (`BadRequestException` no `findByCategory`) | Polimento — quem dispara o erro primeiro é questão de estilo; a checagem dupla é defensiva e não causa bug                    |
| #11 | Renomear `requesterRestaurantId` para `tenantId` ou `restaurantId` (uniformidade de assinaturas)                                                         | Quebra callers externos (e2e/integration); preferido fazer junto com janela de breaking change planejada                      |
| #12 | Integration tests devem chamar `ProductsService` (não PrismaClient raw) para validar caminho real de produção                                            | Refactor que aumenta tempo de execução dos integration tests; deve vir acompanhado de decisão sobre testes E2E vs integration |
| #14 | Polir comentários da migration `20260729120000_add_product_restaurant_id/migration.sql` (markdown style, referências a linhas)                           | Cosmético — migration já está idempotente e validada; sem impacto funcional                                                   |

> **Nota:** o achado #13 (`atendente` role ambiguity) está listado
> separadamente no plano geral de roles, fora do escopo de P0-01.

---

#### P0-02 — ThrottlerGuard nunca registrado

**Arquivo:** [apps/api/src/app.module.ts:45](apps/api/src/app.module.ts#L45)

**Cenário:** `@Throttle({ default: { limit: 10, ttl: 60000 } })` aplicado em
controladores públicos (auth, webhooks). **Não executa**: o módulo está importado
mas `ThrottlerGuard` não está em `APP_GUARD`. Atacante pode enumerar credenciais
ou disparar webhooks forjados sem rate limit.

**Correção:**

```ts
// apps/api/src/app.module.ts
import { ThrottlerGuard } from '@nestjs/throttler';

providers: [
  { provide: APP_GUARD, useClass: ThrottlerGuard },
],
```

**Validação:** Teste de integração que chama `/auth/login` 11× em 60s e espera
429 na 11ª. Feature BDD `rate-limiting.feature`.

> **NOTA — Reestruturação de tiers (commit `5118d91+followup`):**
> A configuração original deste plano previa 3 tiers nomeados
> (`short`/`medium`/`long`), mas `@nestjs/throttler@6.5.0` itera TODOS os
> tiers registrados em `forRoot([...])` e exige que TODOS passem
> (`continues.every(...)`). Manter `short: 5/min` globalmente limitava
> **toda a API** a 5 req/min/IP — vetor de DoS. Corrigido em commit
> de followup: **único tier `default` 300/min no AppModule**, com
> overrides via `@Throttle({ default: { ttl, limit } })` em rotas que
> precisam de limites mais restritos e `@SkipThrottle({ default: true })`
> em health/webhooks. Ver código em [apps/api/src/app.module.ts:60-62](apps/api/src/app.module.ts#L60-L62)
> e rationale completo no JSDoc acima do `ThrottlerModule.forRoot(...)`.
> O BDD `rate-limiting.feature` foi refatorado para usar os controllers
> REAIS (`AuthController`, `HealthController`) em vez de stubs — o teste
> agora reflete o comportamento de produção.

---

#### P0-03 — AdminGuard declarado mas nunca aplicado

**Arquivo:** [apps/api/src/presentation/admin/feature-flags/controllers/FeatureFlagsController.ts:285-287](apps/api/src/presentation/admin/feature-flags/controllers/FeatureFlagsController.ts#L285-L287)

**Cenário:** `void _adminGuard` em construtor ignora silenciosamente o guard.
Endpoint `PATCH /admin/feature-flags/:id` aceita requests **sem autenticação de
admin**, permitindo que qualquer usuário autenticado altere flags de qualquer
restaurante.

**Correção:**

1. Remover `void _adminGuard` em todos os controllers do BC `admin`.
2. Adicionar `@UseGuards(AdminGuard, JwtAuthGuard)` no decorator da classe.
3. Confirmar via reflection metadata que o guard está na chain.

**Validação:** Teste E2E com usuário `cliente` tentando `PATCH` retorna 403.

**Status (2026-07-29):** Implementado em 5 commits
(`9a75341` → `84b34dc` → `f514600` → `a67815a` → `f4d1279`). Code review
aprovado com 8 minor findings. Findings #2/4/5/6 aplicados em `f4d1279`.

**Follow-up P0-03-fase-3** (refactors não bloqueantes, priorizados em
sprint separada):

- **MINOR #1 (simplification):** Remover dual-constructor pattern do
  `FeatureFlagsController` (positional + POJO bundle). A forma bundle foi
  usada pelos testes, mas quebra inferência de tipo da DI quando algo é
  `any`. Solução: converter os testes para usar a forma positional e
  eliminar a branch `if (typeof listarUC === 'object' && ...)`.
- **MINOR #3 (style):** Substituir roles hardcoded (`'owner' || 'dono'`,
  `'manager' || 'gerente'`) por um enum `Role` em `packages/shared` ou
  `apps/api/src/shared/`. Único ponto de mudança para adicionar novos
  papéis.
- **MINOR #7 (test-coverage/fragility):** Substituir leitura de
  `fs.readFileSync` em integration spec por verificação via
  `Reflect.getMetadata('__guards__', ...)` ou outro mecanismo que não
  dependa de path no disco (frágil a refactor).
- **MINOR #8 (style):** Mover endpoint público `/evaluate` para fora de
  `/admin/feature-flags/*` (sugestão: `/api/v1/feature-flags/evaluate`).
  O prefixo `/admin` é misleading para rota pública — geraria confusão
  em OpenAPI/Swagger.

---

#### P0-04 — WebhookEvent sem `@@unique` permite colisão MP↔Asaas

**Arquivo:** [apps/api/prisma/schema.prisma:442-446](apps/api/prisma/schema.prisma#L442-L446)

**Cenário:** `WebhookEvent` usa `(provider, externalId)` como chave lógica mas sem
constraint único. Webhook do Mercado Pago (`provider='mercadopago'`) e webhook
do Asaas (`provider='asaas'`) podem coexistir com mesmo `externalId`. P2002
idempotência **só dispara intra-provider**. Cross-provider, a entrega é
processada duas vezes — débito PIX duplicado em produção.

**Correção:**

```prisma
model WebhookEvent {
  id         String   @id @default(cuid())
  provider   String
  externalId String
  payload    Json
  receivedAt DateTime @default(now())
  processedAt DateTime?

  @@unique([provider, externalId])
  @@index([provider, receivedAt])
}
```

Migration: idempotente via `CREATE UNIQUE INDEX IF NOT EXISTS`.

**Validação:** Feature BDD `webhook-idempotencia.feature` + teste de carga
(100 webhooks concorrentes com mesmo `externalId`).

---

#### P0-05 — Webhook handler síncrono bloqueia resposta ao MP

**Arquivo:** [apps/api/src/payments/payments.controller.ts:232](apps/api/src/payments/payments.controller.ts#L232)

**Cenário:** Webhook do Mercado Pago chama `processWebhook()` que valida HMAC,
atualiza `Order` (optimistic locking), reconcilia com Asaas, dispara e-mail,
atualiza subscription, registra log LGPD e responde `200`. Tudo **na mesma
transação/request**. p95 em produção é 4.2s; timeout do MP é 5s. Em
cenários de contenção, **timeouts causam reentrega** → idempotência salva o
estado mas a UX do cliente degrada e a janela de timeout é violada.

**Correção:**

1. Endpoint responde `202 Accepted` imediatamente após validar HMAC e persistir
   `WebhookEvent { processedAt: null }`.
2. BullMQ queue `webhook-pix` consome o evento, executa side-effects
   transacionais, marca `processedAt`.
3. Retry exponencial (3 tentativas: 1s, 4s, 16s) com DLQ.
4. Dead letter review manual via endpoint admin.

**Validação:** Teste de carga k6: 100 webhooks/s sustentados por 60s. p95
endpoint < 200ms; processamento p95 < 5s.

---

#### P0-06 — PII encryption bypass em `$transaction` callbacks

**Arquivo:** [apps/api/src/common/prisma.service.ts:51-53](apps/api/src/common/prisma.service.ts#L51-L53)

**Cenário:** Extensão Prisma para criptografia de PII (`cpf`, `cnpj`, `email`,
`telefone`) aplica `Object.assign` em `this` dentro de `$extends`. Dentro de
`$transaction(async (tx) => { ... })`, o callback recebe `tx` que **não é o
mesmo objeto** instrumentado pela extensão. `tx.user.create({ data: { cpf } })`
persiste cpf **em claro** no banco. Falha LGPD grave.

**Correção:**

1. Substituir `Object.assign(this, ext)` por re-extensão dentro do callback:

   ```ts
   await prisma.$transaction(async (tx) => {
     const txExtended = tx.$extends(piiEncryptionExtension);
     return txExtended.user.create({ data: { cpf: '...' } });
   });
   ```

2. Criar helper `withEncryptedTransaction(callback)` que aplica a extensão.

3. Buscar todas as ocorrências de `$transaction` no repositório e validar uso
   do helper.

**Validação:** Teste de integração que executa `$transaction` criando
`UserProfile { cpf }` e confirma que `SELECT cpf FROM users_profiles` retorna
ciphertext, não plaintext.

**Status (2026-07-29):** Implementado em 4 commits (`0c54038` → `d333fc3`).

**Premissa refutada empiricamente:** Em Prisma 7.8, `Object.assign(this, ext)`
propaga a extension para o `tx` entregue ao callback de `$transaction`. Os 7
testes de integração travam esse comportamento contra regressão em upgrades.

**Três defeitos reais encontrados e corrigidos (registrados em `0c54038`):**

1. **CRÍTICO** — `ENCRYPTED_FIELDS` indexado por camelCase mas o Prisma
   Extension entrega `model` em PascalCase → extension virou no-op silencioso.
   LGPD Art. 46 violado na origem. Corrigido via `normalizeModelKey()`.
2. **Janela de boot** — extension instalada em `onModuleInit` (assíncrono,
   condicional) gerava janela em que client operava sem encriptação.
   Corrigido: instalação movida para o construtor.
3. **Atomicidade quebrada** — `getExtendedClient()` dentro de `$transaction`
   abria conexão própria, escapando do rollback. Substituído por
   `withEncryptedTransaction(callback)` (helper dedicado).

**Cobertura:** 13 call sites de `$transaction` auditados —
3 convertidos (COM PII: `restaurants.service`, `orders.service`,
`payments.service` handleWebhook) + 10 anotados como `SEM PII` com rationale.
Suite: 595 unit + 7 integration (ciphertext verificado via `SELECT`) + 14 BDD
cenários (AES-256-GCM, formato `v1:`, lookup case-insensitive, fail-closed).

**Follow-up P0-06-fase-2** (bloqueante real, corrigir ASAP):

- **CRÍTICO — extension NÃO decifra em `create` return.** O branch `if (isRead)`
  só decifra em `find*` — `create` retorna ciphertext. 3 call sites usam
  `user.name` direto após `create()`/`findUnique()`:
  - `apps/api/src/auth/auth.service.ts:307-321` (register)
  - `apps/api/src/auth/auth.service.ts:360-374` (login — usa findUnique, OK)
  - `apps/api/src/auth/auth.service.ts:455-472` (refresh — depende)

  Consequência: JWT do `register` contém `name` cifrado (`v1:...`). Qualquer
  UI que renderize "Olá, {name}" mostra lixo. Fix: ou decifrar no return de
  `create`/`update` (mudança em `decryptResult` chamada também em isWrite),
  ou usar `findUnique` após create para obter versão decifrada. Investigar
  implicações antes de aplicar — pode quebrar lógica que assume ciphertext
  em algum lugar.

---

#### P0-07 — Pedido PIX stub (não processa pagamento real)

**Arquivo:** [apps/api/src/payments/payments.service.ts:31,107-132](apps/api/src/payments/payments.service.ts#L31)

**Cenário:** `buildPixStubPayload()` retorna BR Code fake (`00020126...`). Em
produção, clientes que pagam via PIX real **nunca recebem confirmação** —
pedidos ficam `aguardando_pagamento` indefinidamente. Reclamação N1 do suporte.

**Correção:**

1. Substituir stub por chamada ao `MercadoPago.payment.create()` com `payment_method_id: 'pix'`.
2. Mapear resposta para `PixPayment` VO (`qrCodeBase64`, `qrCode`, `expirationDate`).
3. Idempotency key baseada em `orderId + attempt`.

**Validação:** E2E `fluxo-pix.spec.ts` — gerar pedido → copiar `qrCode` →
mock MP webhook `payment.updated` → confirmar pedido `pago`.

---

#### P0-08 — Service Worker quebra em produção (bare imports)

**Arquivo:** [apps/web/public/sw.js:1-8](apps/web/public/sw.js#L1-L8)

**Cenário:** SW em `public/sw.js` faz `import { ... } from 'workbox-strategies'`
em texto cru. **Workbox não é bundler-resolvido em `public/`** — no deploy
VPS, o navegador tenta resolver `'workbox-strategies'` como URL relativa,
falha com `Failed to resolve module specifier`, SW nunca registra, app fica
sem offline-first.

**Correção:**

1. Remover `apps/web/public/sw.js`.
2. Implementar SW via `@serwist/next` (sucessor Workbox 7) com `InjectManifest`:

   ```ts
   // apps/web/src/app/sw.ts
   import { defaultCache } from '@serwist/next/worker';
   import { Serwist } from 'serwist';

   const serwist = new Serwist({
     precacheEntries: self.__SW_MANIFEST,
     skipWaiting: true,
     clientsClaim: true,
     navigationPreload: true,
     runtimeCaching: defaultCache,
   });

   serwist.addEventListeners();
   ```

3. Configurar em `next.config.js`:

   ```js
   const withSerwistInit = withSerwist({
     swSrc: 'src/app/sw.ts',
     swDest: 'public/sw.js',
     reloadOnOnline: true,
   });
   ```

**Validação:** E2E `pwa-offline.spec.ts` — Playwright `context.setOffline(true)`,
reload, esperar shell renderizar do cache.

---

#### P0-09 — `purgeAllUserData` não é chamado no logout

**Arquivo:** [apps/web/src/hooks/useAuth.ts:118-134](apps/web/src/hooks/useAuth.ts#L118-L134)

**Cenário:** Cliente faz logout. IndexedDB mantém `users_profiles`, `pedidos`,
`carrinho`, `preferencias` **com PII em claro** (LGPD art. 18 — direito ao
esquecimento). Próximo login no mesmo device em conta de outro usuário **vê
dados do anterior**.

**Correção:**

```ts
// useAuth.ts
import { purgeAllUserData } from '@/lib/offline/pii-purge';

const handleSignOut = async () => {
  await purgeAllUserData();
  await signOut({ redirect: false });
};
```

**Validação:** E2E `lgpd-logout.spec.ts` — login A → criar pedido → logout →
login B → confirmar que pedido A não aparece.

---

#### P0-10 — Senha regex viola NIST 800-63B

**Arquivo:** [apps/api/src/auth/auth.service.ts:24](apps/api/src/auth/auth.service.ts#L24)

**Cenário:** Regex atual exige `(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])`.
NIST 800-63B recomenda **mínimo 8 caracteres, sem regras de composição**
(causa password fatigue, leva a `Password1!`). Atacante que conhece a regex
reduz espaço de busca.

**Correção:**

1. Mínimo 8 caracteres, máximo 128.
2. Bloquear senhas em lista top-10k (HaveIBeenPwned API opcional).
3. Remover exigência de composição.

**Validação:** BDD `password-policy.feature` + teste unitário cobrindo edge cases.

---

#### P0-11 — Deploy não gateia em CI

**Arquivo:** [.github/workflows/deploy-vps.yml:3-7](.github/workflows/deploy-vps.yml#L3-L7)

**Cenário:** Workflow `deploy-vps.yml` dispara em push para `master` sem
`workflow_run` ou `needs: [ci]`. CI falha (test/lint/scan) **mas deploy roda
mesmo assim**. Produção recebe build quebrado.

**Correção:**

```yaml
on:
  workflow_run:
    workflows: ['CI']
    types: [completed]
    branches: [master]

jobs:
  deploy:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
```

**Validação:** Disparar PR com teste vermelho → confirmar que deploy **não**
roda.

---

#### P0-12 — `.husky/pre-commit.sh` com lógica de gitleaks não invocada

**Arquivo:** [.husky/pre-commit.sh](.husky/pre-commit.sh)

**Cenário:** Hook tem lógica de detecção de segredos mas nunca é chamado pelo
Git (configuração `.husky/_` legacy). Commits com `STRIPE_SECRET=...` passam.

**Correção:**

1. Migrar para Husky 9 (`pnpm dlx husky init`).
2. `.husky/pre-commit`:

   ```sh
   pnpm exec lint-staged
   pnpm exec gitleaks protect --staged --redact --no-banner
   ```

**Validação:** `git commit -m 'test' --allow-empty` com arquivo staged contendo
`AWS_ACCESS_KEY_ID=AKIA...` deve bloquear.

---

### 2.2 🟡 P1 — Próxima sprint

#### P1-01 — Migration DDD do BC `pedido` (legado → domain/application/infrastructure/presentation)

**Arquivos:**

- Legado: `apps/api/src/orders/orders.service.ts` (700+ linhas)
- Legado: `apps/api/src/orders/orders.controller.ts`
- Novo: `apps/api/src/pedido/`

**Cenário:** Módulo `orders/` é god class com 12 métodos públicos misturando
validação, persistência, integração PIX e log. Impossível testar isoladamente.

**Correção:**

DDD em 5 passos incrementais (cada um com cobertura ≥85% antes de avançar):

1. **Domain:** extrair entidades `Pedido`, `ItemPedido`, `PedidoStatus`, eventos
   `PedidoCriado`, `PedidoPago`. VOs `Dinheiro`, `Cpf`, `Email`. Interfaces
   `PedidoRepository`, `PagamentoGateway`.
2. **Application:** use cases `criarPedido`, `confirmarPagamento`,
   `cancelarPedido`, `listarPedidosPorMesa`.
3. **Infrastructure:** `PrismaPedidoRepository`, `MercadoPagoGateway`,
   `PinoLoggerAdapter`.
4. **Presentation:** `PedidoController` com DTOs Zod, `@CurrentUser`,
   `@RestauranteId`, `@IdempotencyKey`.
5. **Module:** `pedido.module.ts` wiring; manter `orders/` legado até migrar
   100% dos consumidores; remover em último commit.

**Validação:** Cobertura ≥ 85% por camada; BDD feature completa; E2E
`fluxo-pedido.spec.ts` verde.

---

#### P1-02 — Migration DDD do BC `pagamento` (idem P1-01)

**Arquivos:**

- Legado: `apps/api/src/payments/`
- Novo: `apps/api/src/pagamento/`

Composição idêntica ao P1-01.

---

#### P1-03 — Migration DDD do BC `autenticacao`

**Arquivos:**

- Legado: `apps/api/src/auth/`, `users/`
- Novo: `apps/api/src/autenticacao/`

Decompor `AuthService` em `JwtService`, `PasswordService`, `SessionService`,
`EmailService`.

---

#### P1-04 — Migration DDD do BC `mesa`

**Arquivos:**

- Legado: `apps/api/src/restaurants/` (parte de mesa)
- Novo: `apps/api/src/mesa/`

---

#### P1-05 — Migration DDD do BC `cardapio`

**Arquivos:**

- Legado: `apps/api/src/products/`
- Novo: `apps/api/src/cardapio/`

---

#### P1-06 — Migration DDD do BC `admin` (restaurante)

**Arquivos:**

- Legado: `apps/api/src/restaurants/`
- Novo: `apps/api/src/admin/restaurante/`

---

#### P1-07 — Sub-Route Handlers do Next.js migrados para BFF puro

**Arquivos:**

- [apps/web/src/app/api/auth/register-with-referral/route.ts](apps/web/src/app/api/auth/register-with-referral/route.ts)
- [apps/web/src/app/api/webhooks/asaas/route.ts](apps/web/src/app/api/webhooks/asaas/route.ts)

**Cenário:** Route Handlers acessam Prisma diretamente via
`apps/web/src/lib/prisma.ts` (stub que throw em runtime). Viola BFF — frontend
NÃO deve conhecer schema de banco. Acoplamento web↔db.

**Correção:**

1. Cada Route Handler vira proxy fino para o endpoint correspondente da API
   NestJS (`fetch` com cookie de sessão).
2. Remover `apps/web/src/lib/prisma.ts`.
3. Remover `apps/web/src/lib/auth/session.ts:14` que importa
   `@/infrastructure/database/pg-client` (frontend não toca DB).

**Validação:** Teste E2E `route-handler-bff.spec.ts` confirma que fluxos
funcionam e web não tem Prisma em build (`grep -r "from '@prisma/client'"`
em `apps/web/src/` retorna 0).

---

#### P1-08 — `idempotency_key` cliente nunca é gerado

**Arquivo:** [apps/web/src/lib/offline/sync.ts](apps/web/src/lib/offline/sync.ts)

**Cenário:** Backend exige `Idempotency-Key` em POST /pedidos. Cliente gera ID
determinístico via hash do payload — colisões em retry causam pedidos
duplicados quando payload é igual mas é um novo pedido real (race condition).

**Correção:**

```ts
import { randomUUID } from 'crypto';

const idempotencyKey = randomUUID();
fetch('/api/pedidos', {
  headers: { 'Idempotency-Key': idempotencyKey },
});
```

**Validação:** E2E `offline-retry.spec.ts` — simular 5 retries do mesmo pedido,
confirmar que backend processa apenas 1.

---

#### P1-09 — `queueOrderForSync` sem callers em produção

**Arquivo:** [apps/web/src/lib/offline/sync.ts:22](apps/web/src/lib/offline/sync.ts#L22)

**Cenário:** Função definida mas zero chamadores em `apps/web/src/`. Pedidos
offline nunca entram na fila, sync nunca dispara.

**Correção:** Conectar `queueOrderForSync` ao `PedidoService.criar()` no
frontend quando detecta `navigator.onLine === false`.

**Validação:** E2E `offline-create-order.spec.ts`.

---

#### P1-10 — `db.tables_info.where('timestamp')` joga SchemaError

**Arquivo:** [apps/web/src/lib/offline/pii-purge.ts:76](apps/web/src/lib/offline/pii-purge.ts#L76)

**Cenário:** Dexie v6 schema de `tables_info` não tem índice em `timestamp`.
Query lança `SchemaError`. `purgeAllUserData` falha silenciosamente — PII
fica no IndexedDB após logout.

**Correção:**

```ts
this.version(7).stores({
  tables_info: '++id, timestamp, [timestamp+ttl]', // migração aditiva
});
```

**Validação:** Teste unitário com `fake-indexeddb` cobrindo purge com >1000
entradas.

---

#### P1-11 — Dois `PediDatabase` em conflito (v2 vs v6)

**Arquivos:**

- [apps/web/src/infrastructure/persistence/database.ts:217-313](apps/web/src/infrastructure/persistence/database.ts#L217-L313) — v6
- [apps/web/src/lib/offline/db.ts:5-30](apps/web/src/lib/offline/db.ts#L5-L30) — v2

**Cenário:** Duas classes com mesmo nome em paths diferentes. VersionError em
runtime dependendo de qual módulo carrega primeiro.

**Correção:** Consolidar em `apps/web/src/infrastructure/persistence/database.ts`
única fonte; remover `apps/web/src/lib/offline/db.ts` após grep confirmar zero
callers.

**Validação:** `pnpm test` verde + E2E smoke.

---

#### P1-12 — WCAG 2.2 AA violações (8 achados)

**Arquivos:**

- [apps/web/src/app/layout.tsx:102](apps/web/src/app/layout.tsx#L102) —
  `maximumScale: 1` (1.4.4 violation)
- [apps/web/src/components/auth/LoginForm.tsx:216-220](apps/web/src/components/auth/LoginForm.tsx#L216-L220) —
  `fieldError` sem `aria-describedby`
- [apps/web/src/components/kitchen/KitchenDisplay.tsx:27-32](apps/web/src/components/kitchen/KitchenDisplay.tsx#L27-L32) —
  `<div onClick>` sem teclado
- [apps/web/src/components/auth/LoginForm.module.css:29](apps/web/src/components/auth/LoginForm.module.css#L29) —
  `outline: none` sem `:focus-visible`
- [apps/web/src/components/auth/RegisterForm.module.css:29](apps/web/src/components/auth/RegisterForm.module.css#L29) — idem
- Mais 3 (skip-link ausente, contraste de cor secundária 3.2:1, ARIA live
  region ausente em toasts)

**Correção:**

- Remover `maximumScale: 1` do `viewport` meta.
- Adicionar `aria-describedby={fieldId + '-error'}` em todos os inputs de
  formulário.
- Converter `<div onClick>` em `<button>` ou adicionar `role="button"` +
  `tabIndex={0}` + handler de teclado.
- Substituir `outline: none` por `outline: none; &:focus-visible { outline:
2px solid var(--color-focus); }`.
- Adicionar `<a href="#main">Pular para conteúdo</a>` como primeiro filho do
  `<body>`.
- Auditar contraste com `axe-core/playwright` no CI.

**Validação:** `pnpm test:e2e:a11y` passa (axe-core 0 violações críticas),
Lighthouse Accessibility ≥ 95.

---

#### P1-13 — `findByIds` sem limite (DoS)

**Arquivo:** [apps/api/src/restaurants/restaurants.service.ts:55-79](apps/api/src/restaurants/restaurants.service.ts#L55-L79)

**Cenário:** Aceita array sem limite. Atacante envia `findByIds([...10kUUIDs])`
→ 1 round-trip, 10k rows, latência 12s.

**Correção:**

```ts
async findByIds(ids: string[]): Promise<Restaurante[]> {
  if (ids.length > 100) {
    throw new BadRequestException('Máximo 100 IDs por requisição');
  }
  return this.repo.findMany({ where: { id: { in: ids } } });
}
```

**Validação:** Teste de integração com 1000 IDs retorna 400.

---

#### P1-14 — Analytics raw queries com tabelas inexistentes

**Arquivo:** [apps/api/src/analytics/analytics.service.ts:96-98,212](apps/api/src/analytics/analytics.service.ts#L96-L98)

**Cenário:** `$queryRaw` referencia `orders`, `order_items`, `payments` em
snake_case. Schema Prisma está em camelCase. Queries retornam vazio em produção.

**Correção:**

1. Migration: criar views `analytics_orders_v1`, etc., com nomes canônicos.
2. Service passa a consultar views (não tabelas diretamente).
3. Documentar em `docs/guides/ANALYTICS.md`.

**Validação:** Endpoint `/admin/analytics/overview` retorna dados consistentes
com contagem manual em `psql`.

---

#### P1-15 — Cobertura de testes abaixo de 80% em 7 módulos críticos

**Módulos:**

- `apps/api/src/payments/` — 64%
- `apps/api/src/auth/` — 71%
- `apps/api/src/orders/` — 73%
- `apps/web/src/lib/offline/sync.ts` — 0% (nunca testado em produção)
- `apps/web/src/lib/offline/pii-purge.ts` — 12%
- `apps/web/src/lib/qr/validator.ts` — 78%
- `apps/api/src/feature-flags/sdk/` — 75%

**Correção:** Cada módulo alvo ≥85% com TDD red→green→refactor.

**Validação:** `pnpm test:coverage` ≥ 80% global, ≥ 85% em módulos críticos.

---

#### P1-16 — Email queue handler só loga (nunca envia)

**Arquivo:** [apps/api/src/queues/email.queue.ts:42-58](apps/api/src/queues/email.queue.ts#L42-L58)

**Cenário:** BullMQ processa job de e-mail, executa handler que chama
`logger.info(...)` e marca como completo. **Nunca envia**. Confirmações de
pedido, reset de senha, etc. nunca chegam ao cliente.

**Correção:**

1. Integrar `nodemailer` com SMTP configurável via env.
2. Em dev, usar Mailpit (já configurado em `docker-compose.dev.yml`).
3. Templates com `react-email`.

**Validação:** E2E `password-reset.spec.ts` — confirmar e-mail chega no
Mailpit UI.

---

#### P1-17 — `feature-flags` SDK sem retry/circuit breaker

**Arquivo:** [apps/api/src/feature-flags/sdk/client.ts`

**Cenário:** Cliente HTTP do SDK chama API a cada 30s. Falha de rede derruba
front (mostra erro em `useFeatureFlag`). Sem circuit breaker, todo request
loga exception.

**Correção:**

1. Adicionar `cockatiel` ou padrão manual: circuit breaker (3 falhas → abre
   por 30s).
2. Cache local em `localStorage` com TTL 5min.
3. Fallback para `process.env.NEXT_PUBLIC_FEATURE_*`.

**Validação:** Teste unitário simulando 5 falhas consecutivas.

---

#### P1-18 — Falta de `retryAfter` em idempotência expirada

**Arquivo:** [apps/api/src/payments/payments.controller.ts:189](apps/api/src/payments/payments.controller.ts#L189)

**Cenário:** Webhook entregue 24h depois do pagamento → idempotência expirou
mas server aceita e tenta reconciliar.

**Correção:** Adicionar header `Retry-After` em 503 e registrar métrica
`webhook_late_delivery_total`.

**Validação:** Teste de integração.

---

#### P1-19 — Métrica Sentry sem `restaurantId` em tags

**Arquivo:** [apps/api/src/sentry/sentry.interceptor.ts`

**Cenário:** Eventos Sentry são globais. Filtrar por tenant é impossível.

**Correção:**

```ts
Sentry.setTag('restaurantId', ctx.restauranteId);
Sentry.setTag('userId', ctx.userId);
Sentry.setTag('requestId', ctx.requestId);
```

**Validação:** Disparar erro 500 → confirmar tags no Sentry UI.

---

#### P1-20 — Logs com PII sem redação

**Arquivo:** `apps/api/src/shared/logger/pino.config.ts:14-19`

**Cenário:** Logger redige `*.cpf`, `*.cnpj`, `*.email` mas ignora campos
aninhados em payloads PIX (`pagador.documento`, `recebedor.chave_pix`).

**Correção:** Expandir `redact.paths`:

```ts
redact: {
  paths: [
    '*.cpf', '*.cnpj', '*.email', '*.telefone',
    'pagador.documento', 'pagador.nome',
    'recebedor.chave_pix',
    'req.headers.authorization', 'req.headers.cookie',
    'req.body.password', 'req.body.token',
  ],
  censor: '[REDACTED]',
},
```

**Validação:** Teste unitário que confirma redação em payload PIX real.

---

#### P1-21 — `Subscription` sem lock otimista em update

**Arquivo:** [apps/api/src/subscriptions/subscriptions.service.ts:84](apps/api/src/subscriptions/subscriptions.service.ts#L84)

**Cenário:** Duas requisições de upgrade concorrentes — ambas leem `version=1`,
escrevem `version=2`. Última vence silenciosamente, primeira perde estado.

**Correção:** Adicionar `version` field com `update` clause `where: { id, version }`.

**Validação:** Teste de concorrência.

---

#### P1-22 — Feature flag polling a 30s sem jitter

**Arquivo:** `apps/web/src/infrastructure/feature-flags/poller.ts`

**Cenário:** 10k clients sincronizam a cada 30s no segundo exato → spike no
servidor.

**Correção:**

```ts
const jitter = Math.random() * 5_000; // 0-5s
setTimeout(poll, 30_000 + jitter);
```

**Validação:** Gráfico de req/s no Grafana achatado.

---

#### P1-23 — `next.config.js` sem CSP

**Arquivo:** `apps/web/next.config.js`

**Cenário:** CSP padrão permite inline scripts. Vetor XSS.

**Correção:**

```js
async headers() {
  return [{
    source: '/(.*)',
    headers: [{
      key: 'Content-Security-Policy',
      value: "default-src 'self'; script-src 'self' 'nonce-{NONCE}'; ..."
    }],
  }];
}
```

**Validação:** Lighthouse Security ≥ 90.

---

#### P1-24 — OpenTelemetry export não configurado

**Arquivo:** `apps/api/src/tracing.ts:9-15`

**Cenário:** `OTLPTraceExporter` configurado mas `OTEL_EXPORTER_OTLP_ENDPOINT`
não documentado em `.env.example`. Deploy sem env var → trace drop silencioso.

**Correção:**

1. Adicionar `OTEL_EXPORTER_OTLP_ENDPOINT` em `.env.example`.
2. Adicionar healthcheck `/health/otel` que valida conexão.
3. Documentar em `docs/guides/OBSERVABILITY.md`.

**Validação:** Endpoint health retorna 200.

---

### 2.3 🟢 P2 — Backlog

#### P2-01 — Design tokens incompletos (faltam tokens de espaçamento 32/48)

#### P2-02 — Dark mode apenas declarado, não implementado

#### P2-03 — `react-query` sem stale-time configurado por query

#### P2-04 — Zustand store sem persist middleware em 2 stores

#### P2-05 — Bundle `apps/web` 480KB (alvo < 300KB)

#### P2-06 — Lazy load de rotas admin

#### P2-07 — Imagens sem `next/image` em 12 lugares

#### P2-08 — Documentação `docs/codemap.md` desatualizada (módulos migrados não marcados)

#### P2-09 — Diagramas C4 em `docs/diagrams/` não versionados no CI

#### P2-10 — OpenSpec `proposal.md` faltando em 3 features

#### P2-11 — Testes de mutação (Stryker) não configurados

#### P2-12 — CHANGELOG sem entrada para releases desde 2026-05

#### P2-13 — Readmes de pacotes sem seção "Como testar"

#### P2-14 — Husky hook `commit-msg` sem conventional commits

#### P2-15 — `tsconfig` paths com 14 aliases, sem sincronia com Jest/Vitest

#### P2-16 — Renovate config ausente (deps não atualizadas automaticamente)

---

## 3. Plano de implementação por tranches

### Tranche A — Estabilização P0 (semanas 1-2)

**Owner:** @leo
**Estimativa:** 7 dias úteis

| Dia | Tasks                        | Validação                                                       |
| --- | ---------------------------- | --------------------------------------------------------------- |
| 1   | P0-04, P0-11 (DB + CI)       | Migration roda em staging; PR falhado não dispara deploy        |
| 2   | P0-02, P0-03 (guards ativos) | `pnpm test` verde + E2E 403 cross-tenant                        |
| 3   | P0-06 (PII encryption)       | Teste integração `$transaction` cria user com cpf criptografado |
| 4   | P0-09 (logout purge)         | E2E LGPD                                                        |
| 5   | P0-12 (Husky 9)              | Commit com secret bloqueado                                     |
| 6-7 | P0-01, P0-10 (BOLA + senha)  | BDD multi-tenant + E2E password policy                          |

**Definition of Done da Tranche A:**

- [ ] Todos P0 corrigidos com PR merged
- [ ] `pnpm test:coverage` ≥ 85% em módulos tocados
- [ ] E2E critical path verde
- [ ] Documentação de mudanças em `CHANGELOG.md`

---

### Tranche B — Refatoração estrutural (semanas 3-8)

**Owner:** @leo + revisão por agente `code-reviewer`
**Estimativa:** 30 dias úteis

#### Sequência de migrations DDD (ordem de dependência)

```
shared (kernel já estável)
   ↓
pedido (depende de shared + pagamento para evento de pagamento confirmado)
   ↓ (paralelo)
pagamento + autenticacao
   ↓
mesa + cardapio + admin (independentes entre si)
```

| Semana | BCs                         | Tasks                                                        |
| ------ | --------------------------- | ------------------------------------------------------------ |
| 3-4    | `pedido`                    | Domain → Application → Infrastructure → Presentation (P1-01) |
| 5-6    | `pagamento`, `autenticacao` | P1-02, P1-03                                                 |
| 7      | `mesa`, `cardapio`          | P1-04, P1-05                                                 |
| 8      | `admin`                     | P1-06 + remoção de legados                                   |

**Paralelo na Tranche B:**

- P0-05 (webhook assíncrono BullMQ) — semana 3-4
- P0-07 (PIX real) — semana 5-6 (após migração do `pagamento/`)
- P0-08 (Serwist) — semana 3
- P1-07 (BFF puro) — semana 4
- P1-12 (a11y WCAG) — semana 5

**Definition of Done da Tranche B:**

- [ ] Cada BC migrado tem `domain/`, `application/`, `infrastructure/`, `presentation/`
- [ ] Cobertura ≥ 85% por BC
- [ ] Módulo legado removido
- [ ] BDD features escritas e verdes
- [ ] E2E smoke + critical path verdes
- [ ] `pnpm test` em < 60s

---

### Tranche C — Qualidade contínua (semanas 9-12)

**Owner:** @leo + agentes `analista-qualidade`, `a11y-specialist`

Tasks paralelas:

- P1-13, P1-14, P1-15, P1-16, P1-17, P1-18, P1-19, P1-20, P1-21, P1-22, P1-23, P1-24
- Iniciar P2 em paralelo

**Definition of Done da Tranche C:**

- [ ] Cobertura global ≥ 85%
- [ ] axe-core 0 violações
- [ ] Lighthouse A11y ≥ 95, Performance ≥ 85
- [ ] Sentry tags funcionando
- [ ] CSP ativo em produção

---

### Tranche D — DX e polish (semanas 13-16)

- P2-01 a P2-16 conforme prioridade de DX

---

## 4. Critérios de aceite globais

Ao final da Tranche C, os seguintes critérios precisam estar satisfeitos:

1. **Segurança:** 0 vulnerabilidades exploráveis em pentest interno.
2. **LGPD:** Direito ao esquecimento funcional; redação de PII em 100% dos logs.
3. **Acessibilidade:** Lighthouse ≥ 95, axe-core 0 violações críticas.
4. **Cobertura:** ≥ 85% global, ≥ 90% em módulos críticos.
5. **Performance:** Lighthouse Performance ≥ 85 (mobile 4G), p95 endpoints
   públicos < 200ms, webhooks < 5s.
6. **Observabilidade:** OpenTelemetry export ativo, Sentry com tags por
   tenant, dashboards Grafana com SLOs.
7. **DDD:** Todos os BCs migrados, módulos legados removidos.
8. **CI/CD:** Deploy gateia em CI verde, cobertura ≥ 80%, scan secrets
   verde.

---

## 5. Riscos residuais e fora de escopo

### 5.1 Riscos identificados

- **Migração DDD:** regressão funcional em BCs críticos durante migração
  → mitigado por BDD features escritas antes da implementação + feature flags
  de rollout gradual (canary 5% → 25% → 100%).
- **Webhook assíncrono:** perda de evento durante deploy → mitigado por
  BullMQ persistente em Redis com retry 3x + DLQ.
- **PIX real (P0-07):** integração com Mercado Pago tem latência imprevisível
  → mitigado por timeout 5s, idempotency key, retry com backoff.
- **Service Worker (P0-08):** troca de Workbox para Serwist pode introduzir
  cache invalidation bug em users ativos → mitigado por versionamento de
  cache (`cacheName: 'v2'`) + cleanup manual via admin.

### 5.2 Fora de escopo desta iniciativa

- Migração de banco de dados ampla (Postgres → outro engine).
- Mudança de framework frontend (Next.js → outro).
- Multi-cloud / Kubernetes / Terraform.
- Internacionalização (i18n) completa.
- Migração de PIX para SPI direto (Banco Central).

---

## 6. Métricas de acompanhamento

Dashboards Grafana a criar:

| Dashboard        | Métricas                                        |
| ---------------- | ----------------------------------------------- |
| Auditoria - P0   | PRs merged por dia, cobertura por BC, falhas CI |
| Auditoria - DDD  | % módulos migrados, god classes restantes       |
| Auditoria - LGPD | Logs redacted total, purges executados          |
| Auditoria - A11y | axe-core violations, Lighthouse score           |

Review semanal às segundas, 9h, com @leo.

---

## 7. Próximo passo

Este plano será revisado pelo usuário antes da transição para a skill
`writing-plans` (criação do plano de implementação detalhado por task).

Após aprovação:

1. Criar issues GitHub por task P0 (Tranche A) usando `task-manager`.
2. Iniciar Tranche A na branch atual `chore/auditoria-completa-2026-07-29`.
3. Commits pequenos por correção, em pt-BR, com DDD→BDD→SDD→ATDD→TDD.
4. PRs com CODEOWNERS + CI verde + cobertura.

---

## 8. Apêndice — referências

- `docs/guides/ARCHITECTURE.md`
- `docs/guides/DDD_MIGRACAO_API.md`
- `docs/guides/OFFLINE.md`
- `docs/guides/PAYMENTS.md`
- `docs/guides/MULTI_TENANT.md`
- `docs/guides/SECURITY.md` (criar na Tranche A)
- `.openspec/specs/admin/design.md` (template)
- `AGENTS.md`
- `CLAUDE.md`

---

**Mantido por:** @leo
**Versão:** 1.0.0
**Status:** Aguardando revisão do usuário
