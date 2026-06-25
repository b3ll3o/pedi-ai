# Tasks — `cardapio`

---

## [x] Fase 0 — Baseline (concluído)

- [x] Listagem e cache de cardápio.
- [x] CRUD admin (categorias, produtos, modificadores, combos).
- [x] Reordenação de categorias.
- [x] Sincronização offline (Dexie + Workbox).

---

## [ ] Fase 1 — Migração DDD da api

- [ ] Migrar `apps/api/src/categories/` → `apps/api/src/domain/cardapio/`.
- [ ] Migrar `apps/api/src/products/` → `apps/api/src/domain/cardapio/`.
- [ ] Migrar `apps/api/src/modifier-groups/` → `apps/api/src/domain/cardapio/`.
- [ ] Migrar `apps/api/src/combos/` → `apps/api/src/domain/cardapio/`.

---

## [ ] Fase 2 — UX (Q4/2026)

- [ ] `RF-MENU-12` — Busca fuzzy.
- [ ] `RF-MENU-13` — Imagem por produto (upload S3-compatível).

---

## [ ] Fase 3 — Operacional (Q1/2027)

- [ ] `RF-MENU-10` — Estoque.
- [ ] `RF-MENU-11` — Cardápio sazonal.
