# Design — `cardapio`

---

## 1. Visão Geral

```
[Admin] ─→ CardapioAdminUseCases ─→ CardapioRepository ─→ Postgres
                                                ↓
                                       CacheDexie (Service Worker)
                                                ↓
[Cliente] ─→ ListarCardapioUseCase ─→ Cache + Fallback API
```

---

## 2. Requisitos Funcionais (RF-MENU)

| ID           | Descrição             | Materialização (código)                 | Status  |
| ------------ | --------------------- | --------------------------------------- | ------- |
| `RF-MENU-01` | Listar categorias     | `ListarCategoriasUseCase.ts`            | ✅ Done |
| `RF-MENU-02` | Listar cardápio       | `ListarCardapioUseCase.ts`              | ✅ Done |
| `RF-MENU-03` | Detalhe de produto    | `ObterDetalheProdutoUseCase.ts`         | ✅ Done |
| `RF-MENU-04` | CRUD categoria        | `CriarCategoriaUseCase.ts` etc.         | ✅ Done |
| `RF-MENU-05` | CRUD produto          | `CriarProdutoUseCase.ts` etc.           | ✅ Done |
| `RF-MENU-06` | CRUD modificador      | `CriarGrupoModificadorUseCase.ts`       | ✅ Done |
| `RF-MENU-07` | CRUD combo            | `CriarComboUseCase.ts`                  | ✅ Done |
| `RF-MENU-08` | Reordenar categorias  | `ReordenarCategoriasUseCase.ts`         | ✅ Done |
| `RF-MENU-09` | Sincronização offline | `CardapioSyncService` + `serviceWorker` | ✅ Done |

---

## 3. Regras de Negócio

- **Preço em centavos** — armazenado como `number` (centavos) via VO `Dinheiro`.
- **Combo** = agregação de produtos com desconto; preço final = soma − desconto.
- **Modificadores** podem ser obrigatórios (`minSelecao > 0`) ou opcionais.
- **Categoria sem produto ativo** ainda é listada (UX: cliente vê "Vazia").

---

## 4. Próximos Requisitos

| ID           | Descrição                                 | Quarter alvo |
| ------------ | ----------------------------------------- | ------------ |
| `RF-MENU-10` | Estoque / disponibilidade (planejado)     | Q1/2027      |
| `RF-MENU-11` | Cardápio sazonal (horário/dia, planejado) | Q1/2027      |
| `RF-MENU-12` | Busca fuzzy no cardápio do cliente        | Q4/2026      |

---

## 5. RTM (trecho)

A RTM completa é regenerada por `pnpm rtm`.

| Status     | RFs                                |
| ---------- | ---------------------------------- |
| ✅ Done    | 01, 02, 03, 04, 05, 06, 07, 08, 09 |
| 🔴 Missing | —                                  |
