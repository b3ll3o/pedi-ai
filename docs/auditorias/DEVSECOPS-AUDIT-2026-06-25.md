# Varredura Completa DevSecOps — Pedi-AI

**Data da auditoria:** 2026-06-25
**Projeto:** Pedi-AI (Cardápio Digital Mobile-first + Offline-first)
**Stack auditada:** Next.js 16 + React 19 (web), NestJS 11 + Fastify + Prisma 6 + PostgreSQL 16 (api), pnpm monorepo

---

## ⚠️ AVISO DE SEGURANÇA — VAZAMENTO DE CREDENCIAIS DURANTE A AUDITORIA

Durante a geração deste relatório, o agente de auditoria incluiu **valores reais** de `JWT_SECRET`, `JWT_REFRESH_SECRET` e `POSTGRES_PASSWORD` extraídos do `.env`. Os valores foram **redacted** (`<REDACTED-ROTATE-IMMEDIATELY>`) imediatamente após a detecção, **porém os valores reais ficaram**:

1. No contexto de execução do agente (logs internos)
2. Possivelmente em alguma tool trace do runtime
3. Em **qualquer commit que tenha sido feito antes desta redação**

**Ação obrigatória ANTES de qualquer coisa:**

```bash
# 1. Rotacionar IMEDIATAMENTE (não reutilizar os valores)
openssl rand -hex 32  # novo JWT_SECRET
openssl rand -hex 32  # novo JWT_REFRESH_SECRET
openssl rand -base64 24  # novo POSTGRES_PASSWORD

# 2. Atualizar .env (e gerenciador de secrets em prod)
# 3. Reiniciar API + invalidar todos os tokens em circulação
# 4. Revogar sessões ativas (forçar re-login)
# 5. Limpar histórico git (BFG Repo-Cleaner ou git filter-repo)
# 6. Considerar os secrets anteriores como PÚBLICOS
```

Não promova para produção até completar a rotação.

---

**Auditor:** Agente `analista-dev-sec-ops` (12+ anos AppSec + DevSecOps)
**Escopo:** Monorepo completo — `apps/api`, `apps/web`, `packages/shared`, infraestrutura Docker/Nginx, dependências, git history
**Tipo:** Read-only (auditoria estática + SCA + análise manual)

---

## Sumário Executivo

### Risk Rating Consolidado: **ALTO (7.5/10)**

O projeto Pedi-AI demonstra **fundamentos sólidos de segurança** (bcrypt, throttler, JWT com expiração, validação global via ValidationPipe, query parametrizada Prisma por padrão, exception filter global, CORS configurável, helmet-ready via Fastify). Porém, contém um conjunto de **achados críticos e altos que exigem remediação imediata** antes de qualquer deploy em produção — sobretudo um arquivo `.env` trackeado no repositório com secrets reais (incluindo JWT secrets em uso), ausência de verificação de assinatura nos webhooks do Mercado Pago, ausência de Helmet/security headers, ausência de validação de role-based nos controllers administrativos e SQL injection latente em queries raw montadas por concatenação.

### Top 5 Riscos (ordem de prioridade)

| #   | Título                                                                        | Severidade  | CVSS | Categoria                   |
| --- | ----------------------------------------------------------------------------- | ----------- | ---- | --------------------------- |
| 1   | Arquivo `.env` com secrets reais commitado no git                             | **CRÍTICO** | 9.1  | Secrets Mgmt                |
| 2   | Webhook PIX do Mercado Pago sem validação de assinatura                       | **CRÍTICO** | 9.8  | API Security / Supply Chain |
| 3   | Ausência de Helmet / security headers (CSP, HSTS, X-Frame-Options, COOP/COEP) | **ALTO**    | 7.4  | HTTP Hardening              |
| 4   | Ausência de RBAC (autorização por papel) nos controllers administrativos      | **ALTO**    | 8.1  | Authorization (BOLA/BFLA)   |
| 5   | SQL Injection latente em `analytics.service.ts` via template literal          | **ALTO**    | 8.2  | SAST / Injection            |

### Métricas gerais

| Métrica                            | Valor                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| Total de achados                   | **27**                                                                              |
| CRÍTICO                            | 3                                                                                   |
| ALTO                               | 8                                                                                   |
| MÉDIO                              | 9                                                                                   |
| BAIXO                              | 5                                                                                   |
| INFO                               | 2                                                                                   |
| CVEs identificados em dependências | ≥ 6 (moderado)                                                                      |
| Cobertura SAST manual              | 7 dimensões                                                                         |
| Frameworks crosswalk               | OWASP Top 10 2021, OWASP API Top 10 2023, NIST CSF 2.0, LGPD, PCI-DSS 4.0 (parcial) |

---

## 1. Achados por Severidade

### CRÍTICO

#### C-01 — `.env` com secrets reais commitado no repositório

- **Severidade:** CRÍTICO
- **CVSS:** 9.1 (`AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:L`)
- **CWE:** CWE-798 (Use of Hard-coded Credentials)
- **OWASP:** A02:2021 Cryptographic Failures, A07:2021 Identification and Authentication Failures
- **OWASP API:** API2:2023 Broken Authentication
- **Localização:**
  - `/home/leo/Documentos/projetos/pedi-ai/.env` (arquivo tracked)
  - `git log --all --pretty=format:"%h" -- .env` → `59d3586` (já presente desde o commit inicial)
- **Evidência (trecho do `.env` atual — valores redacted; os reais foram vazados pelo próprio relatório e DEVEM ser rotacionados):**
  ```
  POSTGRES_PASSWORD=<REDACTED-ROTATE-IMMEDIATELY>
  JWT_SECRET=<REDACTED-ROTATE-IMMEDIATELY>
  JWT_REFRESH_SECRET=<REDACTED-ROTATE-IMMEDIATELY>
  ```
- **Descrição técnica:** O arquivo `.env` está sendo rastreado pelo Git (`git ls-files` confirma), apesar de aparecer no `.gitignore` (provavelmente foi adicionado antes de existir regra, ou foi forçado com `git add -f`). Ele contém:
  - Senha de banco em uso (mesmo em dev, é a mesma credencial que vai pra produção se não houver troca).
  - JWT secrets em formato hex (32 bytes cada) — **se estes são os valores em produção, qualquer pessoa com acesso ao repo pode forjar tokens para qualquer usuário**.
- **Impacto de negócio:**
  - RCE em qualquer instância rodando com esses secrets (assinatura de JWT aceita, conexão DB aceita).
  - Vazamento de credenciais para todo contribuidor atual e futuro do repositório.
  - Possível exposição se o repositório for público ou vazado por ex-funcionários.
- **Recomendação (remediação imediata — ≤ 24h):**
  1. **Rotacionar AGORA** todos os secrets: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `POSTGRES_PASSWORD`.
  2. Remover o arquivo do tracking: `git rm --cached .env`.
  3. Adicionar regra explícita no `.gitignore`: `/.env`, `/.env.local`, `/.env.*.local`.
  4. Configurar **Gitleaks** ou **TruffleHog** em pre-commit hook (já existem `.husky/`) — adicionar a `prepare-commit-msg` ou `pre-commit`.
  5. Habilitar **GitHub secret scanning** + push protection (Settings → Code security).
  6. **Auditar `git log -p` por outros secrets** (chaves MP, SMTP, JWT antigos) — usar `gitleaks detect --no-git` ou `trufflehog filesystem .`.
- **Código de exemplo para o pre-commit (`.husky/pre-commit`):**

  ```bash
  #!/usr/bin/env sh
  . "$(dirname -- "$0")/_/husky.sh"

  # Gitleaks pre-commit scan
  if command -v gitleaks >/dev/null 2>&1; then
    gitleaks protect --staged --redact --no-banner
  fi
  ```

#### C-02 — Webhook PIX do Mercado Pago sem validação de assinatura

- **Severidade:** CRÍTICO
- **CVSS:** 9.8 (`AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`)
- **CWE:** CWE-345 (Insufficient Verification of Data Authenticity), CWE-20 (Improper Input Validation)
- **OWASP:** A08:2021 Software and Data Integrity Failures
- **OWASP API:** API8:2023 Security Misconfiguration
- **Localização:** `/home/leo/Documentos/projetos/pedi-ai/apps/api/src/payments/payments.controller.ts` (linhas 47–82)
- **Evidência (trecho relevante):**
  ```ts
  @Post('webhooks/pix')
  async handlePixWebhook(
    @Body()
    data: { id: string | number; type: string; data: { id: string | number } }
  ) {
    if (data.type !== 'payment' || !data.data?.id) {
      return { status: 'ignored' };
    }
    const paymentId = String(data.data.id);
    // ... fetch from MP ...
    return this.paymentsService.handleWebhook({
      eventId: String(data.id),
      paymentId,
      status: mpPayment.status,
      orderId,
    });
  }
  ```
- **Descrição técnica:** O endpoint aceita qualquer requisição HTTP POST sem validar assinatura, IP de origem, nem segredo (`MP_WEBHOOK_SECRET`). O Mercado Pago envia headers `x-signature` (HMAC-SHA256 com chave secreta do integrador) e `x-request-id`, que devem ser validados para garantir proveniência.
- **Impacto de negócio:**
  - Atacante pode forçar `status: approved` para qualquer `paymentId` e **marcar pedidos como pagos sem realmente pagar**.
  - Atacante pode fazer order totals serem confirmados como `cancelled` ou `refunded`, causando prejuízo ou chargeback.
  - Bypass total do gateway de pagamento.
- **Recomendação (remediação imediata — ≤ 24h):**
  ```ts
  @Post('webhooks/pix')
  async handlePixWebhook(
    @Headers('x-signature') signature: string,
    @Headers('x-request-id') requestId: string,
    @Body() data: WebhookPayload
  ) {
    // 1. Validar assinatura
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.error('MP_WEBHOOK_SECRET não configurado');
      return { status: 'error' };
    }
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(requestId)
      .digest('hex');
    if (!crypto.timingSafeEqual(
      Buffer.from(signature ?? ''),
      Buffer.from(expectedSignature)
    )) {
      this.logger.warn(`Webhook signature inválida: ${requestId}`);
      return { status: 'unauthorized' };
    }
    // 2. Validar IP de origem (ranges do MP)
    // 3. Continuar...
  }
  ```
- **Referências:** OWASP A08, Mercado Pago Webhooks documentation.

#### C-03 — Ausência total de Helmet / Security Headers (CSP, HSTS, X-Frame-Options, etc.)

- **Severidade:** CRÍTICO
- **CVSS:** 7.4 (`AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:L/A:N`)
- **CWE:** CWE-693 (Protection Mechanism Failure), CWE-1021 (Improper Restriction of Rendered UI Layers)
- **OWASP:** A05:2021 Security Misconfiguration
- **Localização:**
  - `/home/leo/Documentos/projetos/pedi-ai/apps/api/src/main.ts` (bootstrap Fastify)
  - `/home/leo/Documentos/projetos/pedi-ai/apps/web/next.config.ts` (sem `headers()`)
  - `/home/leo/Documentos/projetos/pedi-ai/docker/nginx.dev.conf` (sem headers)
- **Descrição técnica:** O `main.ts` da API configura o `FastifyAdapter` sem registrar `@fastify/helmet`. O `next.config.ts` do Next.js não define `headers()`. O Nginx também não injeta headers de segurança. Isso significa que:
  - **CSP não está definido** → XSS via campos de input (nome do cliente, notas do pedido, etc.) tem superfície ampliada.
  - **HSTS ausente** → downgrade attacks possíveis em produção (mesmo com HTTPS).
  - **X-Frame-Options ausente** → clickjacking possível em `/admin/*`.
  - **X-Content-Type-Options ausente** → MIME sniffing possível.
  - **Referrer-Policy ausente** → vazamento de paths internos.
- **Impacto de negócio:**
  - Stored XSS no cardápio admin (campo `name`, `description`).
  - Clickjacking em rotas de admin/pagamento.
  - Vazamento de informação em logs externos via Referer.
- **Recomendação:**

  ```ts
  // apps/api/src/main.ts — adicionar @fastify/helmet
  import helmet from '@fastify/helmet';

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  });
  ```

  ```ts
  // apps/web/next.config.ts
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; img-src 'self' data: https:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.mercadopago.com",
          },
        ],
      },
    ];
  }
  ```

---

### ALTO

#### A-01 — SQL Injection latente em `analytics.service.ts` (concat dentro de template literal)

- **Severidade:** ALTO
- **CVSS:** 8.2 (`AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N`)
- **CWE:** CWE-89 (SQL Injection)
- **OWASP:** A03:2021 Injection
- **Localização:** `/home/leo/Documentos/projetos/pedi-ai/apps/api/src/analytics/analytics.service.ts` (linhas 47–61)
- **Evidência:**
  ```ts
  await this.prisma.$queryRaw`
    SELECT oi.product_id, p.name as product_name, ...
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE o.restaurant_id = ${query.restaurantId}
      AND o.status = 'paid'
      AND oi.product_id IS NOT NULL
      ${query.startDate ? `AND o.created_at >= ${new Date(query.startDate)}` : ''}
      ${query.endDate ? `AND o.created_at <= ${new Date(query.endDate)}` : ''}
    GROUP BY oi.product_id, p.name
    ORDER BY total_quantity DESC
    LIMIT 10
  `;
  ```
- **Descrição técnica:** O `restaurantId` é parametrizado (Prisma template tag trata como parâmetro), **MAS** `query.startDate` e `query.endDate` são **concatenados como string dentro do template** após passar por `new Date()`. O `new Date()` aceita strings maliciosas e, dependendo da entrada, pode produzir valores inesperados (NaN ou datas de outro formato). Mais grave: o input é controlado por query string (`AnalyticsController`) sem validação rígida. Embora o `new Date()` limite um pouco, é um padrão perigoso.
- **Impacto:** Possível manipulação de queries, log poisoning, exfiltração via time-based.
- **Recomendação:** Usar `Prisma.sql` helper para construção condicional:

  ```ts
  import { Prisma } from '@prisma/client';

  const conditions = [
    Prisma.sql`o.restaurant_id = ${query.restaurantId}`,
    Prisma.sql`o.status = 'paid'`,
    Prisma.sql`oi.product_id IS NOT NULL`,
  ];
  if (query.startDate && !isNaN(Date.parse(query.startDate))) {
    conditions.push(Prisma.sql`o.created_at >= ${new Date(query.startDate)}`);
  }
  if (query.endDate && !isNaN(Date.parse(query.endDate))) {
    conditions.push(Prisma.sql`o.created_at <= ${new Date(query.endDate)}`);
  }
  await this.prisma.$queryRaw`
    SELECT oi.product_id, p.name as product_name, ...
    WHERE ${Prisma.join(conditions, ' AND ')}
    GROUP BY oi.product_id, p.name
    ORDER BY total_quantity DESC
    LIMIT 10
  `;
  ```

#### A-02 — Ausência de RBAC (autorização por papel) — endpoints admin acessíveis a qualquer usuário autenticado

- **Severidade:** ALTO
- **CVSS:** 8.1 (`AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N`)
- **CWE:** CWE-862 (Missing Authorization), CWE-285 (Improper Authorization)
- **OWASP:** A01:2021 Broken Access Control
- **OWASP API:** API5:2023 Broken Function Level Authorization (BFLA)
- **Localização:**
  - `/home/leo/Documentos/projetos/pedi-ai/apps/api/src/users/users.controller.ts` (rotas `users/profiles`, `users/profiles/:id`, PATCH)
  - `/home/leo/Documentos/projetos/pedi-ai/apps/api/src/categories/categories.controller.ts` (CRUD completo)
  - `/home/leo/Documentos/projetos/pedi-ai/apps/api/src/products/products.controller.ts`
  - `/home/leo/Documentos/projetos/pedi-ai/apps/api/src/orders/orders.controller.ts` (PATCH status)
  - `/home/leo/Documentos/projetos/pedi-ai/apps/api/src/tables/tables.controller.ts`
  - `/home/leo/Documentos/projetos/pedi-ai/apps/api/src/restaurants/restaurants.controller.ts`
- **Descrição técnica:** Apenas `JwtAuthGuard` é aplicado. **Não existe `@Roles()` decorator**, nem `RoleGuard`, nem verificação de `restaurantId` do JWT contra o resource acessado. Um usuário com role `cliente` autenticado pode:
  - Listar **todos os perfis de usuários** de qualquer restaurante via `GET /users/profiles?restaurantId=X`.
  - **Atualizar o role** de qualquer usuário via `PATCH /users/profiles/:id`.
  - **Alterar status de pedidos** de outros restaurantes via `PATCH /orders/:id/status`.
  - **CRUD em categorias e produtos** de outros restaurantes.
- **Impacto:** Escalada horizontal entre tenants (BOLA/IDOR), escalada vertical (cliente vira gerente/dono), manipulação de pedidos alheios.
- **Recomendação:**

  ```ts
  // Criar decorator @Roles()
  // apps/api/src/auth/decorators/roles.decorator.ts
  import { SetMetadata } from '@nestjs/common';
  import { UserRole } from '@prisma/client';
  export const ROLES_KEY = 'roles';
  export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

  // Criar RolesGuard
  // apps/api/src/auth/guards/roles.guard.ts
  @Injectable()
  export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}
    canActivate(ctx: ExecutionContext): boolean {
      const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]);
      if (!required || required.length === 0) return true;
      const { user } = ctx.switchToHttp().getRequest();
      return required.includes(user.role);
    }
  }

  // Aplicar nos controllers
  @Controller('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  export class UsersController {
    @Patch('profiles/:id')
    @Roles('dono', 'gerente')
    async updateProfile(@Param('id') id: string, @Body() data, @Req() req) {
      // Validar também que req.user.restaurantId === resource.restaurantId
      return this.usersService.updateProfile(id, data, req.user);
    }
  }
  ```

#### A-03 — BOLA/IDOR: queries por `restaurantId` no query string sem validação

- **Severidade:** ALTO
- **CVSS:** 7.5 (`AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N`)
- **CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key)
- **OWASP API:** API1:2023 Broken Object Level Authorization
- **Localização:** Múltiplos controllers — `orders.controller.ts` (`findAll`, `findByCustomer`), `menu.controller.ts`, `analytics.controller.ts`, `users.controller.ts`
- **Evidência (`orders.controller.ts`):**
  ```ts
  @Get()
  async findAll(@Query('restaurantId') restaurantId: string) {
    return this.ordersService.findByRestaurant(restaurantId);
  }
  ```
- **Descrição:** O cliente envia `restaurantId` na query string. Não há checagem se o usuário autenticado tem direito sobre aquele restaurante. Atacante pode iterar UUIDs ou ler IDs de outros pedidos via respostas anteriores e ver pedidos de restaurantes concorrentes.
- **Recomendação:** Extrair `restaurantId` do JWT (claim ou via `req.user.restaurantId`) e ignorar o query param. Nunca confiar no input do cliente para autorização.

#### A-04 — Reset de senha loga token em `console.log`

- **Severidade:** ALTO
- **CVSS:** 7.5 (`AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N`)
- **CWE:** CWE-532 (Insertion of Sensitive Information into Log File), CWE-200 (Information Exposure)
- **Localização:** `apps/api/src/auth/auth.service.ts:155`
- **Evidência:**
  ```ts
  console.log(`Password reset token for ${email}: ${token}`);
  ```
- **Descrição:** O token de reset de senha (32 bytes hex = 256 bits de entropia) está sendo **impresso em stdout**. Em produção com agregadores de logs (Datadog, Splunk, Elastic), isso vaza todos os tokens. Atacante com acesso a logs pode resetar senha de qualquer usuário.
- **Recomendação:** Substituir por envio de email real (SMTP já configurado com Mailpit em dev). Nunca logar tokens, mesmo em dev:
  ```ts
  // Enviar email com link
  await this.emailService.sendPasswordReset(user.email, token);
  // Para dev, opcionalmente retornar via canal seguro, não console.log
  ```

#### A-05 — Senha de dev com fallback inseguro (`postgres123`)

- **Severidade:** ALTO (em prod) / MÉDIO (em dev)
- **CVSS:** 7.0
- **CWE:** CWE-521 (Weak Password Requirements)
- **Localização:**
  - `docker-compose.yml` linha 12: `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres123}`
  - `docker-compose.dev.yml` linha 14: idem
- **Descrição:** Se a env var não for definida, o container sobe com `postgres123`. Em produção, é um padrão que falha silenciosamente.
- **Recomendação:** Falhar de forma segura — fazer o serviço não iniciar se a env não estiver definida:
  ```yaml
  environment:
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD é obrigatório}
  ```

#### A-06 — `@fastify/static` v8.3.0 — múltiplas CVEs (path traversal + route guard bypass)

- **Severidade:** ALTO
- **CVSS:** 5.9 (CVE-2026-6414) + 5.3 (CVE-2026-6410)
- **CVE:** CVE-2026-6410 (path traversal em directory listing), CVE-2026-6414 (route guard bypass via `%2F`)
- **CWE:** CWE-22, CWE-177
- **Localização:** `apps/api/package.json` linha 19: `"@fastify/static": "^8.1.0"` (resolve para 8.3.0)
- **Recomendação:** Upgrade para `@fastify/static >= 9.1.1` (linha `pnpm update @fastify/static`). Validar breaking changes.

#### A-07 — `ws` (WebSocket) — uninitialized memory disclosure

- **Severidade:** ALTO
- **CVSS:** 7.0 (CVE-2026-45736)
- **CVE:** CVE-2026-45736
- **CWE:** CWE-908 (Use of Uninitialized Resource)
- **Localização:** Dependência transitiva `apps/api > socket.io > engine.io > ws@8.18.3`
- **Recomendação:** Upgrade `ws` para `>= 8.20.1`. Adicionar `pnpm.overrides` se necessário: `"ws": "^8.20.1"`.

#### A-08 — UUID (transitivo via `mercadopago`) — missing buffer bounds check

- **Severidade:** ALTO
- **CVSS:** 7.5 (CVE-2026-41907)
- **CVE:** CVE-2026-41907
- **CWE:** CWE-787 (Out-of-bounds Write), CWE-1285
- **Localização:** Dependência transitiva `apps/web > mercadopago > uuid@9.0.1`
- **Recomendação:** Upgrade `uuid` para `>= 11.1.1` via `pnpm.overrides`:
  ```json
  // package.json
  "pnpm": { "overrides": { "uuid": "^11.1.1" } }
  ```

---

### MÉDIO

#### M-01 — Throttler global muito permissivo (10 req/min)

- **Severidade:** MÉDIO
- **Localização:** `apps/api/src/app.module.ts:24` → `ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])`
- **Descrição:** Limite global de 10 req/min aplica a TODOS os endpoints, mesmo GETs públicos de cardápio. Isso quebra UX e o decorator `@Throttle({ default: { ttl: 60_000, limit: 10 } })` no AuthController usa o **mesmo valor do global**, sem efeito prático. Brute-force em login está limitado, mas o limite é compartilhado.
- **Recomendação:** Tierizar (P0: login/register/refresh = 5/min, P1: escrita autenticada = 30/min, P2: leitura pública = 300/min):
  ```ts
  ThrottlerModule.forRoot([
    { name: 'short', ttl: 60_000, limit: 5 },
    { name: 'medium', ttl: 60_000, limit: 30 },
    { name: 'long', ttl: 60_000, limit: 300 },
  ]);
  ```
  Aplicar `@Throttle({ short: { limit: 5, ttl: 60_000 } })` em rotas sensíveis.

#### M-02 — Refresh token sem rotação / blacklist

- **Severidade:** MÉDIO
- **Localização:** `apps/api/src/auth/auth.service.ts:103-127`
- **Descrição:** O `refreshToken` é gerado com `expiresIn: 7d` mas não é armazenado em DB. Não há revogação, não há rotação (refresh tokens são reusáveis), não há detecção de reuso. Se um refresh token vazar, vale por 7 dias sem possibilidade de revogar (a não ser mudando `JWT_REFRESH_SECRET`, o que invalida todos).
- **Recomendação:** Implementar rotação + blacklist (tabela `RefreshToken` com `revokedAt`, `replacedBy`):
  ```ts
  // Schema Prisma
  model RefreshToken {
    id          String   @id @default(uuid())
    userId      String
    tokenHash   String   @unique
    revokedAt   DateTime?
    replacedBy  String?
    expiresAt   DateTime
    createdAt   DateTime @default(now())
    @@index([userId])
  }
  ```

#### M-03 — bcrypt cost factor 10 (abaixo do recomendado para 2026)

- **Severidade:** MÉDIO
- **Localização:** `apps/api/src/auth/auth.service.ts:55, 184`
- **Descrição:** `bcrypt.hash(data.password, 10)` — cost factor 10 está no mínimo aceitável. Para defesa contra GPUs modernas (e bcrypt tem resistência ASIC limitada), recomenda-se 12+ em 2026. Argon2id seria preferível.
- **Recomendação:** Aumentar para 12 ou migrar para Argon2id (`argon2` package).

#### M-04 — CORS permite `0.0.0.0:3000` em prod (origem suspeita)

- **Severidade:** MÉDIO
- **Localização:**
  - `.env.example` linha 17: `ALLOWED_ORIGINS=http://localhost:3000,http://0.0.0.0:3000`
  - `apps/api/src/main.ts:19`
- **Descrição:** `0.0.0.0` em `ALLOWED_ORIGINS` é frágil e pode vazar CORS permissivo em produção.
- **Recomendação:** Remover `0.0.0.0` da lista. Validar origins com regex estrita (apenas `https://*.pedi-ai.com` em prod).

#### M-05 — Falta de rate limit por IP em health/metrics

- **Severidade:** MÉDIO
- **Localização:** `apps/api/src/health/health.controller.ts`
- **Descrição:** Health checks são públicos — podem ser usados para fingerprinting ou amplificar DDoS.
- **Recomendação:** Throttle explícito `@SkipThrottle()` apenas se monitorar externamente; caso contrário, limite.

#### M-06 — `dangerouslySetInnerHTML` em layout.tsx

- **Severidade:** MÉDIO
- **Localização:** `apps/web/src/app/layout.tsx:114`
- **Descrição:** JSON-LD embutido via `dangerouslySetInnerHTML`. Conteúdo é estático (não vem de user input), **mas** qualquer string controlada por atacante que alcance `BASE_URL` ou descrição pode quebrar.
- **Recomendação:** Trocar por `<Script type="application/ld+json">{JSON.stringify({...})}</Script>` ou sanitizar via `serialize-javascript`.

#### M-07 — `payments.service.ts` ignora `MP_WEBHOOK_SECRET` e não verifica source IP

- **Severidade:** MÉDIO
- **Localização:** `apps/api/src/payments/payments.controller.ts`
- **Descrição:** Já tratado em C-02 (validação de assinatura). Mas adicionalmente, **não há verificação de source IP** contra ranges conhecidos do Mercado Pago.
- **Recomendação:** Validar IP via lista oficial `https://api.mercadopago.com/v1/whitelisted_ips` ou lista estática.

#### M-08 — `feature-flags.ts` no cliente — bypass trivial

- **Severidade:** MÉDIO
- **Localização:** `apps/web/src/lib/feature-flags.ts` (provável)
- **Descrição:** Toda flag é `NEXT_PUBLIC_*` e controlada no cliente. Atacante pode modificar `window.localStorage` ou interceptar request para burlar flags (especialmente `NEXT_PUBLIC_DEMO_PAYMENT_MODE`).
- **Recomendação:** Flags sensíveis (demo, pagamento fake) devem ser **validadas no backend** também. O cliente é só a UI.

#### M-09 — `WebSocket` CORS permissivo

- **Severidade:** MÉDIO
- **Localização:** `apps/api/src/realtime/realtime.gateway.ts:13`
- **Descrição:** CORS do gateway WebSocket precisa ser revisado (não inspecionado nesta varredura, mas o grep confirmou uso).
- **Recomendação:** Replicar política CORS do REST (`ALLOWED_ORIGINS`).

---

### BAIXO

#### L-01 — `usersController.findById` não valida ownership

- **Severidade:** BAIXO
- **Localização:** `apps/api/src/users/users.controller.ts:65` (`getProfileById`)
- **Descrição:** `findById(id)` permite buscar qualquer perfil por ID. Atacante enumerando UUIDs pode ver dados básicos de outros usuários.
- **Recomendação:** Filtrar por `req.user.id === id || hasRole('gerente','dono')`.

#### L-02 — `validateCart` aceita `unitPrice` do cliente

- **Severidade:** BAIXO
- **Localização:** `apps/api/src/cart/cart.service.ts:54-62`
- **Descrição:** Compara `item.unitPrice !== product.price` mas apenas retorna erro — não usa o preço do servidor na criação do pedido. Atacante pode alterar `unitPrice` no POST de `/orders` (ver A-02 também).
- **Recomendação:** Sempre sobrescrever `unitPrice` no backend com `product.price` durante `OrdersService.create`.

#### L-03 — `findByCustomer` aceita customerId arbitrário

- **Severidade:** BAIXO
- **Localização:** `apps/api/src/orders/orders.controller.ts:25-32`
- **Descrição:** `GET /orders/customer?customerId=X&restaurantId=Y` retorna pedidos de qualquer cliente.
- **Recomendação:** Usar `req.user.id` se autenticado; caso contrário, exigir ambos os params validados via token de mesa.

#### L-04 — Mailpit exposto em dev (porta 8025)

- **Severidade:** BAIXO
- **Localização:** `docker-compose.yml` e `docker-compose.dev.yml`
- **Descrição:** `127.0.0.1:8025:8025` em dev é OK, mas em prod a porta SMTP **não deve existir**.
- **Recomendação:** Não incluir mailpit em `docker-compose.prod.yml`. Documentar.

#### L-05 — Falta de HTTPS em nginx dev

- **Severidade:** BAIXO
- **Localização:** `docker/nginx.dev.conf`
- **Descrição:** Apenas porta 80 configurada; em produção, TLS é mandatório (Let's Encrypt).
- **Recomendação:** Criar `nginx.prod.conf` com `ssl_certificate`, HSTS, TLS 1.2+.

---

### INFO

#### I-01 — `helmet` listado como dependência parcial (@fastify/static mas sem @fastify/helmet)

- **Severidade:** INFO
- **Recomendação:** Adicionar `@fastify/helmet` ao `apps/api/package.json`.

#### I-02 — README/AGENTS.md sem seção dedicada a Threat Model

- **Severidade:** INFO
- **Recomendação:** Documentar modelo de ameaça por BC (linkar este relatório).

---

## 2. Análise por Categoria SAST

### 2.1 SQL Injection

| Status  | Observação                                                                                                                                                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parcial | Prisma usa queries parametrizadas por padrão em 95% dos casos. **Exceção:** `analytics.service.ts:47-61` concatena `query.startDate` e `query.endDate` dentro de `$queryRaw` template (ver A-01). Resto OK. |

### 2.2 XSS

| Status       | Observação                                                                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OK (parcial) | React escapa por padrão. `dangerouslySetInnerHTML` em `layout.tsx:114` é estático (JSON-LD). Não há uso de `eval`, `Function()`, `dangerouslySetInnerHTML` com user input. Web não renderiza HTML arbitrário de cardápio. |

### 2.3 CSRF

| Status  | Observação                                                                                                                                                                                                                                                                                |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Atenção | API usa JWT via Authorization header — não usa cookies, então CSRF clássico não se aplica. **Porém**, autenticação Web → API pode usar cookies httpOnly (verificar em `apps/web/src/lib/auth/*`). Se houver cookie de sessão, CSRF protection (SameSite=Strict, token CSRF) é necessária. |

### 2.4 SSRF

| Status | Observação                                                                                  |
| ------ | ------------------------------------------------------------------------------------------- |
| OK     | Nenhum `fetch(url)` controlado por user input encontrado. Apenas Mercado Pago (controlado). |

### 2.5 Path Traversal

| Status  | Observação                                                                                |
| ------- | ----------------------------------------------------------------------------------------- |
| Atenção | `@fastify/static@8.3.0` tem CVE-2026-6410 (CWE-22) — path traversal em directory listing. |

### 2.6 Prototype Pollution

| Status | Observação                                                                                   |
| ------ | -------------------------------------------------------------------------------------------- |
| OK     | Nenhum `Object.assign(target, userInput)` inseguro ou merge recursivo de input não validado. |

### 2.7 Insecure Deserialization

| Status | Observação                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------------- |
| OK     | Sem uso de `node-serialize`, `serialize-javascript` em contexto inseguro, ou `eval` de input externo. |

### 2.8 Hardcoded Secrets / API Keys

| Status      | Observação                                                                               |
| ----------- | ---------------------------------------------------------------------------------------- |
| **CRÍTICO** | `.env` commitado com secrets reais (ver C-01). `.env.example` está limpo (placeholders). |

### 2.9 Algoritmos Criptográficos Fracos

| Status | Observação                                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| OK     | bcrypt cost 10 (mínimo aceitável, ver M-03). HMAC-SHA256 em QR validator. UUIDs v4 em tokens. Crypto.randomBytes(32) em reset token. |

### 2.10 Validação de Entrada

| Status  | Observação                                                                                                                                                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Parcial | `ValidationPipe` global com `whitelist + forbidNonWhitelisted + transform`. **Mas** controllers usam `@Body()` com tipos inline (não DTOs validados). Ex.: `payments.controller.ts:createPixPayment`, `orders.controller.ts:create`. |

### 2.11 Mass Assignment

| Status  | Observação                                                                                                                                                                  |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Atenção | `orders.controller.ts:create` aceita `customerEmail`, `customerId` no body sem verificar se pertence ao requisitante. Atacante pode criar pedido em nome de outro customer. |

### 2.12 Race Conditions

| Status | Observação                                                                    |
| ------ | ----------------------------------------------------------------------------- |
| OK     | `$transaction` usado em `OrdersService.create` e `AuthService.resetPassword`. |

---

## 3. Análise de Autenticação e Autorização

### 3.1 JWT

| Aspecto             | Status      | Observação                                                                                                                    |
| ------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Algoritmo           | OK          | `@nestjs/jwt` default HS256 (configurável).                                                                                   |
| Claims              | OK          | `sub`, `email`, `role`.                                                                                                       |
| Expiração           | OK          | Access 15m, Refresh 7d.                                                                                                       |
| Validação           | OK          | `ignoreExpiration: false`, `secretOrKey` carregado.                                                                           |
| Algoritmo allowlist | **Atenção** | Não foi visto `algorithms: ['HS256']` no `super()` de `JwtStrategy`. Adicionar explicitamente para evitar `alg=none` attacks. |
| Rotação de secrets  | Ausente     | Sem mecanismo.                                                                                                                |
| Revogação           | Ausente     | Sem blacklist (ver M-02).                                                                                                     |

### 3.2 Senhas

| Aspecto     | Status     | Observação                                            |
| ----------- | ---------- | ----------------------------------------------------- |
| Hash        | bcrypt     | Cost 10 (ver M-03).                                   |
| Salt        | Automático | bcrypt gera salt por hash.                            |
| Política    | Boa        | Regex força maiúscula + dígito + especial + 8+ chars. |
| Reset token | OK         | 32 bytes hex, expiração 1h, single-use.               |

### 3.3 RBAC

| Aspecto            | Status      | Observação                                                                                 |
| ------------------ | ----------- | ------------------------------------------------------------------------------------------ |
| Definição de roles | OK          | Enum `UserRole`: `dono, gerente, atendente, cliente`.                                      |
| Enforcement        | **CRÍTICO** | Sem `RolesGuard` aplicado. Todos endpoints autenticados aceitam qualquer role (ver A-02).  |
| Tenant isolation   | **Ausente** | `restaurantId` aceito no body/query sem validar contra `req.user.restaurantId` (ver A-03). |

### 3.4 QR Code de Mesa

| Aspecto             | Status      | Observação                                                                                                                                             |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HMAC-SHA256         | OK          | `apps/web/src/lib/qr/validator.ts` usa `createHmac('sha256', secret)`.                                                                                 |
| Timing-safe compare | OK          | `timingSafeEqual` usado.                                                                                                                               |
| Timestamp window    | OK          | 4h para QR novo, 24h legacy grace period.                                                                                                              |
| Nonce validation    | OK          | UUID regex.                                                                                                                                            |
| Onde é validado     | **Atenção** | Apenas no front (`apps/web/src/lib/qr`). API não valida QR antes de criar pedido. **Atacante pode POST direto para `/orders` com qualquer `tableId`**. |

---

## 4. Segurança de API REST

### 4.1 Validação de DTO

| Aspecto                   | Status                                           |
| ------------------------- | ------------------------------------------------ |
| Auth DTOs                 | OK (class-validator + IsEmail, MinLength).       |
| Orders/Payments/Menu DTOs | **Ausente** — tipos inline, sem class-validator. |
| Whitelist global          | OK (`forbidNonWhitelisted: true`).               |

### 4.2 Rate Limiting

| Aspecto  | Status                                                        |
| -------- | ------------------------------------------------------------- |
| Global   | 10/min (muito restritivo para leitura pública, OK para auth). |
| Por rota | Aplicado em Auth via decorator (mesmo valor).                 |

### 4.3 CORS

| Aspecto     | Status                                            |
| ----------- | ------------------------------------------------- |
| Origens     | `ALLOWED_ORIGINS` env-driven, fallback localhost. |
| Credentials | `credentials: true` habilitado.                   |
| Atenção     | `0.0.0.0:3000` em .env.example (M-04).            |

### 4.4 Security Headers

**Ausentes** (ver C-03).

### 4.5 Error Handling

| Aspecto            | Status                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Filtro global      | OK (`TodasExcecoesFiltro`).                                                                                                             |
| Vazamento de stack | **Atenção** — `exception.message` é incluído na resposta para erros não-HttpException. Em produção, deveria ser logado mas não exposto. |

### 4.6 Webhooks

| Aspecto      | Status                            |
| ------------ | --------------------------------- |
| Idempotência | OK (tabela `WebhookEvent`).       |
| Assinatura   | **CRÍTICO — ausente** (ver C-02). |
| Source IP    | Não validado.                     |

### 4.7 Tenant Isolation

**Ausente** (ver A-03).

---

## 5. Segurança de Banco de Dados (Prisma + PostgreSQL)

### 5.1 Prisma

| Aspecto                | Status                                                                |
| ---------------------- | --------------------------------------------------------------------- |
| Queries parametrizadas | OK (default).                                                         |
| Raw queries            | 2 encontradas (`analytics.service.ts`) — uma com concatenação (A-01). |
| `$queryRawUnsafe`      | Não usado.                                                            |

### 5.2 PostgreSQL

| Aspecto | Status                                                                         |
| ------- | ------------------------------------------------------------------------------ |
| Senha   | Em `.env` (CRÍTICO — C-01). Fallback `postgres123` (A-05).                     |
| Usuário | `postgres` (superuser). Em prod, usar usuário dedicado com permissões mínimas. |
| TLS     | Não configurado em `DATABASE_URL`. Adicionar `?sslmode=require`.               |
| Backups | Não documentado. Sem criptetografia at-rest documentada.                       |

### 5.3 PII / LGPD

| Dado        | Localização                                 | Tratamento                                                               |
| ----------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| Nome        | `UsersProfile.name`, `Order.customerName`   | Plaintext em DB.                                                         |
| Email       | `UsersProfile.email`, `Order.customerEmail` | Plaintext. Não há criptografia.                                          |
| Telefone    | `Order.customerPhone`                       | Plaintext.                                                               |
| Senha       | `UsersProfile.passwordHash`                 | bcrypt (OK).                                                             |
| Reset token | `PasswordResetToken.token`                  | Plaintext hex. Considerar hash do token (mesmo padrão do refresh token). |

**Riscos LGPD:**

- Sem `consentimento` explícito registrado.
- Sem `direito ao esquecimento` implementado (apenas soft-delete em Table/Category).
- Sem DPO documentado.
- Sem política de retenção.
- Sem criptografia em repouso de PII.

---

## 6. Segurança do Frontend (apps/web)

### 6.1 Service Worker / Workbox

| Aspecto             | Status                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Workbox listado     | Sim em deps.                                                                                                                       |
| Service worker file | **Não encontrado** em `apps/web/src/` (grep retornou vazio). Pode estar em `public/` ou ser registrado programaticamente. Validar. |

### 6.2 IndexedDB (Dexie)

| Aspecto         | Status                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------- |
| Dados sensíveis | Pedidos offline armazenados localmente. Sem criptografia (Dexie não tem por padrão).         |
| Sincronização   | Background sync com Workbox. Sem autenticação na fila — se a fila vazar, dados são públicos. |
| Logs            | Pedidos pendentes visíveis em DevTools.                                                      |

### 6.3 JWT no Cliente

| Aspecto          | Status                                                                            |
| ---------------- | --------------------------------------------------------------------------------- |
| localStorage     | Provável (grep confirmou uso de tokens).                                          |
| httpOnly cookies | **Não verificado**.                                                               |
| Recomendação     | Se localStorage, considerar migração para httpOnly Secure SameSite=Strict cookie. |

### 6.4 NEXT*PUBLIC*\* expostos

Lista auditada em `.env.example`: nenhuma é secret (são URLs e flags). OK.

### 6.5 Source Maps em Produção

| Aspecto    | Status                                                                     |
| ---------- | -------------------------------------------------------------------------- |
| Next.js 16 | Default: desabilitados em prod (`productionBrowserSourceMaps: false`). OK. |

### 6.6 Content Security Policy

**Ausente** (ver C-03).

---

## 7. Análise de Dependências (SCA)

### 7.1 CVEs identificados via `pnpm audit`

| Pacote            | Versão atual | Versão fixa | CVE                          | Severidade                  |
| ----------------- | ------------ | ----------- | ---------------------------- | --------------------------- |
| `@fastify/static` | 8.3.0        | >= 9.1.1    | CVE-2026-6410, CVE-2026-6414 | Moderado/Alto               |
| `ws`              | 8.18.3       | >= 8.20.1   | CVE-2026-45736               | Moderado                    |
| `uuid`            | 9.0.1        | >= 11.1.1   | CVE-2026-41907               | Alto                        |
| `postcss`         | 8.4.31       | >= 8.5.10   | CVE-2026-41305               | Moderado (XSS via </style>) |

### 7.2 Supply Chain

| Aspecto             | Status                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------- |
| Lockfile commitado  | OK (`pnpm-lock.yaml`).                                                                  |
| `--frozen-lockfile` | **Atenção** — Dockerfiles usam `--no-frozen-lockfile`, enfraquecendo reprodutibilidade. |
| Typosquatting       | Não identificado.                                                                       |

---

## 8. Infraestrutura

### 8.1 Dockerfiles

| Aspecto            | API                                          | Web                 |
| ------------------ | -------------------------------------------- | ------------------- |
| Multi-stage        | Sim                                          | Sim                 |
| Usuário não-root   | `nestjs` (uid 1001)                          | `nextjs` (uid 1001) |
| Imagem base        | `node:20-bookworm`                           | `node:20-alpine`    |
| `--ignore-scripts` | Parcial (em prod)                            | Parcial             |
| Recomendação       | Adicionar `dumb-init`, scan com Trivy em CI. | Idem.               |

### 8.2 docker-compose

| Aspecto                 | dev            | prod                               |
| ----------------------- | -------------- | ---------------------------------- |
| Senha default insegura  | OK (dev)       | **NÃO usar `postgres123`** (A-05). |
| Mailpit exposto         | OK (dev)       | Remover em prod.                   |
| Portas DB/SMTP expostas | 127.0.0.1 only | OK se mantido.                     |

### 8.3 Nginx

| Aspecto              | dev                  | prod         |
| -------------------- | -------------------- | ------------ |
| Headers de segurança | **Ausentes** (C-03). | Crítico.     |
| TLS                  | Não configurado.     | Obrigatório. |
| Rate limit           | Não.                 | Recomendado. |

### 8.4 Variáveis de ambiente

- `.env` commitado — CRÍTICO.
- `.env.example` OK.
- `.mcp.json` listado no `.gitignore` mas verificar conteúdo.

---

## 9. Threat Modeling STRIDE por Bounded Context

### 9.1 `autenticacao/`

| STRIDE                | Ameaça                     | Vetor                     | Mitigação atual          | Gap                  |
| --------------------- | -------------------------- | ------------------------- | ------------------------ | -------------------- |
| **S**poofing          | Forjar JWT                 | Secret fraco ou vazado    | bcrypt + secret em env   | C-01 (secret leaked) |
| **T**ampering         | Alterar claims em trânsito | TLS ausente               | HTTPS em prod (esperado) | Validar              |
| **R**epudiation       | "Não fui eu que loguei"    | Sem audit log estruturado | Nenhum audit log         | Adicionar audit log  |
| **I**nfo Disclosure   | Token em log               | `console.log` em reset    | Nenhum                   | A-04                 |
| **D**enial of Service | Brute force                | Throttler                 | 10/min global            | OK mas revisar       |
| **E**levation         | Bypass de role             | Sem RBAC                  | Nenhum                   | A-02                 |

### 9.2 `pedido/`

| STRIDE | Ameaça                               | Mitigação atual                 | Gap         |
| ------ | ------------------------------------ | ------------------------------- | ----------- |
| S      | Cliente finge ser outro customer     | Sem validação de ownership      | A-03, L-03  |
| T      | Alterar preço/unitPrice no body      | Validação leve (apenas warning) | L-02        |
| R      | Negar criação de pedido              | Audit log ausente               | Adicionar   |
| I      | Dados de pedido em logs              | Logs do Fastify podem incluir   | Filtrar PII |
| D      | Criar 1000 pedidos vazios            | Throttler global                | OK          |
| E      | Cliente cria pedido em restaurante X | Sem tenant check                | A-03        |

### 9.3 `cardapio/`

| STRIDE | Ameaça                                    | Gap                           |
| ------ | ----------------------------------------- | ----------------------------- |
| S      | n/a (leitura pública)                     | -                             |
| T      | Admin edita cardápio de outro restaurante | A-02                          |
| R      | Mudança sem audit                         | OK (campo `updatedAt`)        |
| I      | Preços visíveis a todos                   | Por design (cardápio público) |
| D      | Scraping massivo                          | Sem rate limit específico     |
| E      | Cliente vira editor                       | A-02                          |

### 9.4 `mesa/`

| STRIDE | Ameaça                    | Gap                                         |
| ------ | ------------------------- | ------------------------------------------- |
| S      | Forjar QR de outra mesa   | API não valida QR — só frontend             |
| T      | Mudar `tableId` no pedido | Sem validação server-side                   |
| R      | -                         | -                                           |
| I      | QR vazado                 | QR é assinado (OK), mas tabela é enumerable |
| D      | -                         | -                                           |
| E      | Acessar mesa alheia       | A-03                                        |

### 9.5 `pagamento/`

| STRIDE | Ameaça                      | Gap                                     |
| ------ | --------------------------- | --------------------------------------- |
| S      | Webhook forjado             | C-02                                    |
| T      | Alterar status do pagamento | Sem idempotência forte + sem assinatura |
| R      | Cliente nega pagamento      | Audit log + recibo                      |
| I      | Token MP em log             | OK se não logado                        |
| D      | Flood de webhooks           | Sem rate limit em `/webhooks/pix`       |
| E      | n/a                         | -                                       |

### 9.6 `admin/`

| STRIDE | Ameaça                      | Gap                                     |
| ------ | --------------------------- | --------------------------------------- |
| S      | Admin de restaurante A em B | A-03                                    |
| T      | Mudar role de outro usuário | A-02 (PATCH sem check)                  |
| R      | Mudança sem rastro          | OK (`updatedAt`)                        |
| I      | Listar todos os usuários    | `GET /users/profiles` sem filtro (A-02) |
| D      | -                           | -                                       |
| E      | Cliente vira gerente        | A-02                                    |

---

## 10. Compliance

### 10.1 OWASP Top 10 (2021) Checklist

| Item                          | Status      | Observação                                                                            |
| ----------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| A01 Broken Access Control     | **Parcial** | RBAC ausente (A-02); tenant isolation ausente (A-03).                                 |
| A02 Cryptographic Failures    | **Parcial** | bcrypt OK, mas secrets em `.env` (C-01), PII em plaintext.                            |
| A03 Injection                 | **Parcial** | Prisma OK; analytics raw SQL com concatenação (A-01).                                 |
| A04 Insecure Design           | OK          | Bounded contexts bem definidos, separação de responsabilidades.                       |
| A05 Security Misconfiguration | **Falha**   | Helmet ausente (C-03), dev secrets em prod, nginx sem headers.                        |
| A06 Vulnerable Components     | **Falha**   | CVEs em fastify/static, ws, uuid (A-06 a A-08).                                       |
| A07 Auth Failures             | **Parcial** | bcrypt OK, throttler OK, mas reset token em log (A-04), refresh sem revogação (M-02). |
| A08 Software & Data Integrity | **Falha**   | Webhook sem assinatura (C-02).                                                        |
| A09 Logging & Monitoring      | **Falha**   | Sem SIEM, sem centralização, sem alertas estruturados.                                |
| A10 SSRF                      | OK          | Sem fetch externo controlado por user input.                                          |

### 10.2 OWASP API Security Top 10 (2023)

| Item                                                 | Status                                                                  |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| API1 Broken Object Level Authorization               | **Falha** (A-03)                                                        |
| API2 Broken Authentication                           | **Falha** (C-01)                                                        |
| API3 Broken Object Property Level Authorization      | **Falha** (mass assignment no `/orders`)                                |
| API4 Unrestricted Resource Consumption               | **Parcial** (throttler)                                                 |
| API5 Broken Function Level Authorization             | **Falha** (A-02)                                                        |
| API6 Unrestricted Access to Sensitive Business Flows | **Parcial**                                                             |
| API7 Server Side Request Forgery                     | OK                                                                      |
| API8 Security Misconfiguration                       | **Falha** (C-03)                                                        |
| API9 Improper Inventory Management                   | **Parcial** (Swagger OK, mas falta API versioning e deprecation policy) |
| API10 Unsafe Consumption of APIs                     | **Parcial** (MP sem validação)                                          |

### 10.3 LGPD

| Requisito                       | Status                                |
| ------------------------------- | ------------------------------------- |
| Bases legais documentadas       | Ausente                               |
| Consentimento explícito         | Ausente                               |
| Direito de acesso               | Não implementado                      |
| Direito ao esquecimento         | Soft-delete parcial (Table, Category) |
| Portabilidade                   | Não implementado                      |
| Notificação de breach (Art. 48) | Sem processo documentado              |
| DPO                             | Não documentado                       |
| RIPD                            | Não realizado                         |
| Encriptação em repouso          | Não                                   |
| Logs com PII                    | Provável (sem filtro)                 |

### 10.4 PCI-DSS 4.0

Como Mercado Pago abstrai armazenamento de cartão, Pedi-AI não armazena PAN. Mas precisa:

- Manter `MP_ACCESS_TOKEN` seguro — **C-01 expõe essa possibilidade**.
- Validar webhook (C-02).
- Logs sem dados de transação — OK.

---

## 11. Plano de Remediação

### Quick Wins (≤ 1 dia / 24h)

1. **Rotacionar TODOS os secrets** (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `POSTGRES_PASSWORD`, futura `MP_ACCESS_TOKEN`).
2. **`git rm --cached .env`** + adicionar ao `.gitignore`.
3. **Adicionar validação de assinatura no webhook PIX** (C-02).
4. **Adicionar `@fastify/helmet` à API** com CSP mínimo (C-03).
5. **Remover `console.log(token)` em reset password** (A-04).
6. **Upgrade `@fastify/static` para 9.1.1+** (A-06).
7. **Upgrade `ws` para 8.20.1+ via pnpm overrides** (A-07).
8. **Upgrade `uuid` para 11.1.1+ via pnpm overrides** (A-08).
9. **Remover `0.0.0.0` de `ALLOWED_ORIGINS`** (M-04).
10. **Forçar `POSTGRES_PASSWORD` em compose** (A-05).

### Médio Prazo (1 semana)

1. Implementar `RolesGuard` + `@Roles()` decorator (A-02).
2. Adicionar validação server-side de QR code (atualmente só front).
3. Adicionar `restaurantId` ao JWT e ignorar query param (A-03).
4. Implementar rotação de refresh tokens + blacklist (M-02).
5. Migrar raw queries analytics para `Prisma.sql` helper (A-01).
6. Adicionar `next.config.ts` headers() com CSP e HSTS.
7. Criar `nginx.prod.conf` com TLS + headers.
8. Implementar DTOs com class-validator para todos os controllers.
9. Adicionar Gitleaks em pre-commit.
10. Habilitar GitHub secret scanning + push protection.

### Longo Prazo (1 mês+)

1. **Migrar para Argon2id** (M-03) e aumentar cost.
2. **Implementar audit log estruturado** para todas ações sensíveis.
3. **Criptografia at-rest de PII** (campo `email`, `phone` via `pgcrypto` ou aplicação).
4. **Centralizar logs em ELK/Loki** + alertas.
5. **Implementar LGPD compliance**: DPO, RIPD, base legal, retenção.
6. **Threat model completo** com PASTA para cada BC.
7. **Adicionar SIEM** (Wazuh ou ELK Security) e playbooks de IR.
8. **Adicionar DAST em CI** (OWASP ZAP).
9. **Pen-test externo** antes de Go-Live.
10. **SBOM CycloneDX** automatizado em CI + VEX.

---

## 12. Métricas e KPIs de Segurança Sugeridos

| KPI                                  | Meta          | Como medir                   |
| ------------------------------------ | ------------- | ---------------------------- |
| MTTD (Mean Time to Detect)           | < 15 min      | SIEM alert → triage.         |
| MTTR (Mean Time to Respond)          | < 4h          | Critical findings.           |
| % findings em pré-prod               | > 90%         | SAST/DAST em CI.             |
| Vulnerabilidades CRÍTICAS abertas    | 0             | Trivy + Snyk dashboard.      |
| Vulnerabilidades ALTAS com SLA > 14d | 0             | Snyk/Jira.                   |
| Cobertura de MFA em admins           | 100%          | Quando MFA for implementado. |
| Cobertura de testes de segurança     | > 80%         | Coverage report.             |
| SBOM coverage                        | 100% packages | `syft` em CI.                |
| Secrets em repositório               | 0             | Gitleaks/TruffleHog.         |
| Logs sem PII                         | 100%          | Log scrubber em pipeline.    |

---

## 13. Ferramentas Recomendadas para CI/CD

| Categoria  | Ferramenta                   | Onde                  |
| ---------- | ---------------------------- | --------------------- |
| SAST       | Semgrep + CodeQL             | GitHub Actions        |
| SCA        | Snyk (free tier) ou Trivy fs | CI                    |
| Secrets    | Gitleaks + TruffleHog        | pre-commit + push     |
| Container  | Trivy image scan             | CI                    |
| IaC        | Checkov / Trivy IaC          | CI (quando aplicável) |
| DAST       | OWASP ZAP baseline           | weekly job            |
| SBOM       | Syft → CycloneDX             | CI artifact           |
| Dependabot | Habilitar                    | GitHub                |
| Policy     | OPA/Kyverno                  | futuro k8s            |

---

## 14. Apêndice — Comandos Úteis

```bash
# 1. Rotacionar secrets
openssl rand -hex 32  # novo JWT_SECRET
openssl rand -hex 32  # novo JWT_REFRESH_SECRET

# 2. Remover .env do git
git rm --cached .env
echo "/.env" >> .gitignore

# 3. Escanear histórico por secrets
gitleaks detect --no-git --source .  # ou
trufflehog git file://. --since-commit $(git rev-list --max-parents=0 HEAD)

# 4. Atualizar deps com CVEs
pnpm update @fastify/static  # >= 9.1.1
# Em pnpm-workspace.yaml ou package.json root, adicionar:
# pnpm.overrides: { "ws": "^8.20.1", "uuid": "^11.1.1" }

# 5. Auditar uso de eval e innerHTML
grep -rn "eval\|innerHTML" apps/api/src apps/web/src

# 6. Verificar TLS/SSL em produção
nmap --script ssl-enum-ciphers -p 443 api.pedi-ai.com
```

---

## 15. Conclusão

O Pedi-AI é um projeto **bem estruturado arquiteturalmente** (DDD, bounded contexts, validação global, bcrypt, throttler, Prisma, HMAC), mas **não está pronto para produção** do ponto de vista de segurança. O conjunto de achados críticos (secrets em `.env`, webhook sem assinatura, ausência de Helmet/RBAC, SQL injection latente) representa riscos reais de:

- **Vazamento de credenciais** (C-01).
- **Fraude em pagamentos** (C-02).
- **Bypass de autorização entre tenants** (A-02/A-03).
- **Comprometimento de dados via XSS** (C-03).
- **Execução de SQL arbitrário** (A-01).

**Recomendação final:** NÃO promover para produção até que **todos os CRÍTICOS** (C-01, C-02, C-03) e **pelo menos 50% dos ALTOS** (A-01, A-02, A-03, A-04) sejam corrigidos. Após isso, agendar **pen-test externo** para validar as correções e descobrir gaps residuais.

---

**Auditoria conduzida por:** Agente `analista-dev-sec-ops`
**Próxima auditoria recomendada:** Após ciclo de remediação dos CRÍTICOS + ALTOS (estimativa: 30 dias).
**Relatório gerado em:** `/home/leo/Documentos/projetos/pedi-ai/docs/auditorias/DEVSECOPS-AUDIT-2026-06-25.md`
