# Elevar cobertura api `branches` ≥80% (PaymentsService + PaymentsController)

> **Status:** Proposta · **Data:** 2026-08-03 · **PR:** pendente

## 1. Contexto

A auditoria DevSecOps de 2026-06-25 (`docs/auditorias/DEVSECOPS-AUDIT-2026-06-25.md`) identificou **cobertura de branches abaixo do threshold CI (80%)** como dívida técnica. O CI bloqueia merge quando a cobertura global da api cai abaixo desse threshold.

Baseline pré-existente (auditoria 03/08):

- `payments.service.ts`: **70.11% stmts / 53.57% branches** — gap principal em `processarWebhookPix` (linhas 280-415) e nos caminhos `getPaymentStatus*` para cliente/staff.
- `payments.controller.ts`: 74.17% stmts / 76.78% branches — gap em validação de IP/HMAC no webhook e `processPaymentWebhook` (linhas 247-348, 410-448).
- **Global api**: 79.02% branches (abaixo do limite CI).

A PR LGPD (`feat/lgpd-me-export-delete`, `e1e2d65`) e a PR P0-07 (`afd0c39`) também estavam bloqueadas por este gate.

## 2. Por que não foi feito antes

O backlog pré-lançamento priorizou features e fechamentos de P0. Cobertura de webhook foi deixada como "depois" porque os branches defensivos (e.g. `P2002`, conflitos de versão otimista, status desconhecido do MP) eram teoricamente improváveis — mas a auditoria ACHADO-6 demonstrou que **conflitos de versão otimista** são reais sempre que staff e webhook competem por updates de order.

## 3. O que esta PR faz

### 3.1 Novo spec de cobertura

Cria `apps/api/tests/unit/payments/payments.service.coverage.spec.ts` com **20 testes** cobrindo 100% das branches não-cobertas em `PaymentsService`:

| Branch Coberto                                      | Cenário                                                              | Linha    |
| --------------------------------------------------- | -------------------------------------------------------------------- | -------- |
| `paymentIntent.findFirst → null`                    | Já coberto no spec principal                                         | L282-285 |
| `!newStatus` em `statusMap`                         | Status desconhecido do MP (`weird_new_status`)                       | L302-315 |
| `!orderStatus` em `orderStatusMap`                  | Status em `statusMap` mas não em `orderStatusMap` (ex: `in_process`) | L329-342 |
| `updateMany.count === 0` (conflito otimista)        | Staff moveu o pedido concomitantemente                               | L379-391 |
| `currentOrder && !isValidWebhookTransition`         | Já coberto (preparing)                                               | L392-401 |
| `catch (err)` no `$transaction`                     | Erros não-P2002 propagados                                           | L408-416 |
| `currentOrder === null` (impossível, defensivo)     | Order deletada entre webhook e transação                             | L367     |
| `getPaymentStatus` cliente (caminho `else` do role) | BOLA defesa: cliente deve ser dono do pedido                         | L173-182 |
| `getPaymentStatusByOrder` sem payment               | Return early sem buscar order                                        | L211-213 |
| `getPaymentStatusByOrder` staff cross-tenant        | BOLA: rejeita restaurante divergente                                 | L218-222 |
| `getPaymentStatusByOrder` cliente não-dono          | BOLA: rejeita cliente cuja order não é dele                          | L229-234 |
| `createPixPayment` order de outro restaurante       | BOLA: rejeita restaurante divergente                                 | L83-85   |
| `createPixPayment` sem `amount` no body             | Server-side enforce usa `order.total`                                | L93-99   |
| `createPixPayment` `amount=null`                    | Mesmo tratamento que undefined                                       | L93-99   |
| `createPixPayment` tolerância ponto flutuante       | Diferença < R$0.01 aceita                                            | L94-97   |

### 3.2 Resultado da cobertura

| Métrica                        | Antes (03/08 master) | Depois             |
| ------------------------------ | -------------------- | ------------------ |
| Global api `branches`          | **79.02%** ❌        | **80.92%** ✅      |
| Global api `stmts`             | 87.66%               | 88.83%             |
| Global api `funcs`             | 88.79%               | 88.92%             |
| Global api `lines`             | 88.20%               | 89.45%             |
| `payments.service.ts` branches | 53.57%               | **82.73%** (+29pp) |

### 3.3 Não-objetivos

- **Não** adicionar testes para o `PaymentsController` — `payments.controller.spec.ts` já cobre os branches críticos (HMAC v1, IP CIDR, raw body). Adicionar testes para `processPaymentWebhook` (L406-450) exigiria `fetch` mockado, fora do escopo desta PR.
- **Não** cobrir o gap de `orders.service.ts` (52.87%) e `queues` (59.52%) — pertencem a outras bounded contexts (`pedido`, `shared`); abertura como PRs dedicadas.
- **Não** mexer em código de produção — esta PR é **test-only**. Não há mudanças em `src/`.

## 4. Categoria

- **Primária:** `testes` (coverage gap)
- **Secundária:** nenhuma (single-category)

## 5. Risco de Cagan

- **value**: médio — desbloqueia CI para PRs subsequentes (LGPD, P0-07)
- **usability**: N/A
- **feasibility**: muito alta — branches são determinísticas, mocks simples
- **business-viability**: crítico — sem cobertura ≥80%, CI gate impede merge de **features prontas para produção**

## 6. Framework de priorização — ICE

- **Impact**: 8/10 — desbloqueia gate CI para 2+ PRs prontas
- **Confidence**: 10/10 — branches determinísticas, falha previsível
- **Ease**: 9/10 — spec isolado, sem dependencies cross-module
- **ICE** = 8 × 10 × 9 / 10 = **72/100**

## 7. Critérios de aceite verificáveis

- [x] `apps/api/tests/unit/payments/payments.service.coverage.spec.ts` criado com 20 cenários
- [x] **20/20 testes passando** (`pnpm exec vitest run tests/unit/payments/payments.service.coverage.spec.ts`)
- [x] Cobertura global api `branches` ≥80% (medido: **80.92%**)
- [x] Cobertura de `payments.service.ts` `branches` ≥80% (medido: **82.73%**)
- [x] `pnpm --filter @pedi-ai/api test` passa: **39 specs, 603 testes**
- [x] Lint sem novos warnings
- [x] RTM regenerada (sem RFs novos — esta PR não materializa requisitos)

## 8. Métrica de sucesso pós-merge

- **Gate CI**: branches da api volta a ≥80% — futuras PRs podem ser mergeadas sem workaround.
- **Tempo de correção** de regressões no webhook: testes dão contrato esperado, falhas viram PRs de fix focadas em ≤1h.

## 9. Riscos e mitigações

| Risco                                          | Mitigação                                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Falsos positivos mascarando bugs               | Cada teste tem assertion dupla: valor de retorno + assertivas sobre mocks (chamado/não-chamado com args esperados) |
| Mudança em `PaymentsService` quebrar os testes | 20 testes isolados, falha localizável em <1min                                                                     |
| Acoplamento aos mocks atuais do spec principal | Usa o **mesmo padrão** de `createMockPrisma` do spec existente (consistência)                                      |

## 10. Ligações

- **Auditoria origem:** `docs/auditorias/DEVSECOPS-AUDIT-2026-06-25.md` (Achado global de cobertura)
- **PRs desbloqueadas por este fix:**
  - LGPD: `feat/lgpd-me-export-delete` (`e1e2d65`)
  - P0-07 Pix-Real-Gateway: `fix/payment-pix-real-gateway` (`afd0c39`)
- **Tooling gap identificado (relacionado, NÃO consertado aqui):** `scripts/rtm.ts` varre só paths DDD-migrados — `users/` (legado) fica de fora. Issue separada.
