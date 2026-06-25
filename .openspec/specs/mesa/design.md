# Design — `mesa`

---

## 1. Visão Geral

```
[Admin] ─→ MesaAdminUseCases ─→ MesaRepository ─→ Postgres
                                         ↓
                            QRCodeCryptoService (gera QR)
                                         ↓
                                    PDF/PNG

[Cliente] ─→ scan QR ─→ QRCodeValidationService ─→ restauranteId/mesaId válidos
                                                       ↓
                                                 /cardapio/[mesaId]
```

---

## 2. Requisitos Funcionais (RF-TABLE)

| ID            | Descrição                   | Materialização (código)                       | Status     |
| ------------- | --------------------------- | --------------------------------------------- | ---------- |
| `RF-TABLE-01` | Criar mesa                  | `CriarMesaUseCase.ts`                         | ✅ Done    |
| `RF-TABLE-02` | Listar mesas do restaurante | `ListarMesasUseCase.ts`                       | ✅ Done    |
| `RF-TABLE-03` | Validar QR code             | `QRCodeValidationService.ts` + `validator.ts` | ✅ Done    |
| `RF-TABLE-04` | Gerar QR (PDF/PNG)          | `QRCodeCryptoService.ts` (sem geração visual) | 🟡 Partial |
| `RF-TABLE-05` | Desativar mesa              | `DesativarMesaUseCase.ts`                     | ✅ Done    |
| `RF-TABLE-06` | Reativar mesa               | `ReativarMesaUseCase.ts`                      | ✅ Done    |

---

## 3. Decisões de Design

- **Por que HMAC-SHA256 e não RSA?** — Performance: validação no cliente é rápida; segredo compartilhado basta pois quem valida é o próprio servidor.
- **Por que timestamp no QR?** — Janela de validade reduz replay; não é assinatura de "tempo absoluto" mas sim nonce temporal.
- **Por que soft-delete?** — Preserva histórico de pedidos por mesa.

---

## 4. Próximos Requisitos

| ID            | Descrição                                          | Quarter alvo |
| ------------- | -------------------------------------------------- | ------------ |
| ID            | Descrição                                          | Quarter alvo |
| ------------  | -------------------------------------------------- | ------------ |
| `RF-TABLE-07` | Geração visual de QR (PNG/PDF, planejado)          | Q3/2026      |
| `RF-TABLE-08` | Impressão em lote (várias mesas, planejado)        | Q3/2026      |
| `RF-TABLE-09` | QR com logo do restaurante (planejado)             | Q4/2026      |

---

## 5. RTM (trecho)

A RTM completa é regenerada por `pnpm rtm`.

| Status     | RFs                                |
| ---------- | ---------------------------------- |
| ✅ Done    | 01, 02, 03, 05, 06                 |
| 🟡 Partial | 04 (gera payload, falta UI visual) |
