# Design — `autenticacao`

> Documento normativo. Mudanças exigem PR + regenerar RTM.

---

## 1. Visão Geral

Pipeline de autenticação:

```
[Cliente] → RegistrarUsuarioUseCase ──┐
                                       ├→ PostgresAuthAdapter ─→ JWT
[Cliente] → AutenticarUsuarioUseCase ──┘
                                       ↓
                                     Sessao (Dexie + DB)
```

---

## 2. Requisitos Funcionais (RF-AUTH)

### `RF-AUTH-01` — Registrar usuário

**Ator:** Cliente (não-autenticado).

**Trigger:** Submeter formulário `/register`.

**Pré-condições:**

- E-mail não cadastrado.
- Senha ≥ 8 caracteres.

**Pós-condições:**

- `Usuario` persistido em Postgres + IndexedDB.
- `Sessao` criada com token JWT (válido por 24h).
- E-mail de boas-vindas enviado (modo dev: Mailpit).

**Regras de negócio:**

- Senha **MUST** ser armazenada como hash bcrypt cost ≥ 10.
- E-mail **MUST** ser único (constraint no DB).

**Materialização:**

- `apps/web/src/application/autenticacao/services/RegistrarUsuarioUseCase.ts`
- `apps/api/src/auth/auth.service.ts` (legado)

---

### `RF-AUTH-02` — Autenticar usuário

**Ator:** Cliente autenticando-se.

**Trigger:** Submeter formulário `/login`.

**Pré-condições:**

- Credenciais válidas.

**Pós-condições:**

- Token JWT emitido.
- `Sessao` persistida com `dispositivo`, `expiracao`.

**Regras de negócio:**

- Lockout após 5 tentativas falhas em 10 minutos (rate limit).
- Token **MUST** expirar em 15min; refresh token em 7d.

**Materialização:**

- `apps/web/src/application/autenticacao/services/AutenticarUsuarioUseCase.ts` (`@spec(RF-AUTH-02)`)
- `apps/api/src/auth/auth.service.ts` (legado)

---

### `RF-AUTH-03` — Validar sessão

**Ator:** Sistema (middleware).

**Trigger:** Cada requisição HTTP autenticada.

**Pré-condições:** Header `Authorization: Bearer <token>`.

**Pós-condições:** `req.user` populado com `usuarioId` e `papel`.

**Materialização:**

- `apps/web/src/hooks/useAuth.ts`
- `apps/api/src/auth/jwt.strategy.ts` (legado)

---

### `RF-AUTH-04` — Recuperar senha via e-mail

**Ator:** Cliente que esqueceu a senha.

**Trigger:** Solicitar em `/esqueci-senha`.

**Pré-condições:** E-mail cadastrado.

**Pós-condições:**

- `PasswordResetToken` gerado (uso único, expira em 1h).
- E-mail enviado com link `/redefinir-senha?token=...`.

**Regras de negócio:**

- Token **MUST** ser single-use.
- Por segurança, resposta **MUST** ser a mesma independentemente de o e-mail existir.

**Materialização:**

- `apps/web/src/application/autenticacao/services/SolicitarRecuperacaoSenhaUseCase.ts`
- `apps/api/src/auth/password-reset.service.ts` (legado)

---

### `RF-AUTH-05` — Redefinir senha

**Ator:** Cliente com token válido.

**Trigger:** Submeter nova senha em `/redefinir-senha`.

**Pré-condições:** Token válido e não-expirado.

**Pós-condições:**

- Senha atualizada (hash bcrypt).
- Token invalidado.
- Todas as sessões do usuário são revogadas.

**Materialização:**

- `apps/web/src/application/autenticacao/services/RedefinirSenhaUseCase.ts`

---

### `RF-AUTH-06` — Logout (planejado — useAuth.logout já existe, RF em formalização)

**Ator:** Cliente autenticado.

**Trigger:** Clique em "Sair".

**Pós-condições:**

- Sessão local removida (Dexie + cookies).
- (Opcional) Endpoint server-side para revogar refresh tokens.

**Materialização:**

- `apps/web/src/hooks/useAuth.ts:logout()`
- `apps/web/src/app/api/auth/logout/route.ts`

---

## 3. Próximos Requisitos (planejados, sem RF ainda)

| ID de trabalho   | Descrição                                 | Quarter alvo |
| ---------------- | ----------------------------------------- | ------------ |
| `WIP-AUTH-2FA`   | Autenticação de dois fatores para `owner` | Q1/2027      |
| `WIP-AUTH-OAUTH` | Login via Google/Apple                    | Q4/2026      |

---

## 4. Decisões de Design

- **Por que bcrypt cost 10?** — trade-off CPU / segurança; alinhado com `RNF-SEC-01`.
- **Por que JWT stateless?** — requisito para modo offline; permite validar token sem ir ao DB.
- **Por que Sessao também persistida no Dexie?** — UX: mostrar "logado como X" sem nova chamada de rede.

---

## 5. RTM (trecho)

| RF           | Descrição                  | Materialização (código)               | Spec | Teste unitário                             | Teste E2E                        | Status     |
| ------------ | -------------------------- | ------------------------------------- | ---- | ------------------------------------------ | -------------------------------- | ---------- |
| `RF-AUTH-01` | Registrar usuário          | `RegistrarUsuarioUseCase.ts`          | ✅   | `RegistrarUsuarioUseCase.test.ts`          | `customer/register.spec.ts`      | ✅ Done    |
| `RF-AUTH-02` | Autenticar usuário         | `AutenticarUsuarioUseCase.ts`         | ✅   | `AutenticarUsuarioUseCase.test.ts`         | `customer/auth.spec.ts`          | ✅ Done    |
| `RF-AUTH-03` | Validar sessão             | `useAuth.ts`                          | ✅   | `useAuth.test.ts`                          | `customer/auth.spec.ts`          | ✅ Done    |
| `RF-AUTH-04` | Recuperar senha via e-mail | `SolicitarRecuperacaoSenhaUseCase.ts` | ✅   | `SolicitarRecuperacaoSenhaUseCase.test.ts` | `auth/password-recovery.spec.ts` | ✅ Done    |
| `RF-AUTH-05` | Redefinir senha            | `RedefinirSenhaUseCase.ts`            | ✅   | `RedefinirSenhaUseCase.test.ts`            | `auth/password-recovery.spec.ts` | ✅ Done    |
| `RF-AUTH-06` | Logout                     | `useAuth.ts` + `route.ts`             | ✅   | —                                          | `customer/logout.spec.ts`        | 🟡 Partial |

> A RTM completa é regenerada por `pnpm rtm` em `docs/requirements/RTM.md`.
