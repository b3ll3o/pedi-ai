# Spec — Bounded Context `pedido`

> **Status:** Baseline aprovado · **Última atualização:** 2026-06-25 · **Owner:** Time Pedido

---

## 1. Contexto

O BC `pedido` é o **núcleo de negócio** do Pedi-AI: criação de pedidos,
cálculo de totais, máquina de estados de status, carrinho, histórico
e cancelamento.

---

## 2. Por que existe

- O cliente monta um **carrinho** (com modificadores e combos) e fecha o pedido.
- O pedido tem um **ciclo de vida** claro: `pendente → confirmado → preparando → pronto → entregue → cancelado`.
- Pedidos offline precisam ser **enfileirados e sincronizados** ao reconectar.
- Cancelamento deve disparar **reembolso** (ver `RF-ORDER-12`).

---

## 3. Quem usa

| Persona       | Necessidade                                           |
| ------------- | ----------------------------------------------------- |
| Cliente       | Montar carrinho; fechar pedido; acompanhar; cancelar. |
| Cozinha       | Ver fila; atualizar status.                           |
| Owner/Manager | Ver todos os pedidos; filtrar; exportar.              |

---

## 4. Escopo (RF cobertos)

Veja [design.md](./design.md).

- `RF-ORDER-01` Adicionar item ao carrinho.
- `RF-ORDER-02` Remover item do carrinho.
- `RF-ORDER-03` Editar quantidade.
- `RF-ORDER-04` Limpar carrinho.
- `RF-ORDER-05` Criar pedido a partir do carrinho.
- `RF-ORDER-06` Atualizar status do pedido (FSM).
- `RF-ORDER-07` Listar histórico de pedidos do cliente.
- `RF-ORDER-08` Obter detalhe de pedido.
- `RF-ORDER-09` Notificar mudança de status (Socket.io).
- `RF-ORDER-10` Sincronização offline (fila + BackgroundSync).
- `RF-ORDER-11` Reordenar (criar pedido a partir de um pedido anterior).
- `RF-ORDER-12` Cancelar pedido com reembolso (integração com `pagamento`).

---

## 5. Máquina de Estados (FSM)

```
                    ┌──────────────┐
   criar ──────────▶│   PENDENTE   │
                    └──────┬───────┘
                           │ confirmar
                           ▼
                    ┌──────────────┐
                    │  CONFIRMADO  │
                    └──────┬───────┘
                           │ preparar
                           ▼
                    ┌──────────────┐
                    │ PREPARANDO   │
                    └──────┬───────┘
                           │ pronto
                           ▼
                    ┌──────────────┐
                    │    PRONTO    │
                    └──────┬───────┘
                           │ entregar
                           ▼
                    ┌──────────────┐
                    │  ENTREGUE    │──▶ fim
                    └──────────────┘

  (a qualquer momento antes de ENTREGUE)
       ┌──────────────┐
       │  CANCELADO   │──▶ reembolso (se pago)
       └──────────────┘
```

Implementação: `apps/web/src/domain/pedido/value-objects/StatusPedido.ts`.

---

## 6. Referências

- `docs/FLUXOS-CONSUMIDOR.md` §5-10, 14-15
- `apps/web/src/domain/pedido/`
- `apps/api/src/orders/` (legado)
