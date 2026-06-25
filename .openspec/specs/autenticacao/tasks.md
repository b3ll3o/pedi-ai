# Tasks — `autenticacao`

> Ordem de execução proposta. Cada item é uma fatia entregável independente.

---

## [x] Fase 0 — Baseline (concluído antes de 2026-06-25)

- [x] Criar `apps/web/src/domain/autenticacao/` com entities, VOs e aggregate.
- [x] Criar use cases de autenticação, registro, redefinição.
- [x] Implementar `PostgresAuthAdapter`.
- [x] Cobertura de testes unitários ≥ 80%.
- [x] Specs E2E cobrindo registro, login, logout, recuperação de senha.

---

## [ ] Fase 1 — Hardening (próximo)

- [ ] Adicionar `RF-AUTH-07` — Logout server-side (revogar refresh tokens).
- [ ] Adicionar `RNF-SEC-02` — Rate limiting em `/login` (5/10min).
- [ ] Implementar endpoint `POST /api/auth/logout` na api (legado).
- [ ] Teste E2E: logout revoga refresh token (impede novo access token).

---

## [ ] Fase 2 — Migração DDD da api

- [ ] Migrar `apps/api/src/auth/auth.service.ts` → `apps/api/src/domain/autenticacao/services/AutenticarUsuarioService.ts`.
- [ ] Migrar `apps/api/src/users/users.service.ts` → `apps/api/src/domain/autenticacao/services/GerenciarUsuarioService.ts`.
- [ ] Atualizar controllers NestJS para chamar application services (não services legados).
- [ ] Remover módulos `auth/` e `users/` legados.

---

## [ ] Fase 3 — Recursos avançados (Q4/2026 → Q1/2027)

- [ ] `RF-AUTH-OAUTH-01` — Login com Google.
- [ ] `RF-AUTH-OAUTH-02` — Login com Apple.
- [ ] `RF-AUTH-2FA-01` — TOTP para `owner` (ver RNF-SEC-05 em `RNF.md`).
