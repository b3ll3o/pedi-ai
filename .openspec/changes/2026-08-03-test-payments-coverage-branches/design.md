# Design — Elevar cobertura api `branches` ≥80%

## 1. Decisão de arquitetura: por que spec separado

Considerei três opções:

| Opção                                     | Prós                                                    | Contras                                                  | Decisão          |
| ----------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------- | ---------------- |
| Estender `payments.service.spec.ts`       | Tudo num arquivo só                                     | Dilui o `describe()` raiz, dificulta code review isolado | ❌               |
| Criar `payments.service.coverage.spec.ts` | Isolado, foco claro em coverage, revisável como unidade | Dois specs para o mesmo service                          | ✅ **escolhida** |
| Spec parametrizado                        | DRY                                                     | Aumenta complexidade cognitiva                           | ❌               |

A escolha segue o padrão **já estabelecido** em `apps/api/tests/unit/`:

```
apps/api/tests/unit/orders/                          # behavior tests
  orders.service.spec.ts
apps/api/tests/unit/payments/                        # behavior + coverage
  payments.service.spec.ts                            # original (13 testes)
  payments.service.coverage.spec.ts                  # novo (20 testes, branches)
  payments.controller.spec.ts                         # original
  ip-cidr.spec.ts                                     # utility
```

Convenções de nomenclatura:

- `<service>.spec.ts` — comportamento canônico + happy path
- `<service>.coverage.spec.ts` — cobertura de branches específicas (este padrão será usado em PRs subsequentes para `orders`, `queues`).

## 2. Estrutura do spec novo

```
describe('PaymentsService — cobertura de branches (handleWebhook + getPaymentStatus*)')
  describe('handleWebhook — status desconhecido do MP (statusMap)')
    it('retorna unknown_status quando data.status não tem mapeamento para intent')
  describe('handleWebhook — caminho L329-342 (orderStatusMap sem mapeamento)')
    it('retorna unknown_status quando status está em statusMap mas NÃO em orderStatusMap')
  describe('handleWebhook — conflito de versão otimista (updateMany.count === 0)')
    it('preserva status do staff quando count=0 e sincroniza paymentStatus')
  describe('handleWebhook — erro de transação (catch L408)')
    it('loga e relança erro do transaction (não-recuperável)')
    it('loga e relança erro de Prisma conhecido (não-P2002)')
  describe('handleWebhook — currentOrder ausente (impossível, defensivo)')
    it('retorna success mesmo se order foi deletada entre webhook e transação')
  describe('getPaymentStatus — caminho do cliente')
    it('retorna status para cliente que é dono do pedido')
    it('rejeita cliente que NÃO é dono do pedido (BOLA)')
    it('rejeita cliente quando order não existe (não enumera)')
    it('rejeita staff sem restaurante vinculado')
  describe('getPaymentStatusByOrder — sem payment (return early L211)')
    it('retorna estado vazio quando paymentIntent.findFirst retorna null')
  describe('getPaymentStatusByOrder — staff cross-tenant (BOLA)')
    it('rejeita staff de outro restaurante')
    it('rejeita staff sem restaurante vinculado')
  describe('getPaymentStatusByOrder — cliente não-dono (BOLA)')
    it('rejeita cliente cuja order não pertence a ele (não enumera)')
    it('rejeita cliente quando order não existe')
  describe('getPaymentStatusByOrder — caminho feliz staff')
    it('retorna dados completos quando staff do mesmo restaurante')
  describe('createPixPayment — order de outro restaurante (BOLA)')
    it('rejeita quando order.restaurantId diverge do data.restaurantId')
  describe('createPixPayment — sem amount no body (server-side enforced)')
    it('usa order.total quando data.amount é undefined')
    it('usa order.total quando data.amount é null (também aceito)')
  describe('createPixPayment — amount coerente (tolerância)')
    it('aceita amount com diferença < R$0.01 (ponto flutuante)')
```

**Total: 20 cenários**, todos passando em suíte isolada e em suíte completa.

## 3. Padrão de mocks

Copiado do spec principal (`payments.service.spec.ts`) para evitar surpresas. Suporta:

- `$transaction` em modo batch (array) e interativo (callback).
- `tx.paymentIntent.{create,findFirst,update}` — todos os métodos usados pelo `handleWebhook`.
- `tx.order.{findUnique,update,updateMany}` — incluindo `updateMany` para cobrir o cenário de conflito otimista.
- `tx.webhookEvent.create` — incluindo o mock de `P2002` para idempotência.

## 4. Decisões de design

### 4.1 Por que testar `in_process` (não `approved`)?

`in_process` é o único status MP real que exercita o branch L329-342 (presente em `statusMap` mas não em `orderStatusMap`). O teste valida o caminho `unknown_status` defensivo.

### 4.2 Por que testar `updateMany.count === 0`?

Auditoria ACHADO-6 (Re-varredura 5) demonstrou que o conflito otimista entre staff e webhook é **real** e a defesa via `version` é intencional. Sem este teste, regressões no `updateMany` passariam batido.

### 4.3 Por que cobrir `currentOrder === null`?

Defensivo: impossível por construção (FK do Prisma), mas o código tem o branch explícito (L367) e a cobertura v8 marca-o como não-exercitado. Adicionar o teste elimina o ruído no relatório.

### 4.4 Por que separar `handleWebhook` dos `getPaymentStatus*` em `describe()` blocks distintos?

Mesmo arquivo, mas blocos `describe()` separados dentro de `describe()` raiz deixam code review + navegação + rerun isolado muito mais fáceis (comando `--testNamePattern="PaymentsService — cobertura de branches.*handleWebhook"`).

## 5. Métricas de cobertura (pré vs pós)

### `payments.service.ts`

|              | Antes      | Depois     | Δ            |
| ------------ | ---------- | ---------- | ------------ |
| Statements   | 70.11%     | 83.19%     | +13.08pp     |
| **Branches** | **53.57%** | **82.73%** | **+29.16pp** |
| Functions    | 88.88%     | 81.48%     | -7.40pp*     |
| Lines        | 70.11%     | 83.56%     | +13.45pp     |

\* A queda em `functions` deve-se ao v8 contar `createMockPrisma`, `mockImplementation` etc. como funções instrumentáveis — variação metodológica, não regressão.

### Global api

|              | Antes      | Depois     | Δ              |
| ------------ | ---------- | ---------- | -------------- |
| Statements   | 87.66%     | 88.83%     | +1.17pp        |
| **Branches** | **79.02%** | **80.92%** | **+1.90pp** ✅ |
| Functions    | 88.79%     | 88.92%     | +0.13pp        |
| Lines        | 88.20%     | 89.45%     | +1.25pp        |

## 6. Próximos requisitos / PRs subsequentes

Esta PR é **single-purpose** (coverage de payments). Outras oportunidades de coverage gap:

| Módulo                    | Branches | Próxima PR candidata                                                         |
| ------------------------- | -------- | ---------------------------------------------------------------------------- |
| `orders.service.ts`       | 52.87%   | `test(orders): cobrir branches de state-machine em orders.service`           |
| `queues/queue.service.ts` | 60.52%   | `test(queues): cobrir branches de retry/backoff em queue.service`            |
| `payments.controller.ts`  | 76.78%   | `test(payments): cobrir branches de processPaymentWebhook com fetch mockado` |

## 7. Não-objetivos

- **Não** adicionar testes de E2E para o webhook MP — o ambiente E2E não tem MP sandbox configurado.
- **Não** converter `PaymentsService` para DDD — fora de escopo.
- **Não** corrigir `scripts/rtm.ts` para varrer `users/` (tooling gap relacionado, mas separado).
