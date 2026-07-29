# Tranche A — Correção P0 (Estabilização)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir os 12 achados P0 identificados na auditoria completa de 2026-07-29, eliminando vulnerabilidades exploráveis e restaurando invariantes de segurança/multi-tenant/LGPD.

**Architecture:** Cada task é autocontida e entrega um patch focado com cobertura ≥85%. A ordem segue dependências técnicas (DB → guards → transação → LGPD → CI). Nenhuma task altera contrato externo observável sem migração.

**Tech Stack:** NestJS 11, Prisma 7, PostgreSQL 16, Next.js 16, React 19, Dexie 4, Workbox 7, Husky 9, GitHub Actions.

**Spec:** [PLANO_AUDITORIA_2026-07-29.md §2.1](../../PLANO_AUDITORIA_2026-07-29.md#21--p0--correção-imediata)

---

## File Structure (alterações da Tranche A)

### Criar

```
apps/api/src/shared/multi-tenant/
  ├── scoped-repository.ts        # helper para queries tenant-scoped
  └── __tests__/scoped-repository.spec.ts

apps/api/prisma/migrations/
  ├── 20260729_add_product_restaurant_id/migration.sql
  └── 20260729_add_webhook_event_unique/migration.sql

apps/api/test/features/shared/
  ├── multi-tenant-isolation.feature
  └── rate-limiting.feature

apps/api/test/integration/
  └── pii-encryption-transaction.int-spec.ts

apps/web/src/infrastructure/persistence/
  └── serwist.ts                  # config InjectManifest

apps/web/e2e/
  ├── lgpd-logout.spec.ts
  └── route-handler-bff.spec.ts   # smoke para BFF (verifica P0-08 via Serwist)
```

### Modificar

```
apps/api/src/app.module.ts                      # P0-02 (ThrottlerGuard), P0-03 (AdminGuard global)
apps/api/src/orders/orders.service.ts           # P0-01 (where restaurantId)
apps/api/src/products/products.service.ts       # P0-01 (where restaurantId)
apps/api/prisma/schema.prisma                   # P0-01 (Product.restaurantId), P0-04 (WebhookEvent @@unique)
apps/api/src/payments/payments.controller.ts    # P0-04 (idempotência com unique)
apps/api/src/common/prisma.service.ts           # P0-06 (PII em $transaction)
apps/api/src/payments/payments.service.ts       # P0-07 (PIX real Mercado Pago)
apps/api/src/auth/auth.service.ts               # P0-10 (regex senha)
apps/web/public/sw.js                           # REMOVER (P0-08)
apps/web/src/hooks/useAuth.ts                   # P0-09 (purge no logout)
apps/web/src/lib/offline/pii-purge.ts           # P0-09 (fix SchemaError)
.github/workflows/deploy-vps.yml               # P0-11 (gate em CI)
.husky/pre-commit                               # P0-12 (Husky 9 + gitleaks)
next.config.js                                  # P0-08 (withSerwistInit)
```

---

## Task 1: P0-04 — Adicionar `@@unique` em WebhookEvent

**Files:**

- Modify: `apps/api/prisma/schema.prisma:442-446`
- Create: `apps/api/prisma/migrations/20260729120000_add_webhook_event_unique/migration.sql`
- Test: `apps/api/test/integration/webhook-idempotency.int-spec.ts`

- [ ] **Step 1: Escrever o teste de integração que prova o bug atual**

```ts
// apps/api/test/integration/webhook-idempotency.int-spec.ts
import { Test } from '@nestjs/testing';
import { PrismaService } from '@/common/prisma.service';
import { AppModule } from '@/app.module';
import { randomUUID } from 'crypto';

describe('WebhookEvent idempotência (P0-04)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('bloqueia colisão cross-provider com mesmo externalId', async () => {
    const externalId = `ext-${randomUUID()}`;
    await prisma.webhookEvent.create({
      data: {
        provider: 'mercadopago',
        externalId,
        payload: { test: 1 },
      },
    });

    await expect(
      prisma.webhookEvent.create({
        data: {
          provider: 'asaas',
          externalId,
          payload: { test: 2 },
        },
      })
    ).rejects.toThrow(/Unique constraint/i);
  });
});
```

- [ ] **Step 2: Rodar o teste — esperado FALHAR (prova do bug)**

```bash
cd apps/api && pnpm test webhook-idempotency
```

Expected: FAIL com "Unique constraint" não sendo lançado — duas inserções com mesmo `externalId` em providers diferentes passam.

- [ ] **Step 3: Atualizar o schema Prisma**

```prisma
// apps/api/prisma/schema.prisma (model WebhookEvent, linhas ~442-446)
model WebhookEvent {
  id          String    @id @default(cuid())
  provider    String
  externalId  String
  payload     Json
  receivedAt  DateTime  @default(now())
  processedAt DateTime?

  @@unique([provider, externalId])
  @@index([provider, receivedAt])
}
```

- [ ] **Step 4: Criar migration SQL idempotente**

```sql
-- apps/api/prisma/migrations/20260729120000_add_webhook_event_unique/migration.sql
CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_provider_externalId_key"
  ON "WebhookEvent"("provider", "externalId");

CREATE INDEX IF NOT EXISTS "WebhookEvent_provider_receivedAt_idx"
  ON "WebhookEvent"("provider", "receivedAt");
```

- [ ] **Step 5: Aplicar migration ao banco de dev**

```bash
cd apps/api && pnpm prisma migrate dev --name add-webhook-event-unique
```

Expected: "Migration successful" + schema regenerated.

- [ ] **Step 6: Rodar o teste novamente — esperado PASSAR**

```bash
cd apps/api && pnpm test webhook-idempotency
```

Expected: PASS — segunda inserção lança `Unique constraint violation`.

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations apps/api/test/integration/webhook-idempotency.int-spec.ts
git commit -m "fix(api): adicionar @@unique em WebhookEvent (P0-04)

Impede colisão cross-provider (MP↔Asaas) que causava débito
PIX duplicado em produção.

- Migration idempotente
- Teste de integração cobre cenário cross-provider
- BDD feature webhook-idempotencia (próximo commit)"
```

---

## Task 2: P0-11 — Deploy gateia em CI verde

**Files:**

- Modify: `.github/workflows/deploy-vps.yml:3-7`
- Test: simulação local (workflow_run não roda sem GitHub Actions)

- [ ] **Step 1: Ler o workflow atual**

```bash
cat .github/workflows/deploy-vps.yml | head -30
```

- [ ] **Step 2: Substituir o gatilho**

```yaml
# .github/workflows/deploy-vps.yml (linhas 1-15)
name: Deploy VPS

on:
  workflow_run:
    workflows: ['CI']
    types: [completed]
    branches: [master]

concurrency:
  group: deploy-vps-${{ github.ref }}
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    if: github.event.workflow_run.conclusion == 'success'
    environment: production
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Verificar gate de CI
        run: |
          if [ "${{ github.event.workflow_run.conclusion }}" != "success" ]; then
            echo "CI falhou — deploy abortado"
            exit 1
          fi
      - name: Deploy via SSH
        run: |
          echo "${{ secrets.VPS_SSH_KEY }}" > /tmp/deploy_key
          chmod 600 /tmp/deploy_key
          ssh -i /tmp/deploy_key "${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }}" \
            "cd /opt/pedi-ai && git pull && pnpm install --frozen-lockfile && pnpm build && docker compose up -d"
        env:
          NODE_ENV: production
```

- [ ] **Step 3: Validar YAML**

```bash
npx js-yaml .github/workflows/deploy-vps.yml > /dev/null && echo "YAML válido"
```

Expected: "YAML válido".

- [ ] **Step 4: Documentar em CHANGELOG**

```markdown
<!-- CHANGELOG.md -->

## [Unreleased]

### Segurança

- **P0-11:** Deploy VPS agora gateia em CI verde (`workflow_run`). CI falhada
  não dispara deploy. Antes: PR quebrado chegava a produção.
```

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy-vps.yml CHANGELOG.md
git commit -m "fix(ci): deploy-vps gateia em workflow_run concluído com sucesso (P0-11)

Antes: push em master disparava deploy mesmo com CI falhada.
Agora: workflow_run observa CI completa e só prossegue se 'success'.
Documentado em CHANGELOG.md."
```

---

## Task 3: P0-02 — Registrar `ThrottlerGuard` globalmente

**Files:**

- Modify: `apps/api/src/app.module.ts:45-79`
- Test: `apps/api/test/features/shared/rate-limiting.feature`

- [ ] **Step 1: Escrever BDD feature**

```gherkin
# apps/api/test/features/shared/rate-limiting.feature
# language: pt-BR

Funcionalidade: Rate limiting em endpoints públicos
  Para proteger contra enumeração de credenciais e abuso
  Como sistema
  Quero limitar requisições por IP em endpoints sensíveis

  Cenário: Login excede limite
    Dado que um cliente fez 10 tentativas de login no último minuto
    Quando ele tenta logar pela 11ª vez
    Então o sistema retorna HTTP 429
    E loga o evento "rate_limit_exceeded"
```

- [ ] **Step 2: Glue code (step definitions)**

```ts
// apps/api/test/features/shared/rate-limiting.steps.ts
import { defineFeature, loadFeature } from 'jest-cucumber';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

const feature = loadFeature('./test/features/shared/rate-limiting.feature');

defineFeature(feature, (test) => {
  let app: INestApplication;
  let response: request.Response;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  test('Login excede limite', async ({ given, when, then }) => {
    given(/que um cliente fez (\d+) tentativas de login no último minuto/, async (n) => {
      for (let i = 0; i < parseInt(n); i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'test@example.com', password: 'wrong' });
      }
    });

    when('ele tenta logar pela 11ª vez', async () => {
      response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });
    });

    then(/o sistema retorna HTTP (\d+)/, (status) => {
      expect(response.status).toBe(parseInt(status));
    });
  });
});
```

- [ ] **Step 3: Rodar BDD — esperado FALHAR (prova do bug)**

```bash
cd apps/api && pnpm test:cucumber rate-limiting
```

Expected: FAIL com "11º request retornou 401, esperado 429" — guard não ativo.

- [ ] **Step 4: Registrar `ThrottlerGuard` globalmente**

```ts
// apps/api/src/app.module.ts
import { ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 3 },
      { name: 'long', ttl: 60000, limit: 10 },
    ]),
    // ...outros módulos
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // ...outros providers
  ],
})
export class AppModule {}
```

- [ ] **Step 5: Rodar BDD novamente — esperado PASSAR**

```bash
cd apps/api && pnpm test:cucumber rate-limiting
```

Expected: PASS — 11º request retorna 429.

- [ ] **Step 6: Adicionar teste unitário do guard**

```ts
// apps/api/src/app.module.spec.ts
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from './app.module';

describe('AppModule providers (P0-02)', () => {
  it('registra ThrottlerGuard como APP_GUARD', () => {
    const guards = Reflect.getMetadata('__guards__', AppModule) ?? [];
    const throttlerGuard = AppModule.providers?.find(
      (p) => p === Object.entries({}).find(([_, v]) => v === ThrottlerGuard)?.[0]
    );
    expect(guards.some((g) => g === ThrottlerGuard)).toBe(true);
  });
});
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/app.module.ts apps/api/src/app.module.spec.ts apps/api/test/features/shared/
git commit -m "fix(api): registrar ThrottlerGuard globalmente (P0-02)

Decorators @Throttle() eram ignorados — guard nunca ativo.
Agora APP_GUARD = ThrottlerGuard, rate limit funcional em todos
os endpoints públicos. BDD cobre o cenário."
```

---

## Task 4: P0-03 — Aplicar `AdminGuard` nos controllers admin

**Files:**

- Modify: `apps/api/src/presentation/admin/feature-flags/controllers/FeatureFlagsController.ts`
- Test: `apps/api/test/integration/admin-guard.int-spec.ts`

- [ ] **Step 1: Escrever teste de integração**

```ts
// apps/api/test/integration/admin-guard.int-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('AdminGuard em feature-flags (P0-03)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('cliente autenticado NÃO pode PATCH /admin/feature-flags/:id', async () => {
    const response = await request(app.getHttpServer())
      .patch('/admin/feature-flags/abc123')
      .set('Authorization', 'Bearer cliente-token')
      .send({ enabled: true });

    expect(response.status).toBe(403);
  });

  it('requisição sem auth é rejeitada', async () => {
    const response = await request(app.getHttpServer())
      .patch('/admin/feature-flags/abc123')
      .send({ enabled: true });

    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 2: Rodar — esperado FALHAR (revela bug)**

```bash
cd apps/api && pnpm test admin-guard
```

Expected: FAIL — sem guard, `cliente-token` consegue fazer PATCH (status 200/204).

- [ ] **Step 3: Refatorar `FeatureFlagsController`**

```ts
// apps/api/src/presentation/admin/feature-flags/controllers/FeatureFlagsController.ts
import { Controller, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AdminGuard } from '@/shared/guards/admin.guard';
import { JwtAuthGuard } from '@/autenticacao/infrastructure/jwt-auth.guard';

@Controller('admin/feature-flags')
@UseGuards(JwtAuthGuard, AdminGuard) // ← REMOVE void _adminGuard
export class FeatureFlagsController {
  constructor(
    private readonly service: FeatureFlagsService,
    private readonly adminGuard: AdminGuard // ← injetado, não mais void
  ) {}

  @Patch(':id')
  async atualizar(@Param('id') id: string, @Body() dto: AtualizarFeatureFlagDto) {
    return this.service.atualizar(id, dto);
  }
}
```

- [ ] **Step 4: Buscar outros controllers do BC admin com mesmo bug**

```bash
grep -rn "void _adminGuard\|void _adminGuard = " apps/api/src/
```

Aplicar o mesmo padrão `@UseGuards(JwtAuthGuard, AdminGuard)` em cada
controller encontrado (substituir `void` por uso real ou remover injeção).

- [ ] **Step 5: Rodar teste — esperado PASSAR**

```bash
cd apps/api && pnpm test admin-guard
```

Expected: PASS — cliente recebe 403.

- [ ] **Step 6: Adicionar E2E**

```ts
// apps/web/e2e/admin/feature-flags-guard.spec.ts
import { test, expect } from '@playwright/test';

test('cliente não pode editar feature flags', async ({ page, request }) => {
  await page.goto('/login');
  await page.fill('[name=email]', 'cliente@exemplo.com');
  await page.fill('[name=password]', 'senha-cliente');
  await page.click('[type=submit]');

  const token = await page.evaluate(() => localStorage.getItem('token'));

  const response = await request.patch('/api/admin/feature-flags/abc123', {
    headers: { Authorization: `Bearer ${token}` },
    data: { enabled: true },
  });

  expect(response.status()).toBe(403);
});
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/presentation/admin/ apps/api/test/integration/admin-guard.int-spec.ts apps/web/e2e/admin/
git commit -m "fix(api): aplicar AdminGuard+JwtAuthGuard nos controllers admin (P0-03)

Removido padrão 'void _adminGuard' que ignorava guard silenciosamente.
Agora @UseGuards() aplicado via decorator de classe.
Cobre: feature-flags, restaurantes (validar quais outros BCs admin)."
```

---

## Task 5: P0-01 — Adicionar `restaurantId` em Product (multi-tenant)

**Files:**

- Modify: `apps/api/prisma/schema.prisma:145-164`
- Create: `apps/api/prisma/migrations/20260729130000_add_product_restaurant_id/migration.sql`
- Modify: `apps/api/src/orders/orders.service.ts:236`
- Modify: `apps/api/src/products/products.service.ts:18,87`
- Create: `apps/api/src/shared/multi-tenant/scoped-repository.ts`
- Test: `apps/api/test/features/shared/multi-tenant-isolation.feature`

- [ ] **Step 1: Escrever BDD feature**

```gherkin
# apps/api/test/features/shared/multi-tenant-isolation.feature
# language: pt-BR

Funcionalidade: Isolamento multi-tenant em produtos
  Para evitar BOLA (Broken Object Level Authorization)
  Como sistema
  Quero garantir que produtos de um restaurante não vazem para outro

  Cenário: Cliente A consulta produto do restaurante B
    Dado que existe o restaurante "Rest A" com produto "Pizza Margherita"
    E existe o restaurante "Rest B" com produto "Pizza Calabresa"
    E um cliente autenticado no "Rest A"
    Quando ele tenta GET /products/{id-do-produto-do-rest-B}
    Então o sistema retorna HTTP 404
    E loga o evento "cross_tenant_access_attempt"
```

- [ ] **Step 2: Glue code + step definitions** (omitido por brevidade — segue padrão do rate-limiting)

- [ ] **Step 3: Rodar BDD — esperado FALHAR**

```bash
cd apps/api && pnpm test:cucumber multi-tenant-isolation
```

Expected: FAIL — `GET /products/{id-do-rest-B}` retorna 200 com dados do Rest B.

- [ ] **Step 4: Migration SQL com backfill**

```sql
-- apps/api/prisma/migrations/20260729130000_add_product_restaurant_id/migration.sql
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "restaurant_id" UUID;

UPDATE "products" p
SET "restaurant_id" = c."restaurant_id"
FROM "categories" c
WHERE p."category_id" = c."id"
  AND p."restaurant_id" IS NULL;

-- Se houver produtos órfãos, vincular ao primeiro restaurante (fail-safe)
UPDATE "products"
SET "restaurant_id" = (SELECT id FROM restaurants ORDER BY created_at LIMIT 1)
WHERE "restaurant_id" IS NULL;

ALTER TABLE "products"
  ALTER COLUMN "restaurant_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "products_restaurant_id_idx"
  ON "products"("restaurant_id");
```

- [ ] **Step 5: Atualizar schema Prisma**

```prisma
// apps/api/prisma/schema.prisma (model Product, ~145-164)
model Product {
  id            String   @id @default(cuid())
  name          String
  description   String?
  price         Int      // centavos
  available     Boolean  @default(true)
  categoryId    String
  restaurantId  String   // ← NOVO
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  category      Category  @relation(fields: [categoryId], references: [id])
  restaurant    Restaurant @relation(fields: [restaurantId], references: [id])
  orderItems    OrderItem[]
  comboItems    ComboItem[]

  @@index([restaurantId])
  @@index([categoryId])
}
```

- [ ] **Step 6: Aplicar migration**

```bash
cd apps/api && pnpm prisma migrate dev --name add-product-restaurant-id
```

Expected: "Migration successful" + Prisma Client regenerado.

- [ ] **Step 7: Criar helper de scope**

```ts
// apps/api/src/shared/multi-tenant/scoped-repository.ts
import { PrismaService } from '@/common/prisma.service';

export class ScopedRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly restauranteId: string
  ) {}

  async findProductById(productId: string) {
    return this.prisma.product.findFirst({
      where: { id: productId, restaurantId: this.restauranteId },
    });
  }

  async findManyProducts(args: { skip?: number; take?: number }) {
    return this.prisma.product.findMany({
      where: { restaurantId: this.restauranteId },
      ...args,
    });
  }
}

export function criarScopedRepo(prisma: PrismaService, restauranteId: string): ScopedRepository {
  return new ScopedRepository(prisma, restauranteId);
}
```

- [ ] **Step 8: Refatorar `orders.service.ts:236`**

```ts
// apps/api/src/orders/orders.service.ts (linha ~236)
const products = await this.scopedRepo.findManyProducts({
  where: {
    restaurantId: this.tenantContext.restauranteId, // ← obrigatório
  },
  include: { category: true },
});
```

- [ ] **Step 9: Refatorar `products.service.ts` (linhas 18, 87)**

```ts
// apps/api/src/products/products.service.ts
async findOne(id: string) {
  const product = await this.scopedRepo.findProductById(id);
  if (!product) throw new NotFoundException('Produto não encontrado');
  return product;
}

async findAll(filters: ProductFilters) {
  return this.scopedRepo.findManyProducts({
    where: {
      ...filters,
      restaurantId: this.tenantContext.restauranteId,
    },
  });
}
```

- [ ] **Step 10: Rodar BDD — esperado PASSAR**

```bash
cd apps/api && pnpm test:cucumber multi-tenant-isolation
```

Expected: PASS — cross-tenant retorna 404.

- [ ] **Step 11: Adicionar teste unitário**

```ts
// apps/api/src/shared/multi-tenant/__tests__/scoped-repository.spec.ts
import { ScopedRepository } from '../scoped-repository';

describe('ScopedRepository (P0-01)', () => {
  const mockPrisma = {
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  it('findProductById inclui restaurantId no where', async () => {
    const repo = new ScopedRepository(mockPrisma as any, 'rest-A');
    mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1' });

    await repo.findProductById('p1');

    expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'p1', restaurantId: 'rest-A' },
    });
  });

  it('findManyProducts SEM restaurantId é bloqueado', async () => {
    const repo = new ScopedRepository(mockPrisma as any, 'rest-A');
    mockPrisma.product.findMany.mockResolvedValue([]);

    await repo.findManyProducts({});

    expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
      where: { restaurantId: 'rest-A' },
    });
  });
});
```

- [ ] **Step 12: Commit**

```bash
git add apps/api/prisma/ apps/api/src/orders/ apps/api/src/products/ apps/api/src/shared/multi-tenant/ apps/api/test/features/shared/multi-tenant-isolation.feature
git commit -m "fix(api): adicionar restaurantId em Product (P0-01)

Corrige 3 instâncias de BOLA cross-tenant em orders/products.
- Migration com backfill de category.restaurant_id
- ScopedRepository helper para queries tenant-safe
- BDD multi-tenant-isolation cobre cenário
- Unit tests do helper"
```

---

## Task 6: P0-06 — PII encryption em `$transaction`

**Files:**

- Modify: `apps/api/src/common/prisma.service.ts:51-53`
- Create: `apps/api/src/common/with-encrypted-transaction.ts`
- Modify: buscar todos os `$transaction(async ...)` no repositório
- Test: `apps/api/test/integration/pii-encryption-transaction.int-spec.ts`

- [ ] **Step 1: Escrever teste que prova o bug**

```ts
// apps/api/test/integration/pii-encryption-transaction.int-spec.ts
import { Test } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/common/prisma.service';
import { withEncryptedTransaction } from '@/common/with-encrypted-transaction';

describe('PII encryption em $transaction (P0-06)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('cpf é criptografado dentro de transaction', async () => {
    const cpfOriginal = '123.456.789-09';

    await withEncryptedTransaction(prisma, async (tx) => {
      await tx.userProfile.create({
        data: {
          userId: `test-${Date.now()}`,
          cpf: cpfOriginal,
          name: 'Test User',
        },
      });
    });

    // Buscar diretamente do DB sem extensão
    const raw = await prisma.$queryRaw<Array<{ cpf: string }>>`
      SELECT cpf FROM users_profiles WHERE name = 'Test User' LIMIT 1
    `;

    expect(raw[0].cpf).not.toBe(cpfOriginal);
    expect(raw[0].cpf).toMatch(/^[a-f0-9]+:\d+:[a-f0-9]+$/); // formato encrypted
  });
});
```

- [ ] **Step 2: Rodar — esperado FALHAR (PII em claro)**

```bash
cd apps/api && pnpm test pii-encryption-transaction
```

Expected: FAIL — `raw[0].cpf === cpfOriginal` (texto plano).

- [ ] **Step 3: Implementar `withEncryptedTransaction`**

```ts
// apps/api/src/common/with-encrypted-transaction.ts
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { piiEncryptionExtension } from './prisma-pii.extension';

type Tx = Omit<
  PrismaService,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export async function withEncryptedTransaction<T>(
  prisma: PrismaService,
  callback: (tx: Tx) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const extendedTx = (tx as any).$extends(piiEncryptionExtension);
    return callback(extendedTx as Tx);
  });
}
```

- [ ] **Step 4: Refatorar `prisma.service.ts` para expor a extensão**

```ts
// apps/api/src/common/prisma.service.ts (linha ~51)
import { piiEncryptionExtension } from './prisma-pii.extension';

export const piiEncryptionExtension = Prisma.defineExtension({
  query: {
    userProfile: {
      create: ({ args, query }) => {
        if (args.data.cpf) {
          args.data.cpf = encrypt(args.data.cpf, 'cpf');
        }
        return query(args);
      },
    },
  },
});

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super();
    return this.$extends(piiEncryptionExtension) as this;
  }
}
```

- [ ] **Step 5: Buscar e refatorar todas as ocorrências de `$transaction`**

```bash
grep -rn "\$transaction(async" apps/api/src/ --include="*.ts"
```

Para cada ocorrência, substituir por `withEncryptedTransaction(prisma, async (tx) => ...)`.

- [ ] **Step 6: Rodar teste — esperado PASSAR**

```bash
cd apps/api && pnpm test pii-encryption-transaction
```

Expected: PASS — `raw[0].cpf` está criptografado.

- [ ] **Step 7: Adicionar ao CHANGELOG**

```markdown
<!-- CHANGELOG.md -->

### Segurança (LGPD)

- **P0-06:** Criptografia de PII agora funciona dentro de `$transaction`.
  Antes, callbacks recebiam `tx` sem a extensão — campos como `cpf` eram
  persistidos em claro.
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/common/ apps/api/test/integration/pii-encryption-transaction.int-spec.ts CHANGELOG.md
git commit -m "fix(api): PII encryption em \$transaction (P0-06)

P0-06 (LGPD grave): callbacks de \$transaction recebiam tx sem a
extensão de criptografia, persistindo cpf/email em claro.

- Helper withEncryptedTransaction re-aplica extensão no callback
- Migration não necessária (mudança só em código)
- Teste de integração cobre cenário
- Todas as ocorrências de \$transaction(async refatoradas"
```

---

## Task 7: P0-09 — `purgeAllUserData` chamado no logout

**Files:**

- Modify: `apps/web/src/hooks/useAuth.ts:118-134`
- Modify: `apps/web/src/lib/offline/pii-purge.ts:76`
- Test: `apps/web/e2e/lgpd-logout.spec.ts`

- [ ] **Step 1: Diagnosticar o bug em `pii-purge.ts`**

```bash
grep -n "tables_info\|timestamp" apps/web/src/lib/offline/pii-purge.ts | head -10
```

Esperado: `where('timestamp')` em linha ~76 sem índice → `SchemaError`.

- [ ] **Step 2: Atualizar schema Dexie (versão aditiva)**

```ts
// apps/web/src/lib/offline/pii-purge.ts (topo do arquivo)
import Dexie, { Table } from 'dexie';

export class PediDatabase extends Dexie {
  tables_info!: Table<{ id?: number; timestamp: number; ttl?: number }, number>;

  constructor() {
    super('pedi-ai');
    this.version(7).stores({
      tables_info: '++id, timestamp, [timestamp+ttl]',
    });
  }
}
```

- [ ] **Step 3: Escrever E2E que reproduz o bug**

```ts
// apps/web/e2e/lgpd-logout.spec.ts
import { test, expect } from '@playwright/test';

test('LGPD: logout purga PII do IndexedDB', async ({ page, context }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name=email]', 'user-a@exemplo.com');
  await page.fill('[name=password]', 'senha-valida');
  await page.click('[type=submit]');

  // Criar pedido offline
  await page.evaluate(async () => {
    const db = await (window as any).indexedDB.databases();
    return db;
  });

  // Logout
  await page.click('[data-testid=user-menu]');
  await page.click('[data-testid=logout]');

  // Login com user B
  await page.fill('[name=email]', 'user-b@exemplo.com');
  await page.fill('[name=password]', 'outra-senha');
  await page.click('[type=submit]');

  // Verificar que pedido de A não aparece para B
  const pedidosVisiveis = await page.evaluate(async () => {
    const db = await (window as any).indexedDB.open('pedi-ai');
    return new Promise((resolve) => {
      db.onsuccess = () => {
        const tx = db.result.transaction('pedidos', 'readonly');
        const store = tx.objectStore('pedidos');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
      };
    });
  });

  expect(pedidosVisiveis).toEqual([]);
});
```

- [ ] **Step 4: Rodar E2E — esperado FALHAR**

```bash
cd apps/web && pnpm test:e2e lgpd-logout
```

Expected: FAIL — pedidos de A persistem após logout.

- [ ] **Step 5: Refatorar `useAuth.ts`**

```ts
// apps/web/src/hooks/useAuth.ts (linhas 118-134)
import { purgeAllUserData } from '@/lib/offline/pii-purge';

const handleSignOut = async () => {
  await purgeAllUserData();
  await signOut({ redirect: false });
  router.push('/login');
};
```

- [ ] **Step 6: Garantir que `purgeAllUserData` funciona**

```ts
// apps/web/src/lib/offline/pii-purge.ts (export atualizado)
export async function purgeAllUserData(): Promise<void> {
  const db = new PediDatabase();
  await db.open();
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      if (table !== db.tables_info) {
        await table.clear();
      }
    }
    // Limpar tables_info com timestamp expirado
    const now = Date.now();
    await db.tables_info
      .where('timestamp')
      .below(now - 7 * 24 * 60 * 60 * 1000) // 7 dias
      .delete();
  });
  await db.close();
}
```

- [ ] **Step 7: Rodar E2E — esperado PASSAR**

```bash
cd apps/web && pnpm test:e2e lgpd-logout
```

Expected: PASS — `pedidosVisiveis === []`.

- [ ] **Step 8: Adicionar teste unitário**

```ts
// apps/web/src/lib/offline/__tests__/pii-purge.spec.ts
import 'fake-indexeddb/auto';
import { purgeAllUserData } from '../pii-purge';
import { PediDatabase } from '@/infrastructure/persistence/database';

describe('purgeAllUserData (P0-09)', () => {
  it('limpa todas as tabelas exceto metadata', async () => {
    const db = new PediDatabase();
    await db.pedidos.add({ id: 'p1', total: 1000 });
    await db.pedidos.add({ id: 'p2', total: 2000 });

    await purgeAllUserData();

    const remaining = await db.pedidos.count();
    expect(remaining).toBe(0);
  });
});
```

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/hooks/useAuth.ts apps/web/src/lib/offline/pii-purge.ts apps/web/e2e/lgpd-logout.spec.ts apps/web/src/lib/offline/__tests__/pii-purge.spec.ts
git commit -m "fix(web): purga PII no logout via purgeAllUserData (P0-09)

Antes: logout não chamava purgeAllUserData — PII (pedidos, cpf,
preferências) permanecia no IndexedDB após trocar de usuário.
Violação LGPD art. 18 (direito ao esquecimento).

- useAuth.handleSignOut agora chama purgeAllUserData antes do signOut
- pii-purge corrige SchemaError (índice 'timestamp' faltando em v6)
- E2E cobre cenário completo login-A → logout → login-B"
```

---

## Task 8: P0-10 — Senha regex NIST 800-63B

**Files:**

- Modify: `apps/api/src/auth/auth.service.ts:24`
- Create: `apps/api/src/auth/password-policy.ts`
- Test: `apps/api/test/features/auth/password-policy.feature`

- [ ] **Step 1: Escrever BDD feature**

```gherkin
# apps/api/test/features/auth/password-policy.feature
# language: pt-BR

Funcionalidade: Política de senha conforme NIST 800-63B
  Para evitar password fatigue e reduzir risco de força bruta
  Como sistema
  Quero validar senhas com regras mínimas (sem composição forçada)

  Cenário: Senha curta é rejeitada
    Quando tento registrar com senha "abc"
    Então recebo erro "Senha deve ter no mínimo 8 caracteres"

  Cenário: Senha longa demais é rejeitada
    Quando tento registrar com senha de 200 caracteres
    Então recebo erro "Senha deve ter no máximo 128 caracteres"

  Cenário: Senha válida é aceita
    Quando tento registrar com senha "minhasenhasegura2026"
    Então o registro é bem-sucedido
```

- [ ] **Step 2: Glue code (omitido por brevidade)**

- [ ] **Step 3: Rodar BDD — esperado FALHAR (regex atual rejeita "minhasenhasegura2026")**

```bash
cd apps/api && pnpm test:cucumber password-policy
```

Expected: FAIL — regex força `[a-z]+[A-Z]+[0-9]+` mas `minhasenhasegura2026` tem só lowercase+digits.

- [ ] **Step 4: Implementar `PasswordPolicy`**

```ts
// apps/api/src/auth/password-policy.ts
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;
const COMMON_PASSWORDS = [
  'password',
  '12345678',
  'qwerty',
  'senha123',
  'admin',
  // ... lista top-10k do HIBP (carregar de arquivo .txt)
];

export type PasswordValidation = { valid: true } | { valid: false; reason: string };

export function validarSenha(senha: string): PasswordValidation {
  if (senha.length < MIN_LENGTH) {
    return { valid: false, reason: `Senha deve ter no mínimo ${MIN_LENGTH} caracteres` };
  }
  if (senha.length > MAX_LENGTH) {
    return { valid: false, reason: `Senha deve ter no máximo ${MAX_LENGTH} caracteres` };
  }
  const normalized = senha.toLowerCase();
  if (COMMON_PASSWORDS.some((p) => normalized.includes(p))) {
    return { valid: false, reason: 'Senha muito comum — escolha outra' };
  }
  return { valid: true };
}
```

- [ ] **Step 5: Refatorar `auth.service.ts:24`**

```ts
// apps/api/src/auth/auth.service.ts
import { validarSenha } from './password-policy';

// REMOVER a linha 24 (const PASSWORD_REGEX = /.../)
// USAR:
async register(email: string, senha: string, nome: string) {
  const policy = validarSenha(senha);
  if (!policy.valid) {
    throw new BadRequestException(policy.reason);
  }
  const hash = await bcrypt.hash(senha, 12);
  return this.userRepo.create({ email, senhaHash: hash, nome });
}
```

- [ ] **Step 6: Rodar BDD — esperado PASSAR**

```bash
cd apps/api && pnpm test:cucumber password-policy
```

Expected: PASS — todas as 3 scenarios verdes.

- [ ] **Step 7: Adicionar testes unitários**

```ts
// apps/api/src/auth/__tests__/password-policy.spec.ts
import { validarSenha } from '../password-policy';

describe('validarSenha (P0-10)', () => {
  it.each([
    ['abc', false, 'mínimo'],
    ['a'.repeat(200), false, 'máximo'],
    ['password123', false, 'comum'],
    ['minhasenhasegura2026', true, ''],
  ])('senha "%s" → valid=%s (%s)', (senha, expected, _motivo) => {
    const result = validarSenha(senha);
    expect(result.valid).toBe(expected);
  });
});
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/auth/ apps/api/test/features/auth/password-policy.feature
git commit -m "fix(api): política de senha NIST 800-63B (P0-10)

Remove regex restritiva (causava password fatigue) e adota:
- Mínimo 8, máximo 128 caracteres
- Bloqueio de senhas comuns (top-10k HIBP)
- Sem exigência de composição (caixa, número, especial)

BDD cobre os cenários principais."
```

---

## Task 9: P0-12 — Husky 9 + gitleaks no pre-commit

**Files:**

- Modify: `.husky/pre-commit.sh` (ou recriar como `.husky/pre-commit`)
- Modify: `package.json` (script `prepare`)
- Create: `.husky/commit-msg`

- [ ] **Step 1: Verificar versão atual do Husky**

```bash
cat package.json | grep husky
```

- [ ] **Step 2: Migrar para Husky 9 (se necessário)**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
pnpm remove husky
pnpm add -D husky@9
pnpm exec husky init
```

Expected: cria `.husky/pre-commit` e atualiza `package.json` script `prepare`.

- [ ] **Step 3: Instalar gitleaks**

```bash
pnpm add -D gitleaks
```

- [ ] **Step 4: Escrever `.husky/pre-commit`**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm exec lint-staged
pnpm exec gitleaks protect --staged --redact --no-banner
```

```bash
chmod +x .husky/pre-commit
```

- [ ] **Step 5: Escrever `.husky/commit-msg` (conventional commits)**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm exec commitlint --edit "$1"
```

```bash
chmod +x .husky/commit-msg
pnpm add -D @commitlint/cli @commitlint/config-conventional
```

- [ ] **Step 6: Configurar commitlint**

```js
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 100],
  },
};
```

- [ ] **Step 7: Testar localmente**

```bash
# Criar arquivo com secret falso
echo "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE" > /tmp/test-secret.txt
git add /tmp/test-secret.txt

# Tentar commitar
git commit -m "test: arquivo com secret"
```

Expected: gitleaks bloqueia, mensagem "leaks found" ou similar.

```bash
git reset HEAD /tmp/test-secret.txt
rm /tmp/test-secret.txt
```

- [ ] **Step 8: Commit**

```bash
git add .husky/ package.json commitlint.config.js
git commit -m "chore(hooks): Husky 9 + gitleaks + commitlint (P0-12)

Antes: pre-commit.sh tinha lógica de gitleaks mas nunca era invocado.
Agora: hooks ativos em pre-commit (gitleaks) e commit-msg (commitlint).
Documenta fluxo: conventional commits enforced."
```

---

## Task 10: P0-08 — Service Worker via Serwist

**Files:**

- Delete: `apps/web/public/sw.js`
- Create: `apps/web/src/app/sw.ts`
- Modify: `apps/web/next.config.js`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Adicionar Serwist como dependência**

```bash
cd apps/web
pnpm add @serwist/next serwist
pnpm add -D @serwist/next typescript
```

- [ ] **Step 2: Criar `apps/web/src/app/sw.ts`**

```ts
// apps/web/src/app/sw.ts
import { defaultCache } from '@serwist/next/worker';
import { Serwist } from 'serwist';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
```

- [ ] **Step 3: Atualizar `next.config.js`**

```js
// apps/web/next.config.js
const withSerwistInit = require('@serwist/next').withSerwist;

const nextConfig = {
  // ...config existente
};

module.exports = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  reloadOnOnline: true,
  // ...demais opções do nextConfig
})(nextConfig);
```

- [ ] **Step 4: Remover `apps/web/public/sw.js` antigo**

```bash
git rm apps/web/public/sw.js
```

- [ ] **Step 5: Adicionar E2E**

```ts
// apps/web/e2e/pwa-offline.spec.ts
import { test, expect } from '@playwright/test';

test('Service Worker registra e cacheia assets', async ({ page, context }) => {
  await page.goto('/');

  // Esperar SW registrar
  const swRegistered = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    return !!reg;
  });
  expect(swRegistered).toBe(true);

  // Simular offline
  await context.setOffline(true);
  await page.reload();

  // App shell deve renderizar do cache
  await expect(page.locator('main')).toBeVisible();
});
```

- [ ] **Step 6: Build local para validar**

```bash
cd apps/web && pnpm build
```

Expected: "Generated public/sw.js" no output, build OK.

- [ ] **Step 7: Rodar E2E**

```bash
cd apps/web && pnpm test:e2e pwa-offline
```

Expected: PASS — SW registra e offline-first funciona.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/sw.ts apps/web/next.config.js apps/web/package.json apps/web/e2e/pwa-offline.spec.ts
git rm apps/web/public/sw.js
git commit -m "fix(web): Service Worker via Serwist InjectManifest (P0-08)

Antes: apps/web/public/sw.js usava imports bare do Workbox que não
resolviam no deploy — SW nunca registrava, app sem offline-first.

Agora: Serwist compila SW via InjectManifest no next build.
Runtime caching configurado (defaultCache).
E2E valida registro + offline shell."
```

---

## Task 11: P0-07 — PIX real via Mercado Pago

**Files:**

- Modify: `apps/api/src/payments/payments.service.ts:31,107-132`
- Create: `apps/api/src/payments/infrastructure/mercadopago.gateway.ts`
- Test: `apps/api/test/integration/pix-payment.int-spec.ts`

- [ ] **Step 1: Escrever teste de integração (com MP mockado)**

```ts
// apps/api/test/integration/pix-payment.int-spec.ts
import { Test } from '@nestjs/testing';
import { MercadoPagoGateway } from '@/payments/infrastructure/mercadopago.gateway';
import { PaymentsService } from '@/payments/payments.service';

describe('createPixPayment (P0-07)', () => {
  let service: PaymentsService;
  let gateway: MercadoPagoGateway;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: MercadoPagoGateway,
          useValue: {
            createPixPayment: jest.fn().mockResolvedValue({
              id: 'mp-12345',
              qrCodeBase64: 'iVBORw0KGgo...',
              qrCode: '00020126580014BR.GOV.BCB.PIX...',
              expirationDate: new Date(Date.now() + 30 * 60 * 1000),
            }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(PaymentsService);
    gateway = moduleRef.get(MercadoPagoGateway);
  });

  it('cria pagamento PIX real (não stub)', async () => {
    const result = await service.criarPagamentoPix({
      pedidoId: 'ped-1',
      valorCentavos: 1500,
      descricao: 'Pedido #1',
    });

    expect(gateway.createPixPayment).toHaveBeenCalledWith({
      amount: 15.0,
      description: 'Pedido #1',
      externalReference: 'ped-1',
      paymentMethodId: 'pix',
    });
    expect(result.qrCodeBase64).toMatch(/^iVBOR/);
  });
});
```

- [ ] **Step 2: Rodar — esperado FALHAR (stub não chama MP)**

```bash
cd apps/api && pnpm test pix-payment
```

Expected: FAIL — `createPixPayment` é stub, retorna payload fake.

- [ ] **Step 3: Instalar SDK Mercado Pago**

```bash
cd apps/api
pnpm add mercadopago
```

- [ ] **Step 4: Implementar gateway**

```ts
// apps/api/src/payments/infrastructure/mercadopago.gateway.ts
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { Injectable, Logger } from '@nestjs/common';

export interface PixPaymentInput {
  amount: number; // reais
  description: string;
  externalReference: string;
  payerEmail: string;
}

export interface PixPaymentOutput {
  id: string;
  qrCodeBase64: string;
  qrCode: string;
  expirationDate: Date;
}

@Injectable()
export class MercadoPagoGateway {
  private readonly logger = new Logger(MercadoPagoGateway.name);
  private readonly payment: Payment;

  constructor() {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN!,
      options: { timeout: 5000 },
    });
    this.payment = new Payment(client);
  }

  async createPixPayment(input: PixPaymentInput): Promise<PixPaymentOutput> {
    const idempotencyKey = `pix-${input.externalReference}-${Date.now()}`;

    const response = await this.payment.create({
      body: {
        transaction_amount: input.amount,
        description: input.description,
        payment_method_id: 'pix',
        payer: { email: input.payerEmail },
        external_reference: input.externalReference,
      },
      requestOptions: { idempotencyKey },
    });

    const tx = response.point_of_interaction?.transaction_details;
    return {
      id: String(response.id),
      qrCodeBase64: tx?.qr_code_base64 ?? '',
      qrCode: tx?.qr_code ?? '',
      expirationDate: new Date(response.date_of_expiration ?? Date.now() + 1800000),
    };
  }
}
```

- [ ] **Step 5: Refatorar `payments.service.ts`**

```ts
// apps/api/src/payments/payments.service.ts
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mp: MercadoPagoGateway, // ← gateway real
    private readonly logger: Logger
  ) {}

  async criarPagamentoPix(input: {
    pedidoId: string;
    valorCentavos: number;
    descricao: string;
    payerEmail: string;
  }) {
    const mpPayment = await this.mp.createPixPayment({
      amount: input.valorCentavos / 100,
      description: input.descricao,
      externalReference: input.pedidoId,
      payerEmail: input.payerEmail,
    });

    const payment = await this.prisma.payment.create({
      data: {
        pedidoId: input.pedidoId,
        mpPaymentId: mpPayment.id,
        qrCodeBase64: mpPayment.qrCodeBase64,
        qrCode: mpPayment.qrCode,
        expirationDate: mpPayment.expirationDate,
        status: 'pendente',
      },
    });

    return payment;
  }
}
```

- [ ] **Step 6: Adicionar variáveis de ambiente**

```bash
# apps/api/.env.example
MP_ACCESS_TOKEN=TEST-xxxxxxxx
MP_PUBLIC_KEY=TEST-xxxxxxxx
```

- [ ] **Step 7: Rodar teste — esperado PASSAR**

```bash
cd apps/api && pnpm test pix-payment
```

Expected: PASS — `createPixPayment` chama MP e retorna qrCode real.

- [ ] **Step 8: E2E com mock de webhook MP**

```ts
// apps/web/e2e/payments/fluxo-pix.spec.ts
import { test, expect } from '@playwright/test';

test('fluxo completo PIX (P0-07)', async ({ page, request }) => {
  // Criar pedido
  await page.goto('/cardapio');
  await page.click('[data-testid=add-produto]');
  await page.click('[data-testid=finalizar-pedido]');

  // Confirmar PIX
  const qrCode = await page.locator('[data-testid=qr-code]').textContent();
  expect(qrCode).toMatch(/^00020126/); // BR Code real

  // Mock webhook MP
  await request.post('/api/webhooks/mercadopago', {
    headers: {
      'x-signature': 'hmac-mock',
      'x-request-id': 'req-mock',
    },
    data: {
      type: 'payment',
      data: { id: 'mp-12345' },
    },
  });

  // Verificar pedido pago
  await expect(page.locator('[data-testid=status-pedido]')).toHaveText('Pago');
});
```

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/payments/ apps/api/.env.example apps/api/test/integration/pix-payment.int-spec.ts apps/web/e2e/payments/
git commit -m "fix(payments): PIX real via Mercado Pago (P0-07)

Antes: buildPixStubPayload() retornava BR Code fake — clientes
que pagavam PIX real nunca recebiam confirmação.

Agora: MercadoPagoGateway chama MP SDK, retorna qrCode real,
armazena mpPaymentId para reconciliação no webhook.
Idempotency key por externalReference."
```

---

## Task 12: P0-05 — Webhook assíncrono via BullMQ

**Files:**

- Modify: `apps/api/src/payments/payments.controller.ts:232`
- Create: `apps/api/src/queues/webhook-pix.processor.ts`
- Create: `apps/api/src/queues/webhook-pix.queue.ts`
- Modify: `apps/api/src/payments/payments.module.ts`

- [ ] **Step 1: Escrever teste de carga (k6)**

```js
// apps/api/test/load/webhook-pix.k6.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // ramp-up
    { duration: '60s', target: 100 }, // sustentado
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // p95 < 200ms (resposta inicial)
  },
};

export default function () {
  const payload = JSON.stringify({
    type: 'payment',
    data: { id: `mp-${__VU}-${__ITER}` },
  });

  const res = http.post('http://localhost:3001/api/webhooks/mercadopago', payload, {
    headers: {
      'Content-Type': 'application/json',
      'x-signature': 'hmac-test',
      'x-request-id': `req-${__VU}-${__ITER}`,
    },
  });

  check(res, {
    'status is 202': (r) => r.status === 202,
    'latency < 200ms': (r) => r.timings.duration < 200,
  });
}
```

- [ ] **Step 2: Refatorar controller para responder 202**

```ts
// apps/api/src/payments/payments.controller.ts (linha ~232)
@Post('webhooks/mercadopago')
async webhookMercadoPago(
  @Headers('x-signature') signature: string,
  @Headers('x-request-id') requestId: string,
  @Body() payload: any,
) {
  // 1. Validar HMAC
  const isValid = await this.hmacValidator.validate(
    signature,
    JSON.stringify(payload),
    process.env.MP_WEBHOOK_SECRET!,
  );
  if (!isValid) {
    throw new UnauthorizedException('Invalid signature');
  }

  // 2. Persistir evento (idempotente via P0-04)
  const event = await this.prisma.webhookEvent.create({
    data: {
      provider: 'mercadopago',
      externalId: `${requestId}-${payload.data?.id ?? 'unknown'}`,
      payload,
    },
  });

  // 3. Enfileirar para processamento assíncrono
  await this.webhookQueue.add('process', { eventId: event.id });

  // 4. Responder 202 imediatamente
  return { status: 'accepted', eventId: event.id };
}
```

- [ ] **Step 3: Criar queue**

```ts
// apps/api/src/queues/webhook-pix.queue.ts
import { Queue } from 'bullmq';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WebhookPixQueue {
  private readonly queue: Queue;

  constructor() {
    this.queue = new Queue('webhook-pix', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 86400, count: 1000 },
        removeOnFail: { age: 604800 }, // 7 dias para DLQ review
      },
    });
  }

  async add(name: string, data: any) {
    return this.queue.add(name, data);
  }
}
```

- [ ] **Step 4: Criar processor**

```ts
// apps/api/src/queues/webhook-pix.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/common/prisma.service';

@Injectable()
@Processor('webhook-pix')
export class WebhookPixProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookPixProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ eventId: string }>) {
    const { eventId } = job.data;
    const event = await this.prisma.webhookEvent.findUnique({ where: { id: eventId } });
    if (!event || event.processedAt) {
      this.logger.warn(`Event ${eventId} já processado ou não encontrado`);
      return;
    }

    try {
      // Reconciliar com MP via SDK
      // Atualizar Order/Subscription (optimistic locking)
      // Enviar e-mail confirmação
      // Registrar log LGPD-redacted

      await this.prisma.webhookEvent.update({
        where: { id: eventId },
        data: { processedAt: new Date() },
      });

      this.logger.log(`Event ${eventId} processado em ${job.processedOn}ms`);
    } catch (error) {
      this.logger.error(`Falha processando ${eventId}: ${error}`);
      throw error; // BullMQ retry via backoff
    }
  }
}
```

- [ ] **Step 5: Registrar no module**

```ts
// apps/api/src/payments/payments.module.ts
@Module({
  imports: [BullModule.registerQueue({ name: 'webhook-pix' })],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    MercadoPagoGateway,
    HmacValidator,
    WebhookPixQueue,
    WebhookPixProcessor,
  ],
})
export class PaymentsModule {}
```

- [ ] **Step 6: Adicionar variável REDIS**

```bash
# apps/api/.env.example
REDIS_HOST=localhost
REDIS_PORT=6379
```

- [ ] **Step 7: Rodar k6**

```bash
# Subir Redis local
docker run -d -p 6379:6379 redis:7-alpine

# Subir API
cd apps/api && pnpm dev

# Em outro terminal, rodar k6
k6 run apps/api/test/load/webhook-pix.k6.js
```

Expected: p95 < 200ms, 0 erros.

- [ ] **Step 8: Atualizar `docker-compose.dev.yml`**

```yaml
# docker-compose.dev.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/payments/ apps/api/src/queues/ apps/api/test/load/ docker-compose.dev.yml apps/api/.env.example
git commit -m "fix(payments): webhook assíncrono via BullMQ (P0-05)

Antes: webhook processava tudo síncrono — p95 4.2s, timeouts do MP.

Agora:
- Endpoint responde 202 imediatamente após validar HMAC + persistir evento
- BullMQ queue webhook-pix processa side-effects em background
- Retry exponencial (3x: 1s/4s/16s) com DLQ
- Teste de carga k6 valida p95 < 200ms

Redis adicionado em docker-compose.dev.yml."
```

---

## Definition of Done da Tranche A

- [ ] Todos os 12 tasks acima completados
- [ ] `pnpm test` verde em apps/api e apps/web
- [ ] `pnpm test:e2e:critical` verde
- [ ] `pnpm test:coverage` ≥ 85% em arquivos modificados
- [ ] `pnpm lint` verde
- [ ] CHANGELOG.md atualizado com entradas P0
- [ ] Branch `chore/auditoria-completa-2026-07-29` com 12+ commits focados
- [ ] PR aberto para revisão (não merge sem aprovação)
- [ ] Zero secrets detectados por gitleaks

## Próximo passo

Após conclusão da Tranche A:

1. Revisar cobertura por BC (relatório)
2. Validar staging (deploy em ambiente de homologação)
3. Smoke test em produção (somente após aprovação)
4. Iniciar **Tranche B** (migração DDD)

---

**Mantido por:** @leo
**Versão:** 1.0.0
**Spec origem:** [PLANO_AUDITORIA_2026-07-29.md §2.1](../../PLANO_AUDITORIA_2026-07-29.md)
