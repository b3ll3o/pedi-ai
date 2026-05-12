# Issue: Analisar fluxo de checkout atual

**De:** @orchestrator
**Para:** @explorer
**Label:** `explorer`
**Priority:** high
**Blocking:** true

## Descrição

Analisar o código atual do checkout em `(customer)/checkout` para entender:
1. Como o pagamento é integrado atualmente
2. Quais componentes/stores são usados
3. Onde precisamos fazer mudanças para remover pagamento

## Contexto

O MVP Multica não terá pagamento online. Precisamos adaptar o checkout atual que tem integração com PIX/MercadoPago.

Referências:
- `tasks.md` → Fase 2: Checkout sem Pagamento
- `proposal.md` → "O que Precisamos Adaptar"

## Critérios de Aceitação

- [ ] Identificar arquivos do fluxo de checkout
- [ ] Mapear onde pagamento é chamado
- [ ] Listar componentes que precisam ser modificados
- [ ] Criar issue para @frontend com lista de componentes

## Arquivos a Analisar

```
src/app/(customer)/checkout/
src/stores/cartStore.ts
src/hooks/useCheckout.ts (se existir)
src/components/payment/
```

---

**Criado:** 2026-05-11
**Status:** open
