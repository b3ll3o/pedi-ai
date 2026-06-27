# Design — `admin`

---

## 1. Visão Geral

```text
Owner/Manager ─→ AdminUseCases ─→ RestauranteRepository (Postgres + Dexie)
                          ↓
                  UsuarioRestaurante (vínculo N:N + papel)
                          ↓
                  Assinatura (subscription tier)
```

---

## 2. Requisitos Funcionais (RF-ADM)

| ID          | Descrição                                           | Materialização (código)                               | Status       |
| ----------- | --------------------------------------------------- | ----------------------------------------------------- | ------------ |
| `RF-ADM-01` | Criar restaurante                                   | `CriarRestauranteUseCase.ts`                          | ✅ Done      |
| `RF-ADM-02` | Atualizar configurações                             | `AtualizarRestauranteUseCase.ts`                      | ✅ Done      |
| `RF-ADM-03` | Vincular usuário (com papel)                        | `VincularUsuarioRestauranteUseCase.ts`                | ✅ Done      |
| `RF-ADM-04` | Desvincular usuário                                 | `DesvincularUsuarioRestauranteUseCase.ts`             | ✅ Done      |
| `RF-ADM-05` | Listar equipe                                       | `ListarEquipeRestauranteUseCase.ts`                   | ✅ Done      |
| `RF-ADM-06` | Alterar papel                                       | `AlterarPapelUsuarioRestauranteUseCase.ts`            | ✅ Done      |
| `RF-ADM-07` | Desativar restaurante (soft-del)                    | `DesativarRestauranteUseCase.ts`                      | ✅ Done      |
| `RF-ADM-08` | Reativar restaurante                                | `ReativarRestauranteUseCase.ts`                       | ✅ Done      |
| `RF-ADM-09` | Multi-restaurante (trocar ativo, planejado Q4/2026) | — (gate: `NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT=false`) | 🟡 Planejado |
| `RF-ADM-10` | Analytics                                           | `apps/api/src/analytics/` + `/admin/analytics`        | ✅ Done      |
| `RF-ADM-11` | Gerenciar assinatura                                | `apps/api/src/subscriptions/` (legado)                | 🟡 Partial   |

> `RF-ADM-09` está **planejado Q4/2026**: a flag `NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT=false` por padrão em `.env` indica que o caminho de código é validado em CI mas **não exposto** em produção.

### 2.1 Subdomínio Feature Flags (RF-ADM-FF-\*)

Subdomínio **Feature Flags Runtime** consolidado em `admin/`. Proposta
original em `.openspec/changes/feature-flags-runtime/` (merge concluído
em `master`). Hospedagem neste BC mantida por decisão de escopo —
vide `§3`.

| ID             | Descrição                                            | Status  | Materialização                                                                                                                                  |
| -------------- | ---------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `RF-ADM-FF-01` | Listar feature flags (visão admin)                   | ✅ Done | `apps/api/src/application/admin/feature-flags/use-cases/ListarFeatureFlagsUseCase.ts` (`@spec(RF-ADM-FF-01)`)                                   |
| `RF-ADM-FF-02` | Obter feature flag por chave                         | ✅ Done | `apps/api/src/application/admin/feature-flags/use-cases/ObterFeatureFlagUseCase.ts` (`@spec(RF-ADM-FF-02)`)                                     |
| `RF-ADM-FF-03` | Criar feature flag                                   | ✅ Done | `apps/api/src/application/admin/feature-flags/use-cases/CriarFeatureFlagUseCase.ts` (`@spec(RF-ADM-FF-03)`)                                     |
| `RF-ADM-FF-04` | Atualizar feature flag (toggle on/off, defaultValue) | ✅ Done | `apps/api/src/application/admin/feature-flags/use-cases/AtualizarFeatureFlagUseCase.ts` (`@spec(RF-ADM-FF-04)`)                                 |
| `RF-ADM-FF-05` | Adicionar override (GLOBAL / RESTAURANT / USER)      | ✅ Done | `apps/api/src/application/admin/feature-flags/use-cases/AdicionarOverrideUseCase.ts` (`@spec(RF-ADM-FF-05)`)                                    |
| `RF-ADM-FF-06` | Remover override                                     | ✅ Done | `apps/api/src/application/admin/feature-flags/use-cases/RemoverOverrideUseCase.ts` (`@spec(RF-ADM-FF-06)`)                                      |
| `RF-ADM-FF-07` | Listar overrides de uma flag                         | ✅ Done | `apps/api/src/application/admin/feature-flags/use-cases/ListarOverridesUseCase.ts` (`@spec(RF-ADM-FF-07)`)                                      |
| `RF-ADM-FF-08` | Avaliar flags (precedência + rollout %)              | ✅ Done | `apps/api/src/application/admin/feature-flags/use-cases/AvaliarFeatureFlagUseCase.ts` + `services/FeatureFlagEvaluator` (`@spec(RF-ADM-FF-08)`) |
| `RF-ADM-FF-09` | Visualizar audit log                                 | ✅ Done | `apps/api/src/application/admin/feature-flags/use-cases/ListarAuditLogUseCase.ts` (`@spec(RF-ADM-FF-09)`)                                       |
| `RF-ADM-FF-10` | Painel admin (`/admin/feature-flags`)                | ✅ Done | `apps/web/src/components/admin/feature-flags/PainelFeatureFlags.tsx` + `TabelaFeatureFlags`, `ModalOverrideFeatureFlag`, `AuditLogViewer`       |

**RNFs do subdomínio:**

| ID                | Métrica                                                              | Status  |
| ----------------- | -------------------------------------------------------------------- | ------- |
| `RNF-PERF-FF-01`  | `evaluate()` p99 < 5 ms (cache hit) e < 50 ms (cache miss)           | ✅ Done |
| `RNF-AVAIL-FF-01` | Fallback env-var quando DB/Redis indisponível                        | ✅ Done |
| `RNF-SEC-FF-01`   | RBAC: `owner` CRUD; `manager` leitura + audit; `staff` sem acesso    | ✅ Done |
| `RNF-I18N-FF-01`  | Mensagens de erro e UI em pt-BR                                      | ✅ Done |
| `RNF-MAINT-FF-01` | SDK único tipado `@pedi-ai/feature-flags` consumido por front e back | ✅ Done |
| `RNF-RELI-FF-01`  | Audit log imutável em transação Prisma atômica                       | ✅ Done |

Detalhes de precedência, schema, contratos de API e cenários BDD estão
em `.openspec/changes/feature-flags-runtime/design.md` (mantido como
histórico da decisão). Guia operacional para owner/manager/dev em
[`docs/guides/FEATURE_FLAGS.md`](../../../docs/guides/FEATURE_FLAGS.md).

---

## 3. Decisões de Design

- **Por que soft-delete (`deletedAt`)?** — Preservar integridade referencial de pedidos históricos. Ver `docs/guides/SOFT_DELETE.md`.
- **Por que papel como string e não enum?** — Permite adicionar papéis customizados sem migration.
- **Por que multi-restaurante gated por flag?** — Reduz superfície de bug; habilita gradualmente.
- **Por que hospedar o subdomínio Feature Flags neste BC (e não em `feature-flags/` próprio)?** — O agregado tem apenas 3 tabelas, é operado pelo `owner` e auditado (alinhado a `RF-ADM-13`). Criar um novo BC só se passar de ~10 tabelas ou ganhar time dedicado. Decisão original em `.openspec/changes/feature-flags-runtime/proposal.md §4` (merge concluído).

---

## 4. Próximos Requisitos

| ID          | Descrição                                        | Quarter alvo |
| ----------- | ------------------------------------------------ | ------------ |
| `RF-ADM-12` | Cobrança recorrente automatizada (MP, planejado) | Q4/2026      |
| `RF-ADM-13` | Auditoria (log de ações admin, planejado)        | Q1/2027      |

---

## 5. RTM (trecho)

A RTM completa é regenerada por `pnpm rtm`. Resumo:

| Status                  | RFs                                                                  |
| ----------------------- | -------------------------------------------------------------------- |
| ✅ Done                 | 01, 02, 03, 04, 05, 06, 07, 08, 10, RF-ADM-FF-01..10                 |
| 🟡 Partial              | 11 (assinatura — módulo legado)                                      |
| 🟡 Planejado (sem flag) | 09 (multi-restaurante, agora gateado por `multi_restaurant_enabled`) |
| 🔴 Missing              | —                                                                    |

RNFs do subdomínio feature flags: `RNF-PERF-FF-01`, `RNF-AVAIL-FF-01`,
`RNF-SEC-FF-01`, `RNF-I18N-FF-01`, `RNF-MAINT-FF-01`, `RNF-RELI-FF-01` —
todos ✅ Done.
