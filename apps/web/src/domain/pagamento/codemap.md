# Pagamento — Bounded Context

> Domínio que gerencia pagamentos de pedidos

## Visão Geral

O contexto de **Pagamento** é responsável por:

- Processar pagamentos via Pix
- Validar webhooks de confirmação
- Gerenciar reembolso
- Manter idempotência

## Estrutura

```
src/domain/pagamento/
├── entities/
│   ├── Pagamento.ts        # Entidade de pagamento
│   └── Transacao.ts       # Transação do provider
├── value-objects/
│   ├── StatusPagamento.ts  # pending, confirmed, failed, refunded
│   └── MetodoPagamento.ts # pix (único método)
├── aggregates/
│   └── PagamentoAggregate.ts # Agregado com invariantes
├── events/
│   ├── PagamentoConfirmadoEvent.ts
│   ├── PagamentoFalhouEvent.ts
│   ├── ReembolsoIniciadoEvent.ts
│   └── ReembolsoConfirmadoEvent.ts
└── repositories/
    ├── IPagamentoRepository.ts
    └── ITransacaoRepository.ts
```

## Entidades

### Pagamento

```typescript
class Pagamento {
  id: string;
  pedidoId: string;
  metodo: MetodoPagamento; // apenas pix
  status: StatusPagamento;
  valor: Dinheiro;
  transacaoId?: string;
  webhookId?: string;
  createdAt: Date;
  confirmedAt?: Date;
}
```

### Transacao

```typescript
class Transacao {
  id: string;
  pagamentoId: string;
  tipo: 'charge' | 'refund';
  providerId: string;
  status: string;
  payload: object;
  createdAt: Date;
}
```

## Status Pagamento

| Status      | Descrição            |
| ----------- | -------------------- |
| `pending`   | Aguardando pagamento |
| `confirmed` | Pago com sucesso     |
| `failed`    | Falha no pagamento   |
| `refunded`  | Reembolsado          |
| `cancelled` | Cancelado            |

## Eventos de Domínio

| Evento                     | Quando               |
| -------------------------- | -------------------- |
| `PagamentoConfirmadoEvent` | Pix confirmado       |
| `PagamentoFalhouEvent`     | Falha ou timeout     |
| `ReembolsoIniciadoEvent`   | Reembolso solicitado |
| `ReembolsoConfirmadoEvent` | Reembolso aprovado   |

## Repositórios

### IPagamentoRepository

```typescript
interface IPagamentoRepository {
  findById(id: string): Promise<Pagamento | null>;
  findByPedidoId(pedidoId: string): Promise<Pagamento | null>;
  save(pagamento: Pagamento): Promise<void>;
  update(pagamento: Pagamento): Promise<void>;
}
```

### ITransacaoRepository

```typescript
interface ITransacaoRepository {
  findById(id: string): Promise<Transacao | null>;
  findByPagamentoId(pagamentoId: string): Promise<Transacao[]>;
  findByWebhookId(webhookId: string): Promise<Transacao | null>;
  save(transacao: Transacao): Promise<void>;
}
```

## Fluxo Pix

```
1. Cliente seleciona Pix
2. Backend cria PagamentoAggregate
3. PixAdapter gera QR Code
4. Cliente paga no app do banco
5. Webhook recebe confirmação
6. PagamentoConfirmadoEvent publicado
7. Pedido atualizado para paid
```

## Dependências

Este módulo **não pode** importar de:

- `src/application/`
- `src/infrastructure/`
- `src/presentation/`

## Status de Implementação

| Componente            | Status          |
| --------------------- | --------------- |
| Entities              | ✅ Implementado |
| Value Objects         | ✅ Implementado |
| Aggregates            | ✅ Implementado |
| Events                | ✅ Implementado |
| Repository Interfaces | ✅ Implementado |

---

_Criado: 2026-05-04_
