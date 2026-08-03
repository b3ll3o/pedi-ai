# Cobertura E2E por Categoria — Auditoria 2026-08-03

> Snapshot da investigação do **front 3** do `/goal` de 2026-08-03. Este
> documento substitui a versão anterior com apenas a tabela — agora
> cada categoria tem achados concretos, referências `arquivo:linha` e
> próximos passos verificáveis.
>
> Os fronts 1 e 2 estão resolvidos (ver
> [`docs/plans/A11Y-VALIDATION-2026-08-03.md`](./A11Y-VALIDATION-2026-08-03.md)).

## Sumário executivo

| Categoria             | Spec files | Testes | Status efetivo  | Achado crítico                                       |
| --------------------- | ---------- | ------ | --------------- | ---------------------------------------------------- |
| multi-tenant security | 1          | 13     | ⚠️ fraco        | 1 teste usa placeholder `rest_other_seed`            |
| referral              | 1          | 16     | ✅ ativo        | `apiClient` referral stubs são temporários           |
| onboarding            | 1          | 6      | ⚠️ smoke-only   | Faltam regressões para refresh e back-button         |
| billing               | 1          | 9      | ⚠️ webhook mock | Asaas é mockada — divergência potencial pós-refactor |
| lgpd                  | 3          | 9      | ✅ ativo        | Backend tem 7 itens priorizados                      |
| analytics             | 1 (admin/) | 8      | 🚫 8/8 skip     | UI testada depende de massa de pedidos no seed       |
| feature-flags (admin) | 2          | 14     | ✅ ativo        | Auditoria completa (RBAC + propagação + audit)       |
| qr-codes (admin)      | 1          | 11     | ✅ ativo        | Validação cobre apenas `/admin`; falta customer path |

Total: **86 testes** mapeados; **2 issues** abertos (#76 analytics, #77 LGPD);
**3 achados novos** abaixo levam a issues adicionais.

---

## Investigação por categoria

### 1. Multi-tenant security (BOLA) — ⚠️ testes com placeholder

**Arquivos:**

- [`apps/web/tests/e2e/tests/security/multitenant.spec.ts`](../../apps/web/tests/e2e/tests/security/multitenant.spec.ts) — 13 testes.
- [`apps/api/src/restaurants/restaurants.service.ts:121`](../../apps/api/src/restaurants/restaurants.service.ts#L121) — filtro multi-tenant em queries (`where: { restaurantId: { in: restaurantIds } }`).

**Cobertura mapeada (13 testes):**

1. `admin do Restaurante A NÃO deve ver pedidos do Restaurante B`
2. `IDOR: tentar acessar pedido de outro restaurante via UUID na URL deve falhar`
3. `Token de um restaurante NÃO deve funcionar em rotas de outro`
4. `admin NÃO deve conseguir criar recurso para outro restaurante`
5. `admin NÃO deve conseguir ATUALIZAR produto de outro restaurante`
6. `admin NÃO deve conseguir DELETAR produto de outro restaurante`
7. `listagem de pedidos NÃO deve incluir pedidos de outros restaurantes`
8. `analytics NÃO devem incluir dados de outros restaurantes`
9. `usuário com múltiplos restaurantes vê APENAS dados dos seus`
10. `sem token, NÃO deve acessar nada`
11. `token inválido deve ser rejeitado`
12. `token expirado deve ser rejeitado`

**Achados:**

- **❌ Placeholder descobrindo bug latente:** teste 1 (linha 31) usa
  `restaurantBId = 'rest_other_seed'` como placeholder. O seed E2E em
  [`apps/web/tests/e2e/scripts/seed.ts`](../../apps/web/tests/e2e/scripts/seed.ts)
  não cria um segundo restaurante. O teste vai passar com qualquer
  resposta `403` ou `404`, mesmo que o backend esteja **vazando dados**
  do tenant A ao receber um ID `rest_other_seed` válido por happy
  accident. **Risco:** regressão multi-tenant real passaria neste
  teste.
- **❌ Token via localStorage:** linhas 40 e 51 leem
  `localStorage.getItem('pedi_auth_access_token')`. Após a refatoração
  para cookies HttpOnly (ver [`apps/web/src/lib/api-client.ts:9-14`](../../apps/web/src/lib/api-client.ts#L9-L14)),
  esse item **não existe mais em localStorage** (foi removido por
  vetor XSS). O teste está **utilizando um token vazio/undefined** e
  esperando `401/403` — passa acidentalmente, não está exercitando
  o caso real. **Bug real não seria pego.**
- **⚠️ Cobertura server-side:** os 12 testes dependem majoritariamente
  do front-end renderizar corretamente a lista. Um exploit BOLA
  puro-API (curl) não está coberto. Existe backend coverage em
  [`apps/api/src/restaurants/restaurants.service.ts`](../../apps/api/src/restaurants/restaurants.service.ts#L121)
  mas sem E2E direto.

**Ação concreta:**

- Issue a abrir: substituir `restaurantBId = 'rest_other_seed'` por um
  seed real de 2 restaurantes.
- Issue a abrir: trocar leitura `localStorage` por cookies via
  `page.context().cookies()`.
- Adicionar 1 teste puro-request com `curl`-style flow para validar
  BOLA server-side.

### 2. Referral — ✅ ativo (com stubs a resolver)

**Arquivos:**

- [`apps/web/tests/e2e/tests/referral/referral-flow.spec.ts`](../../apps/web/tests/e2e/tests/referral/referral-flow.spec.ts) — 16 testes.
- [`apps/web/src/lib/api-client.ts:378-442`](../../apps/web/src/lib/api-client.ts#L378-L442) — 4 métodos stub retornando mock.

**Cobertura mapeada (16 testes, principais):**

- Geração de código único, copy/whatsapp (3 testes)
- Banner signup verde/amarelo por código (2)
- Webhook PAYMENT_RECEIVED credita reward (1)
- Webhook duplicado idempotência (1)
- Assinatura webhook inválida → 401 (1)
- Auto-referral rejeitado (1)
- Código inválido/inexistente/cancelado (3)
- Após 3 conversões, reward = 1 mês (1)
- Customização de código + colisão (2)
- …(+2 miscelânea)

**Achados:**

- **✅ Cobertura de fluxo completa:** do signup até reward pós-pagamento
  com idempotência está bem coberto.
- **⚠️ Stubs temporários em produção:** métodos `getReferralByCode`,
  `getReferralByRestaurant`, `createReferral`, `updateReferralCode` em
  [`api-client.ts:378-442`](../../apps/web/src/lib/api-client.ts#L378-L442)
  retornam dados **mock hardcoded** (ex.: `referrerRestaurantId: 'unknown'`).
  Os testes E2E que batem no NestJS direto devem estar usando um helper
  diferente — confirmar se está mockado em test ou se existe versão real
  escondida em outro lugar.
- **⚠️ Sem cobertura unit** no domain `apps/web/src/domain/referral/`
  (achei só `Referral.ts`, `ReferralRepository.ts` — verificar se tem
  testes correspondentes).

**Ação concreta:**

- Localizar como os testes realmente batem no NestJS e remover os 4
  stubs do `api-client.ts` quando confirmar equivalência.
- Issue menor: confirmar cobertura unit no domain referral.

### 3. Onboarding Wizard — ⚠️ smoke-only

**Arquivos:**

- [`apps/web/tests/e2e/tests/onboarding/onboarding-wizard.spec.ts`](../../apps/web/tests/e2e/tests/onboarding/onboarding-wizard.spec.ts) — 6 testes.

**Cobertura (6 testes):**

1. Wizard completo: pizzaria → dados → template → sucesso
2. Botão "Continuar" desabilitado sem vertical
3. Step 2 bloqueia sem nome e CNPJ
4. Estado preservado após refresh (localStorage)
5. Botão Voltar entre steps
6. Template correto baseado na vertical

**Achados:**

- **⚠️ Sem regressões para erro de rede/validação:** se a API de
  template falhar mid-wizard, ou se o CNPJ já existir (registro
  duplicado), nenhum teste cobre.
- **⚠️ Sem cobertura dos fluxos de "pular"/"retomar"** após logout/login
  no meio do wizard (cenário comum para donos que voltam no dia seguinte).
- **✅ Boa cobertura do happy path e UX state machine.**

**Ação concreta:**

- Issue a abrir: 2-3 testes para `failure modes` (CNPJ duplicado,
  erro de rede no apply-template, wizard retomado após logout).

### 4. Billing / Subscription — ⚠️ webhook mockado

**Arquivos:**

- [`apps/web/tests/e2e/tests/billing/subscription.spec.ts`](../../apps/web/tests/e2e/tests/billing/subscription.spec.ts) — 9 testes.
- [`apps/api/src/payments/payments.service.ts`](../../apps/api/src/payments/payments.service.ts) — handler de webhook (precisa checar se mock substitui).

**Cobertura (9 testes):**

1. Status "Em Trial" com 14 dias restantes
2. Preços corretos R$ 49,90 / R$ 479 anual
3. Redirect checkout Asaas ao "Assinar Mensal"
4. Ativação após webhook pagamento confirmado
5. Idempotência webhook duplicado
6. Cancelar assinatura
7. Preço no body IGNORADO (server-side enforced)
8. Histórico de pagamentos
9. …(1 parcial)

**Achados:**

- **⚠️ Divergência potencial Asaas:** o teste
  [`subscription.spec.ts:65`](../../apps/web/tests/e2e/tests/billing/subscription.spec.ts#L65)
  espera URL de checkout Asaas. Após qualquer refactor da integração
  (API v3 → v4, mudança de parâmetros), este teste falha com mensagem
  genérica "redirect falhou".
- **✅ Server-side enforced pricing** (teste 7) é um ótimo teste de
  segurança — confiável.
- **⚠️ RNF não coberto:** SLA de uptime, retry de webhook, backoff
  exponencial — todos fora do escopo desta suíte.

**Ação concreta:**

- Issue a abrir: monitorar contrato da API Asaas e atualizar URL
  esperada via feature flag de teste (em vez de hardcoded).
- Melhoria: adicionar 1 teste de "webhook chega atrasado (após 30s) —
  ativação ainda funciona" (cenário real Asaas).

### 5. LGPD — ✅ ativo + backlog backend

**Arquivos:**

- [`apps/web/tests/e2e/tests/lgpd/`](../../apps/web/tests/e2e/tests/lgpd/) — 3 specs,
  9 testes no total.
- [`docs/plans/LGPD-BACKLOG-2026-08-03.md`](./LGPD-BACKLOG-2026-08-03.md) — 7 itens
  de backlog em 4 ondas.

**Cobertura (3 specs):**

- `logout.spec.ts` — purga IndexedDB no logout cliente
- `admin-logout.spec.ts` — mesmo para admin (espelho)
- `compliance.spec.ts` — fluxos diversos (consentimento, data export,
  anonymização via UI)

**Achados:**

- **✅ Cobertura E2E:** logout em ambos os caminhos está coberto.
  Compliance suite parece cobrir os principais artigos LGPD exercitados
  pela UI.
- **⚠️ Backend gaps:** o documento de backlog lista **7 itens**
  (T1.1 typo, T1.2 doc JSDoc, T1.3 ofuscar userId, T2.1 transaction,
  T2.2 cripto, T3.1 BOLA test, T4.1 specs tipados).
- **Issue #77 já aberto** cobre Onda 1.

**Ação concreta:**

- Nada novo no front E2E. Aguardar merge das ondas 1-2.

### 6. Analytics — 🚫 8/8 testes `test.skip`

**Arquivos:**

- [`apps/web/tests/e2e/tests/admin/analytics.spec.ts`](../../apps/web/tests/e2e/tests/admin/analytics.spec.ts) — 8 testes, todos `test.skip`.
- [`apps/web/tests/e2e/tests/analytics/dashboard.spec.ts`](../../apps/web/tests/e2e/tests/analytics/dashboard.spec.ts) — spec extra em pasta irmã.

**Achados:**

- **🚫 Cobertura efetiva zero:** o arquivo inteiro é skip. O
  comentário em [`analytics.spec.ts:17-18`](../../apps/web/tests/e2e/tests/admin/analytics.spec.ts#L17)
  diz "Analytics tests require existing order data that seed doesn't provide".
- **Issue #76 já aberto** cobre desbloquear com seed dedicado.

**Ação concreta:** nada novo até issue #76 fechar.

### 7. Feature Flags (admin) — ✅ ativo (modelo para o resto)

**Arquivos:**

- [`apps/web/tests/e2e/tests/admin/feature-flags.spec.ts`](../../apps/web/tests/e2e/tests/admin/feature-flags.spec.ts) — 7 testes funcionais.
- [`apps/web/tests/e2e/tests/admin/feature-flags-guard.spec.ts`](../../apps/web/tests/e2e/tests/admin/feature-flags-guard.spec.ts) — 7 testes de guarda/RBAC.
- [`apps/api/src/presentation/admin/feature-flags/`](../../apps/api/src/presentation/admin/feature-flags/) — backend completo DDD (domain/application/infra/presentation).

**Cobertura (14 testes):**

- **Funcionais:** lista de 8 flags, toggle global, override por restaurante,
  rollout 50/100, RBAC visual + backend para manager, audit log,
  propagação ≤30s para o cliente.
- **Guardas:** cliente (não-edita), manager (só-lê), sem token (401).

**Achados:**

- **✅ Cobertura mais madura do projeto.** Marca o padrão para as outras
  categorias migrarem para a estrutura domain/application/infra/presentation
  com testes em camadas.
- **⚠️ Negative path cache invalidation:** spec funcional não cobre
  o caso de override aplicado enquanto o cliente tem `/evaluate` aberto.
  Cenário real: usuário A cria override, usuário B ainda recebe o valor
  antigo (cache stale). Fora do escopo desta auditoria.
- **⚠️ Telemetria:** backend tem
  [`apps/api/src/infrastructure/admin/feature-flags/telemetry`](../../apps/api/src/infrastructure/admin/feature-flags/telemetry) —
  não há teste validando que métricas de avaliação estão sendo emitidas.

**Ação concreta:**

- Issue a abrir: teste de cache invalidation cross-client.
- Issue a abrir: teste de telemetria (1 happy-path verifica que
  `feature_flag_evaluation_total` incrementa).

### 8. QR Codes (admin) — ⚠️ só `admin/*`, sem customer path

**Arquivos:**

- [`apps/web/tests/e2e/tests/admin/table-qr.spec.ts`](../../apps/web/tests/e2e/tests/admin/table-qr.spec.ts) — 11 testes.
- [`apps/web/tests/e2e/tests/admin/tables.spec.ts`](../../apps/web/tests/e2e/tests/admin/tables.spec.ts) — coberto.
- [`apps/api/src/tables/qr-crypto.service.ts`](../../apps/api/src/tables/qr-crypto.service.ts) — HMAC-SHA256.

**Cobertura (11 testes):**

- Display/validate form, generate QR, download, link-to-menu, list/add/edit
  table, error for invalid code.

**Achados:**

- **✅ Cobertura admin completa** (CRUD + flow).
- **❌ Sem cobertura do caminho cliente `/mesa/[hash]`:** o hash HMAC-SHA256
  é validado em [`apps/web/src/lib/qr/validator.ts`](../../apps/web/src/lib/qr/validator.ts)
  mas nenhuma suite E2E testa que um cliente escaneia o QR e cai na
  página certa (`/menu?mesa=...`) com o restaurante correto.
- **⚠️ Sem teste de QR expirado/revogado:** se um restaurante é
  desativado, mesas com QR antigo continuam válidas? Não há teste.
- **⚠️ `QR_SECRET_KEY` configurability:** backend falha se não estiver
  configurado ([`tables.service.ts`](../../apps/api/src/tables/tables.service.ts)) —
  coberto implicitamente, mas sem teste E2E de fallback.

**Ação concreta:**

- Issue a abrir: 1-2 testes E2E do fluxo cliente-escaneia-QR.
- Issue a abrir: 1 teste de QR revogado (mesa deletada).

---

## Plano de ação consolidado

### Issues a abrir (3 novos, fora dos já #76/#77)

1. **Multi-tenant:** substituir `rest_other_seed` placeholder + trocar
   `localStorage` por `page.context().cookies()`. (1 PR, ~30min)
2. **Feature-flags:** telemetria + cache invalidation cross-client.
   (1 PR, ~1h)
3. **QR codes:** path do cliente + revoke. (1 PR, ~45min)

### Pendências já criadas

- **#76** — analytics E2E: remover 8 `test.skip`. (P2, ~1h30)
- **#77** — LGPD backend Onda 1. (P2, ~30min)

### Recomendação estrutural

A área de **feature-flags** é o **modelo** que as outras categorias
deveriam seguir:

- Suíte `*.spec.ts` com `test.describe` + `@tags`.
- Separação `*-guard.spec.ts` para RBAC.
- Backend em camadas DDD (domain/application/infrastructure/presentation).
- Helpers compartilhados em `tests/shared/`.

Categorias **onboarding, billing, multi-tenant** se beneficiariam de
refactor estrutural. Categoria **referral** já está perto (precisa
limpar stubs do `api-client`).

## Métricas de conclusão

- 0 `test.skip` em `analytics.spec.ts` (#76)
- LGPD Ondas 1-2 ✅ (#77 + ondas seguintes)
- Multi-tenant: `localStorage` removido + seed 2 restaurantes
- Feature-flags: telemetria testada
- QR-codes: caminho cliente testado

## Não-objetivos

- Não migrar onboarding/billing para DDD completo nesta sprint (refactor
  estrutural > escopo do front).
- Não cobrir Asaas/MP real (sempre mockado por design).

## Referências

- [`docs/plans/A11Y-VALIDATION-2026-08-03.md`](./A11Y-VALIDATION-2026-08-03.md)
- [`docs/plans/LGPD-BACKLOG-2026-08-03.md`](./LGPD-BACKLOG-2026-08-03.md)
- [`docs/guides/DDD_MIGRACAO_API.md`](../guides/DDD_MIGRACAO_API.md)
- [CLAUDE.md](../../CLAUDE.md)
