# Spec — Bounded Context `admin`

> **Status:** Baseline aprovado · **Última atualização:** 2026-06-25 · **Owner:** Time Admin

---

## 1. Contexto

O BC `admin` cobre a **gestão do restaurante** pelo `owner` e sua equipe:
vinculação de usuários, configuração, multi-restaurante e assinatura.

---

## 2. Por que existe

- O Pedi-AI é **multi-tenant**: cada restaurante é uma unidade isolada por `restauranteId`.
- A equipe do restaurante precisa de **papéis** (`owner`, `manager`, `staff`) com permissões diferentes.
- Um mesmo usuário pode estar vinculado a **vários** restaurantes (`WIP-MULTI`).

---

## 3. Quem usa

| Persona | Necessidade                                                     |
| ------- | --------------------------------------------------------------- |
| Owner   | CRUD do restaurante; vincular equipe; assinatura; estatísticas. |
| Manager | Gerenciar equipe (exceto owner); ver analytics.                 |
| Staff   | Visualizar pedidos; atualizar status.                           |

---

## 4. Escopo (RF cobertos)

Veja [design.md](./design.md) para detalhes.

- `RF-ADM-01` Criar restaurante.
- `RF-ADM-02` Atualizar configurações do restaurante.
- `RF-ADM-03` Vincular usuário ao restaurante (com papel).
- `RF-ADM-04` Desvincular usuário.
- `RF-ADM-05` Listar equipe do restaurante.
- `RF-ADM-06` Alterar papel do usuário.
- `RF-ADM-07` Desativar restaurante (soft-delete).
- `RF-ADM-08` Reativar restaurante.
- `RF-ADM-09` Multi-restaurante (trocar restaurante ativo) — **planejado**, flag `MULTI_RESTAURANT=false`.
- `RF-ADM-10` Visualizar estatísticas (analytics).
- `RF-ADM-11` Gerenciar assinatura.

---

## 5. Fora de Escopo

- Marketplace de restaurantes (descoberta pública é via `/restaurantes`).
- Cobrança recorrente automatizada (integração Mercado Pago prevista para Q4/2026).

---

## 6. Referências

- `docs/guides/ROLES.md`
- `docs/FLUXOS-ADMIM.md` §2-4
- `apps/web/src/domain/admin/` e `apps/web/src/application/admin/`
- `apps/api/src/restaurants/` (legado)
