# Design — `admin`

---

## 1. Visão Geral

```
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

---

## 3. Decisões de Design

- **Por que soft-delete (`deletedAt`)?** — Preservar integridade referencial de pedidos históricos. Ver `docs/guides/SOFT_DELETE.md`.
- **Por que papel como string e não enum?** — Permite adicionar papéis customizados sem migration.
- **Por que multi-restaurante gated por flag?** — Reduz superfície de bug; habilita gradualmente.

---

## 4. Próximos Requisitos

| ID          | Descrição                                        | Quarter alvo |
| ----------- | ------------------------------------------------ | ------------ |
| `RF-ADM-12` | Cobrança recorrente automatizada (MP, planejado) | Q4/2026      |
| `RF-ADM-13` | Auditoria (log de ações admin, planejado)        | Q1/2027      |

---

## 5. RTM (trecho)

A RTM completa é regenerada por `pnpm rtm`. Resumo:

| Status                  | RFs                                |
| ----------------------- | ---------------------------------- |
| ✅ Done                 | 01, 02, 03, 04, 05, 06, 07, 08, 10 |
| 🟡 Partial              | 11                                 |
| 🔴 Missing              | —                                  |
| 🟡 Planejado (sem flag) | 09                                 |
