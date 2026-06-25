# Spec — Bounded Context `autenticacao`

> **Status:** Baseline aprovado · **Última atualização:** 2026-06-25 · **Owner:** Time Auth

---

## 1. Contexto

O BC `autenticacao` é responsável por **identidade e acesso** dos usuários
(clientes e equipe do restaurante). Ele é a porta de entrada do sistema e a
origem das credenciais usadas em todos os outros BCs.

---

## 2. Por que existe

- O Pedi-AI precisa diferenciar **clientes** (que fazem pedidos) de **equipe**
  (que gerencia restaurante).
- O fluxo precisa funcionar **offline**: o cliente não pode ser barrado de
  montar carrinho por falta de rede.
- O restaurante precisa de **RBAC** (controle de acesso por papel).

---

## 3. Quem usa

| Persona             | Necessidade                                                           |
| ------------------- | --------------------------------------------------------------------- |
| **Cliente**         | Registrar-se rapidamente (e-mail/senha); autenticar; recuperar senha. |
| **Owner**           | Acessar o painel admin do restaurante.                                |
| **Gerente / Staff** | Acessar funcionalidades restritas ao seu papel.                       |

---

## 4. Escopo (RF cobertos)

Veja [design.md](./design.md) para a lista canônica de `RF-AUTH-NN`.

Resumo:

- `RF-AUTH-01` Registrar usuário (cliente).
- `RF-AUTH-02` Autenticar usuário (e-mail/senha → JWT).
- `RF-AUTH-03` Validar sessão (token JWT).
- `RF-AUTH-04` Recuperar senha via e-mail (token de uso único, expiração 1h).
- `RF-AUTH-05` Redefinir senha com token válido.
- `RF-AUTH-06` Logout (invalidar sessão local; opcional revogar no servidor).

---

## 5. Fora de Escopo

- **OAuth Social** (Google/Apple) — planejado para Q4/2026, **sem RF atual**.
- **2FA** — planejado para Q1/2027, **sem RF atual** (ver RNF-SEC-05 em `RNF.md`).
- **SSO corporativo** — fora de roadmap.

---

## 6. Referências

- `docs/guides/ROLES.md` — RBAC detalhado por papel.
- `docs/FLUXOS-CONSUMIDOR.md` §2-3, 13 — Fluxos de registro e recuperação de senha.
- `apps/web/src/domain/autenticacao/` — Implementação DDD.
- `apps/api/src/auth/` + `apps/api/src/users/` — Implementação legada (a migrar).
