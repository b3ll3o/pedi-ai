# Spec — Bounded Context `cardapio`

> **Status:** Baseline aprovado · **Última atualização:** 2026-06-25 · **Owner:** Time Cardápio

---

## 1. Contexto

O BC `cardapio` é o **catálogo de produtos** do restaurante: categorias,
produtos, modificadores e combos. É a fonte de verdade do que o cliente vê
e do que pode pedir.

---

## 2. Por que existe

- O cliente precisa navegar o cardápio **offline** (cache em IndexedDB).
- O admin precisa manter o catálogo atualizado e refletir mudanças em tempo real.
- Produtos podem ter **modificadores** (tamanho, adicionais) e fazer parte de **combos**.

---

## 3. Quem usa

| Persona       | Necessidade                                                     |
| ------------- | --------------------------------------------------------------- |
| Cliente       | Navegar cardápio; filtrar; ver detalhes; adicionar ao carrinho. |
| Owner/Manager | CRUD de categorias, produtos, modificadores, combos.            |

---

## 4. Escopo (RF cobertos)

Veja [design.md](./design.md).

- `RF-MENU-01` Listar categorias (público, com cache).
- `RF-MENU-02` Listar cardápio (produtos ativos por categoria).
- `RF-MENU-03` Obter detalhe de produto (com modificadores).
- `RF-MENU-04` CRUD de categoria.
- `RF-MENU-05` CRUD de produto.
- `RF-MENU-06` CRUD de modificador (grupo + valor).
- `RF-MENU-07` CRUD de combo.
- `RF-MENU-08` Reordenar categorias (drag-and-drop).
- `RF-MENU-09` Sincronização offline (Service Worker + Dexie).

---

## 5. Fora de Escopo

- **Inventário / estoque** — fora de escopo (anotado em backlog).
- **Cardápio sazonal** (disponibilidade por horário/dia) — backlog.

---

## 6. Referências

- `docs/FLUXOS-CONSUMIDOR.md` §4-5 — Fluxos do consumidor.
- `docs/FLUXOS-ADMIM.md` §5-8 — Fluxos admin.
- `apps/web/src/domain/cardapio/`
- `apps/api/src/{categories,products,modifier-groups,combos}/` (legado)
