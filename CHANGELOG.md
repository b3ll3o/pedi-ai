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

- **P0-01 — BOLA no endpoint de pedidos (Product.restaurantId)** (tipo:
  `fix(security)`). Três instâncias de Broken Object Level Authorization
  (OWASP API #1) fechadas:
  1. `GET /products/:id` agora exige JWT (`@Roles(atendente, gerente, dono)`)
     e filtra por `req.user.restaurantId` — antes era público e qualquer
     cliente com um ID de produto de outro tenant lia nome/preço/descrição.
     Cardápio público continua em `/menu/products/:id?restaurantId=...`.
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
     `ALTER COLUMN ... SET NOT NULL` + `CREATE INDEX IF NOT EXISTS` +
     FK via `pg_constraint` check. Shared kernel
     `apps/api/src/shared/multi-tenant/scoped-repository.ts` com
     `RestaurantScopedRepository` (fail-closed no construtor) para uso
     em próximas hot paths. Cobertura: BDD 8 cenários + integration 7
     testes com Prisma real + unit 19 testes específicos do
     `ProductsService` + 23 testes do `OrdersService`. Regressões:
     0 (638 testes verdes).

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
