# Tasks — `admin`

---

## [x] Fase 0 — Baseline (concluído)

- [x] CRUD básico de restaurante.
- [x] Vínculo N:N usuário-restaurante.
- [x] RBAC com papéis `owner`, `manager`, `staff`.
- [x] Soft-delete + reativação.
- [x] Analytics básicos.

---

## [ ] Fase 1 — Multi-Restaurante (Q4/2026)

- [ ] Decidir go-live: ou habilitar `NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT=true` em staging e validar com smoke test, ou marcar como **planejado** e remover verificações em use cases até release.
- [ ] Teste E2E cobrindo troca de restaurante ativo (já existe `multi-restaurant.spec.ts`).
- [ ] Spec formal `RF-ADM-09` quando a flag for habilitada em produção.

---

## [ ] Fase 2 — Assinatura e Cobrança (Q4/2026 → Q1/2027)

- [ ] Migrar `apps/api/src/subscriptions/` para `domain/admin/`.
- [ ] Integrar Mercado Pago para cobrança recorrente (`RF-ADM-12`).
- [ ] Webhook de inadimplência → bloqueio automático do restaurante.

---

## [ ] Fase 3 — Auditoria (Q1/2027)

- [ ] `RF-ADM-13` — Log de ações sensíveis (mudança de papel, desativação).
