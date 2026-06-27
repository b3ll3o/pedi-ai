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

| ID          | Descrição                                           | Materialização (código)                                            | Status       |
| ----------- | --------------------------------------------------- | ------------------------------------------------------------------ | ------------ |
| `RF-ADM-01` | Criar restaurante                                   | `CriarRestauranteUseCase.ts`                                       | ✅ Done      |
| `RF-ADM-02` | Atualizar configurações                             | `AtualizarRestauranteUseCase.ts`                                   | ✅ Done      |
| `RF-ADM-03` | Vincular usuário (com papel)                        | `VincularUsuarioRestauranteUseCase.ts`                             | ✅ Done      |
| `RF-ADM-04` | Desvincular usuário                                 | `DesvincularUsuarioRestauranteUseCase.ts`                          | ✅ Done      |
| `RF-ADM-05` | Listar equipe                                       | `ListarEquipeRestauranteUseCase.ts`                                | ✅ Done      |
| `RF-ADM-06` | Alterar papel                                       | `AlterarPapelUsuarioRestauranteUseCase.ts`                         | ✅ Done      |
| `RF-ADM-07` | Desativar restaurante (soft-del)                    | `DesativarRestauranteUseCase.ts`                                   | ✅ Done      |
| `RF-ADM-08` | Reativar restaurante                                | `ReativarRestauranteUseCase.ts`                                    | ✅ Done      |
| `RF-ADM-09` | Multi-restaurante (trocar ativo, planejado Q4/2026) | `TrocarRestauranteAtivoUseCase.ts` (gate: `MULTI_RESTAURANT=true`) | 🟡 Planejado |
| `RF-ADM-10` | Analytics                                           | `apps/api/src/analytics/` + `/admin/analytics`                     | ✅ Done      |
| `RF-ADM-11` | Gerenciar assinatura                                | `apps/api/src/subscriptions/` (legado)                             | 🟡 Partial   |

> `RF-ADM-09` está **planejado Q4/2026**: a flag `NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT=false` por padrão em `.env` indica que o caminho de código é validado em CI mas **não exposto** em produção.

### 2.1 Subdomínio Feature Flags (RF-ADM-FF-\*)

Visão consolidada do subdomínio **Feature Flags Runtime**, proposto em
`.openspec/changes/feature-flags-runtime/` (proposta não-aprovada ainda;
detalhamento completo vive na change e **MUST** ser consultado antes de
implementação). Hospedado no BC `admin` por decisão de escopo
(`admin/design.md` §3 atualizada abaixo).

| ID             | Descrição                                            | Status inicial |
| -------------- | ---------------------------------------------------- | -------------- |
| `RF-ADM-FF-01` | Listar feature flags (visão admin)                   | 🔴 Missing     |
| `RF-ADM-FF-02` | Obter feature flag por chave                         | 🔴 Missing     |
| `RF-ADM-FF-03` | Criar feature flag                                   | 🔴 Missing     |
| `RF-ADM-FF-04` | Atualizar feature flag (toggle on/off, defaultValue) | 🔴 Missing     |
| `RF-ADM-FF-05` | Adicionar override (GLOBAL / RESTAURANT / USER)      | 🔴 Missing     |
| `RF-ADM-FF-06` | Remover override                                     | 🔴 Missing     |
| `RF-ADM-FF-07` | Listar overrides de uma flag                         | 🔴 Missing     |
| `RF-ADM-FF-08` | Avaliar flags (precedência + rollout %)              | 🔴 Missing     |
| `RF-ADM-FF-09` | Visualizar audit log                                 | 🔴 Missing     |
| `RF-ADM-FF-10` | Painel admin (`/admin/feature-flags`)                | 🔴 Missing     |

**RNFs do subdomínio:** `RNF-PERF-FF-01` (p99 < 5 ms cache hit), `RNF-AVAIL-FF-01`
(fallback env-var em falha de DB/Redis), `RNF-SEC-FF-01` (RBAC owner=CRUD,
manager=read+audit), `RNF-I18N-FF-01` (pt-BR), `RNF-MAINT-FF-01` (SDK único
tipado), `RNF-RELI-FF-01` (audit log atômico).

> Esta subseção é **forward-looking**: a tabela permanece em `🔴 Missing`
> até que `.openspec/changes/feature-flags-runtime/` seja mergeada e a RTM
> regenerada aponte progresso. Detalhes de precedência, schema, contratos
> de API e cenários BDD estão em
> `.openspec/changes/feature-flags-runtime/design.md` — não duplicar aqui.

---

## 3. Decisões de Design

- **Por que soft-delete (`deletedAt`)?** — Preservar integridade referencial de pedidos históricos. Ver `docs/guides/SOFT_DELETE.md`.
- **Por que papel como string e não enum?** — Permite adicionar papéis customizados sem migration.
- **Por que multi-restaurante gated por flag?** — Reduz superfície de bug; habilita gradualmente.
- **Por que hospedar o subdomínio Feature Flags neste BC (e não em `feature-flags/` próprio)?** — O agregado tem apenas 3 tabelas, é operado pelo `owner` e auditado (alinhado a `RF-ADM-13`). Criar um novo BC só se passar de ~10 tabelas ou ganhar time dedicado. Mudança proposta em `.openspec/changes/feature-flags-runtime/proposal.md §4`.

---

## 4. Próximos Requisitos

| ID          | Descrição                                        | Quarter alvo |
| ----------- | ------------------------------------------------ | ------------ |
| `RF-ADM-12` | Cobrança recorrente automatizada (MP, planejado) | Q4/2026      |
| `RF-ADM-13` | Auditoria (log de ações admin, planejado)        | Q1/2027      |

---

## 5. RTM (trecho)

A RTM completa é regenerada por `pnpm rtm`. Resumo:

| Status                  | RFs                                       |
| ----------------------- | ----------------------------------------- |
| ✅ Done                 | 01, 02, 03, 04, 05, 06, 07, 08, 10        |
| 🟡 Partial              | 11                                        |
| 🔴 Missing              | RF-ADM-FF-01..10 (vide change FF-runtime) |
| 🟡 Planejado (sem flag) | 09                                        |
