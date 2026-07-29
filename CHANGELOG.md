# Changelog

Todas as mudanças notáveis neste projeto são documentadas aqui.

O formato segue, de forma simplificada, o padrão
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e este projeto
adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

Tipos de mudança:

- `Adicionado` — novas funcionalidades.
- `Alterado` — mudanças em funcionalidades existentes.
- `Corrigido` — correções de bugs.
- `Removido` — funcionalidades removidas.
- `Segurança` — correções de vulnerabilidades.

## [Não publicado]

### Segurança

- **P0-10 — Política de senha NIST 800-63B** (tipo: `feat(security)`).
  Removida regex de composição (1 maiúscula + 1 número + 1 especial) que
  violava NIST 800-63B §5.1.1.2 e causava password fatigue (levava usuários a
  escolherem `Password1!`). Política: mínimo 8 caracteres, máximo 128,
  sem composição, breach check HIBP mantido. Senhas como
  `longpasswordwithoutcomplex` agora são aceitas (antes rejeitadas);
  senhas vazias e só com espaços agora são rejeitadas explicitamente.
  BDD `password-policy.feature` (16 cenários em pt-BR cobrindo sem-composição,
  limites min/max, vazia/espaços, HIBP cache miss/hit/fail-open, aplicação em
  `resetPassword`) + 7 unit tests novos/atualizados no `auth.service.spec.ts`.
  Cobertura `auth.service.ts` em 88.5% lines / 100% funções.

- **P0-09 — Purga de dados locais no logout** (tipo: `fix(security)`). O logout agora purga, antes da invalidação da sessão, os dados locais potencialmente pessoais para impedir que uma conta subsequente no mesmo dispositivo veja pedidos, carrinhos ou perfis da conta anterior. A purga é best-effort e não bloqueia o logout em caso de falha do IndexedDB. Incluídos testes unitários da ordem purga→logout e E2E cross-account LGPD.
  - **Correções pós-review (2026-07-29)**: bug crítico detectado pelo spec reviewer — `pii-purge.ts` importava `db` do schema v2 (4 stores) mas tentava limpar 5 stores que só existem no schema v6 (`infrastructure/persistence/database`). Resultado: a purga falhava silenciosamente em runtime. Refatorado para iterar defensivamente `PII_STORE_NAMES` em ambos os DBs (`getTable(db, name)` pula stores ausentes com warning); 10 stores PII agora são corretamente limpas (cart, pending_sync, usuarios, sessoes, pedidos, carrinhos, pagamentos, transacoes, user_restaurants, configuracoes_restaurante). `menu_cache` e `tables_info` (não-PII) preservadas. Bug secundário corrigido: `AdminLayout` chamava `fetch('/api/auth/logout')` direto, bypassando a purga — agora `apiClient.logout()` e `lib/auth/client.logout()` orquestram `purgeLocalDataSafely()` centralizadamente (todos os caminhos de logout purgam). Novo teste E2E clica o botão de logout em vez de navegar direto para `/login` (antes o teste aprovava sem disparar a purga). Adicionado integration test com `fake-indexeddb` cobrindo 4 cenários (purga completa, preservação não-PII, idempotência, defensivo).

- **P0-06 — PII encryption: helper `withEncryptedTransaction` + correção de 3 defeitos reais** (tipo: `fix(security)`). O bug
  empírica em Prisma 7.8 mostrou que `Object.assign(this, ext)` JÁ propaga
  para `tx`. O que estava quebrado de verdade:
  1. `ENCRYPTED_FIELDS` indexado por camelCase vs Extension entregando
     PascalCase → extension no-op silencioso. LGPD Art. 46 violado.
     Corrigido via `normalizeModelKey()` em `pii-crypto.service.ts`.
  2. Janela de boot: extension instalada em `onModuleInit` (async,
     condicional). Movida para o construtor — falha-loud em prod/staging.
  3. `getExtendedClient()` dentro de `$transaction` abria conexão própria,
     escapando do rollback. Substituído por `withEncryptedTransaction()`
     helper. 13 call sites de `$transaction` auditados, 3 convertidos
     (`restaurants.service`, `orders.service`, `payments.service`
     handleWebhook) + 10 anotados como `SEM PII` com rationale. Suite:
     595 unit + 7 integration (SELECT ciphertext verificado) + 14 BDD.
     **P0-06-fase-2 filed:** extension NÃO decifra em `create` return —
     3 call sites (`auth.service.ts:307,360,455`) usam `user.name` direto
     após `create()` e JWT pode conter ciphertext como nome.

- **P0-01 — BOLA no endpoint de pedidos (Product.restaurantId)** (tipo:
  `fix(security)`). Três instâncias de Broken Object Level Authorization
  (OWASP API #1) fechadas:
  1. `GET /products/:id` agora exige JWT (`@Roles(atendente, gerente, dono)`)
     e filtra por `req.user.restaurantId` — antes era público e qualquer
     cliente com um ID de produto de outro tenant lia nome/preço/descrição.
     **BREAKING CHANGE:** consumidores que usavam esta rota sem
     autenticação devem migrar para `GET /menu/products/:id?restaurantId=...`
     (cardápio público) ou autenticar via `/auth/login` (painel
     admin/staff). Ver JSDoc em
     `apps/api/src/products/products.controller.ts:61-76` para
     detalhes da migração.
  2. `POST /orders` valida `productId`s contra `restaurantId` do pedido
     — antes aceitava IDs de produtos de qualquer tenant desde que
     `available: true`. Cross-tenant product injection agora retorna
     400 "Produtos indisponíveis ou inexistentes".
  3. `GET /products/category/:categoryId` exige `restaurantId` via query
     (fail-closed — `BadRequestException` antes de tocar no DB).
     Schema: `Product.restaurantId` autoritativo (além de
     `Category.restaurantId`), `@@index([restaurantId])` + FK
     `products_restaurant_id_fkey` (ON DELETE RESTRICT).
     Migration `20260729120000_add_product_restaurant_id` é idempotente:
     `ADD COLUMN IF NOT EXISTS` + backfill `UPDATE FROM categories` +
     pre-flight guard `DO $$ ... RAISE EXCEPTION ... $$` (MINOR #3 —
     detecta produtos órfãos antes do `SET NOT NULL` falhar
     silenciosamente) + `ALTER COLUMN ... SET NOT NULL` +
     `CREATE INDEX IF NOT EXISTS` + FK via `pg_constraint` check.
     Shared kernel `apps/api/src/shared/multi-tenant/scoped-repository.ts`
     com `RestaurantScopedRepository` (fail-closed no construtor) —
     usado em produção pelo `ProductsService` (refactor MAJOR:
     `findByCategory`, `findById`, `update`, `delete`, `create`/
     `createWithRestaurant` agora delegam ao helper em vez de aplicar
     `WHERE restaurantId` manual). `MenuService.getProductById`
     também ganhou filtro `restaurantId` direto (MINOR #2 — defesa em
     profundidade). Cobertura: BDD **9 cenários** + integration 7
     testes com Prisma real + unit 19 testes específicos do
     `ProductsService` + 23 testes do `OrdersService` + 5 testes do
     `MenuService` + e2e 4 cenários cross-tenant em
     `apps/web/tests/e2e/tests/auth/multi-tenant.spec.ts`. Regressões:
     0 (2693 testes verdes).

- **P0-11 — Deploy gateia em CI verde** (tipo: `fix(ci)`). Substitui o gatilho
  `push: branches: [master]` do workflow `.github/workflows/deploy-vps.yml`
  por `workflow_run` que observa o workflow `CI` com `types: [completed]` em
  `branches: [master]`. O job `deploy` agora só roda se
  `github.event.workflow_run.conclusion == 'success'` ou se o gatilho foi
  `workflow_dispatch` (manual). Antes, builds com testes/lint/scan vermelhos
  eram deployados para produção. `workflow_dispatch` é mantido com os inputs
  `skip_e2e`, `shard` e `test_mode` para permitir rollback manual quando o
  usuário valida o CI localmente.
- **P0-03 — `FeatureFlagAdminGuard` aplicado via `@UseGuards`** (tipo:
  `fix(security)`). Antes, `void _adminGuard` no construtor ignorava o
  guard silenciosamente — qualquer usuário autenticado conseguia `PATCH`
  em `/admin/feature-flags/*`. Defesa em profundidade com
  `@UseGuards(JwtAuthGuard, FeatureFlagAdminGuard)` + `Reflector` lendo
  `IS_PUBLIC_KEY` (mesma chave do JwtAuthGuard) para rotas públicas
  (`/evaluate`). Bonus: corrigido bug pré-existente onde handlers usavam
  argumentos posicionais sem `@Body()`/`@Param()`, fazendo NestJS
  injetar `undefined` (500 em todas as mutações). Cobertura: unit +
  integration (`app.inject`) + E2E cross-tenant. Findings #2/4/5/6 do
  code review aplicados em `f4d1279`. Findings #1/3/7/8 (dual-constructor,
  role enum, fs source-read, URL prefix) ficam como **P0-03-fase-3**.
