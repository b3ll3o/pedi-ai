# Proposal — Feature Flags Runtime (DB-backed)

> **Status:** Proposta (não-aprovada) · **Data:** 2026-06-26 · **Owner:** Time Admin · **BC destino:** `admin`
> **Slug:** `feature-flags-runtime` · **Mudança de baseline:** sim, novo agregado no BC `admin`.

---

## 1. Contexto

O Pedi-AI hoje usa **feature flags como variáveis de ambiente** (`NEXT_PUBLIC_FEATURE_*`), avaliadas em build time e congeladas no bundle do front. Existem **8 flags** definidas em `apps/web/src/lib/feature-flags.ts`, sendo que apenas `isMultiRestaurantEnabled()` é de fato consumida (em 11 use cases do BC `admin` — `apps/web/src/application/admin/services/*UseCase.ts`).

Esse modelo bloqueia três capacidades críticas para o roadmap:

1. **Rollout gradual por usuário ou restaurante** — útil para validar pagamento PIX e modo garçom em um subconjunto de tenants sem deploy.
2. **Rollback sem deploy** — desligar uma flag problemática (ex.: `cashback`) em produção sem precisar de nova release.
3. **Observabilidade e auditoria** — saber **quem** mudou **qual** flag **quando** (hoje, mudança de env exige redeploy e fica opaca para o time).

O resultado é que cada nova feature precisa esperar um ciclo de release inteiro (build + redeploy + invalidação de cache CDN) para chegar a 100% dos tenants, e o gating por restaurante é impossível.

---

## 2. Por que existe

Construir um **sistema de feature flags runtime, DB-backed, com overrides por escopo e propagação por polling** hospedado no BC `admin`. A operação é feita pelo `owner` (CRUD) e auditada (RF-ADM-13 já planejado). O `manager` consome para leitura e auditoria. O cliente (front Next.js) lê via SDK único tipado, com fallback gracioso para env-var.

### Objetivos mensuráveis

- Reduzir tempo de **toggle de flag em produção** de **~15 min** (redeploy) para **< 30 s** (mudança em UI admin + próximo poll).
- Permitir **rollout percentual** (0-100%) por restaurante e por usuário.
- Manter **latência de avaliação p99 < 5 ms (cache hit)** e **< 50 ms (cache miss)** — gate explícito em `RNF-PERF-FF-01`.
- Garantir **resiliência a falha de DB/Redis**: quando a stack de flag está fora, o app **continua funcionando** com env-var legado (RNF-AVAIL-FF-01).

### Não-objetivos (explícitos)

- Não substituir a infraestrutura de **config estática** (`/config/app.config.ts`).
- Não cobrir **experimentos A/B** com métricas estatísticas — fora de roadmap.
- Não substituir **feature toggles em código** (branches estáticos por build flavor).

---

## 3. Alternativas consideradas

| Alternativa                         | Custo (anual)      | Tempo até 1ª flag | Multi-tenant | Targeting       | Audit        | Hospedagem | Veredicto                                                                                                        |
| ----------------------------------- | ------------------ | ----------------- | ------------ | --------------- | ------------ | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| **LaunchDarkly** SaaS               | ~US$ 20k+ / ano    | 1-2 semanas       | Sim          | Avançado        | Nativo       | externa    | Rejeitado (custo + dado de flag sai do nosso DB; LGPD).                                                          |
| **ConfigCat** SaaS                  | ~US$ 10k+ / ano    | 1 semana          | Sim          | Bom             | Nativo       | externa    | Rejeitado (mesmo motivo).                                                                                        |
| **Unleash self-hosted**             | infra + manutenção | 2-3 semanas       | Sim          | Bom             | Plugin       | própria    | Rejeitado (sobrepeso para 8 flags iniciais; cultura de "menos ops").                                             |
| **Postgres + polling simples**      | ~infra existente   | 1-2 sprints       | Sim          | Bom (3 escopos) | custom (nós) | própria    | **Escolhido** — alinhado ao DDD em andamento, sem novo serviço, auditoria caseira, evolui para Redis/LRU depois. |
| **Env-var + redeploy** (status quo) | R$ 0               | imediato          | Não          | Não             | Não          | própria    | Rejeitado (bloqueia roadmap de rollout por tenant).                                                              |

A escolha por **construir internamente** está alinhada à estratégia "menos dependências SaaS caras, mais domínio próprio" já presente no BC `admin` (papéis customizados sem enum, auditoria caseira prevista em `RF-ADM-13`).

---

## 4. Decisão proposta

Adicionar um novo agregado **`FeatureFlag`** dentro do BC `admin` (em `apps/api/src/domain/admin/feature-flags/`), com:

- 3 modelos Prisma: `FeatureFlag`, `FeatureFlagOverride`, `FeatureFlagAuditLog`.
- 8 endpoints REST sob `/api/v1/admin/feature-flags` com RBAC `owner` (CRUD) e `manager` (read + audit).
- Endpoint público `/evaluate` para o front e SDK server-side consultarem.
- Cache **Redis + LRU in-process fallback**, TTL 60s.
- Avaliação com **precedência**: `USER(restaurantId+userId) > RESTAURANT(restaurantId) > USER(userId) > GLOBAL > defaultValue`.
- Híbrido com env-var legado: DB precede; se DB indisponível ou flag não cadastrada, cai para `process.env.NEXT_PUBLIC_FEATURE_*` (compat layer em `apps/web/src/lib/feature-flags.ts`).
- Polling HTTP de **30 s** no front, com **FeatureFlagProvider** (React context) e hook tipado `useFeatureFlag(key)`.
- Audit log + métricas Prometheus (`feature_flag_evaluations_total`, `feature_flag_cache_hits_total`).

### Por que hospedar no BC `admin` (e não criar `feature-flags/` separado)?

- O owner é quem opera; a auditoria já é um requisito do BC.
- Evita criar um novo BC para um agregado pequeno (3 tabelas) — **subdomínio core**, mas com **modelagem simples o suficiente para ficar em `admin`**.
- Migrar para `feature-flags/` próprio só se passar de ~10 tabelas ou ganhar um time dedicado.

---

## 5. Quem usa (personas)

| Persona       | Necessidade                                                                       |
| ------------- | --------------------------------------------------------------------------------- |
| `owner`       | Criar, desativar, configurar overrides e rollouts. Visualizar audit log.          |
| `manager`     | Ler flags e audit log. Sem permissão de mutação (segregação de обязанностей).     |
| `staff`       | Indireto — usuário da feature, não da flag.                                       |
| Cliente (dev) | SDK `useFeatureFlag(key)` no front e `FeatureFlagEvaluator.evaluate()` no server. |

---

## 6. Escopo (RF cobertos)

Veja [`design.md`](./design.md) para a lista canônica e detalhamento por RF.

- `RF-ADM-FF-01` Listar flags (visão admin).
- `RF-ADM-FF-02` Obter flag por chave.
- `RF-ADM-FF-03` Criar flag.
- `RF-ADM-FF-04` Atualizar flag (toggle on/off, defaultValue, descrição).
- `RF-ADM-FF-05` Adicionar override (escopo GLOBAL / RESTAURANT / USER, valor, rollout %).
- `RF-ADM-FF-06` Remover override.
- `RF-ADM-FF-07` Listar overrides de uma flag.
- `RF-ADM-FF-08` Avaliar flags (resolver valor final respeitando precedência).
- `RF-ADM-FF-09` Visualizar audit log de uma flag.
- `RF-ADM-FF-10` Painel admin de feature flags (UI Next.js com tabela, toggle, modal de override).

### RNFs

- `RNF-PERF-FF-01` — `evaluate()` p99 < 5 ms (cache hit) e < 50 ms (cache miss).
- `RNF-AVAIL-FF-01` — Queda de Postgres ou Redis **MUST NOT** derrubar o app; fallback env-var.
- `RNF-SEC-FF-01` — Apenas `owner` cria/atualiza flags e overrides; `manager` lê.
- `RNF-I18N-FF-01` — Mensagens de erro e UI em pt-BR.
- `RNF-MAINT-FF-01` — SDK único tipado compartilhado entre server e client.
- `RNF-RELI-FF-01` — Toda mutação em flag ou override gera entrada imutável em `FeatureFlagAuditLog` (FK `onDelete: Cascade` para garantir limpeza).

---

## 7. Fora de Escopo

- **Experimentos A/B** com cálculo de significância estatística — sem RF; ficar para depois se houver demanda.
- **SDK mobile nativo** (iOS/Android) — sem RF; usar o REST `/evaluate` se necessário.
- **Auto-refresh por WebSocket** para o front — fora do escopo (polling 30 s é suficiente para 8 flags).
- **Versionamento de flag** (manter N valores anteriores) — fora; basta o último.
- **Webhooks de mudança** para integrações externas — fora.
- **Importação em massa via CSV** — fora.

---

## 8. Riscos e Mitigações

| Risco                                                                | Probabilidade | Impacto | Mitigação                                                                                 |
| -------------------------------------------------------------------- | ------------- | ------- | ----------------------------------------------------------------------------------------- |
| **Stale cache** — front serve flag antiga até próximo poll (≤ 30 s). | Alta          | Médio   | Documentar no painel admin: "propagação pode levar até 30 s". Adicionar métrica de idade. |
| **Rollout % não determinístico** entre instâncias do front.          | Média         | Baixo   | Usar hash determinístico de `userId` (FNV-1a) módulo 100, logado em audit.                |
| **Erro de RBAC** — `manager` consegue editar flag.                   | Média         | Alto    | Teste E2E dedicado a RBAC; `RNF-SEC-FF-01` MUST; `Guard` em NestJS.                       |
| **Queda de DB derruba checkout** se fallback falhar.                 | Baixa         | Crítico | `RNF-AVAIL-FF-01` MUST: fallback env-var testado em CI com DB desligado; circuit breaker. |
| **Cache poisoning** por chave Redis colidindo com outro módulo.      | Baixa         | Médio   | Prefixo `ff:` em todas as chaves Redis; namespace isolado.                                |
| **Audit log cresce sem controle** e custa caro no Postgres.          | Média         | Médio   | Particionar por `createdAt` (por trimestre) em migration futura; manter índices.          |
| **Dependência do SDK no bundle do front aumenta LCP**.               | Baixa         | Baixo   | Tree-shaking; SDK expõe só `useFeatureFlag` no entry point do front.                      |

---

## 9. Plano de Rollout (alto nível)

Detalhamento passo-a-passo em [`tasks.md`](./tasks.md).

- **F1 — Foundation** (S, 1 sprint): BC + Prisma + repositório + CRUD REST + cache + seed das 8 flags. **Não** muda comportamento de nenhuma flag em produção ainda.
- **F2 — Targeting** (M, 1 sprint): endpoints de override + `FeatureFlagEvaluator` + rollout %. Mantém fallback env-var ativo.
- **F3 — SDK cliente** (M, 1 sprint): `FeatureFlagClient` (polling 30 s) + `FeatureFlagProvider` (React) + hook `useFeatureFlag`. Compat shim em `apps/web/src/lib/feature-flags.ts`.
- **F4 — UI admin** (M, 1 sprint): painel em `/admin/feature-flags` (tabela, toggle, modal de override, audit log viewer).
- **F5 — Observabilidade** (S, 0.5 sprint): métricas Prometheus + audit log queries + dashboards Grafana.

**Critério de go-live** (entrega de F4): o `owner` consegue **ligar/desligar** uma flag (ex.: `isPixEnabled`) via UI admin e o efeito é visível para um restaurante específico **em até 30 s**, com entrada no audit log.

---

## 10. Dependências

- **Internas**: BC `admin` (RBAC, papéis), BC `autenticacao` (sessão para UI), Prisma 6, Redis 7, OpenTelemetry.
- **Externas**: nenhuma. Decisão consciente de não usar SaaS.
- **Bloqueios para início**: nenhum. Pode começar após aprovação desta proposta.

---

## 11. Referências

- `.openspec/AGENTS.md` §6-7 — comentários `@spec` e RTM.
- `.openspec/specs/admin/design.md` — BC admin.
- `.openspec/specs/autenticacao/design.md` — referência de template.
- `apps/web/src/lib/feature-flags.ts` — estado atual.
- `apps/web/src/application/admin/services/*UseCase.ts` — 11 consumidores atuais de `isMultiRestaurantEnabled`.
- `apps/api/prisma/schema.prisma` — convenções de model.
- Roadmap interno: rollout por tenant (Q3/2026), auditoria admin (Q1/2027).
