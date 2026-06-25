# Spec — Bounded Context `mesa`

> **Status:** Baseline aprovado · **Última atualização:** 2026-06-25 · **Owner:** Time Mesa/QR

---

## 1. Contexto

O BC `mesa` cobre a **gestão de mesas** do restaurante e a validação dos
**QR codes** que os clientes escaneiam para acessar o cardápio.

---

## 2. Por que existe

- O cliente chega ao restaurante, escaneia o QR da mesa e cai direto no cardápio.
- O QR precisa ser **à prova de falsificação** — caso contrário, alguém pode
  forjar `restauranteId` e `mesaId`.
- A cozinha precisa saber **qual mesa** fez o pedido.

---

## 3. Quem usa

| Persona       | Necessidade                                        |
| ------------- | -------------------------------------------------- |
| Cliente       | Escanear QR; cair no cardápio da mesa correta.     |
| Owner/Manager | CRUD de mesas; gerar QR (PDF/PNG); desativar mesa. |
| Cozinha       | Ver mesa origem do pedido.                         |

---

## 4. Escopo (RF cobertos)

Veja [design.md](./design.md).

- `RF-TABLE-01` Criar mesa.
- `RF-TABLE-02` Listar mesas do restaurante.
- `RF-TABLE-03` Validar QR code (HMAC-SHA256).
- `RF-TABLE-04` Gerar QR code (PDF/PNG).
- `RF-TABLE-05` Desativar mesa.
- `RF-TABLE-06` Reativar mesa.

---

## 5. Segurança do QR

O QR contém `restauranteId|mesaId|timestamp|signature` onde `signature =
HMAC-SHA256(secret, restauranteId|mesaId|timestamp)`. Detalhes em
[`docs/guides/QR_CODE.md`](../../../docs/guides/QR_CODE.md).

- O segredo **MUST** ficar em variável de ambiente, nunca em código.
- Validação rejeita QR com timestamp > 24h (anti-replay).

---

## 6. Referências

- `docs/guides/QR_CODE.md`
- `apps/web/src/domain/mesa/`
- `apps/web/src/lib/qr/validator.ts`
- `apps/api/src/tables/` (legado)
