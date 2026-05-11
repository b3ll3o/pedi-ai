# Guia de Soft Delete — Pedi-AI

Este documento descreve o padrão de soft delete implementado no Pedi-AI, onde dados nunca são realmente deletados do banco.

---

## 1. Visão Geral

O Pedi-AI utiliza **soft delete** (exclusão lógica) para preservar dados históricos e permitir restauração. **Nenhum registro é realmente deletado do banco de dados.**

### Vantagens

- Preserva dados para relatórios e histórico de pedidos
- Permite restauração de itens removidos acidentalmente
- Mantém integridade referencial (pedidos antigos referenciam produtos/categorias existentes)
- Conformidade com requisito de negócio: "não quero que nada seja deletado de fato"

---

## 2. Padrão Implementado

### 2.1 Timestamp-based Soft Delete

Cada entidade que suporta soft delete possui um campo `deletedAt`:

```typescript
interface EntidadeComSoftDelete {
  deletedAt: Date | null;  // null = não deletado
  ativo: boolean;            // false quando deletado
}
```

### 2.2 Métodos de Domínio

| Método | Descrição |
|--------|-----------|
| `marcarDeletada()` | Define `deletedAt` com data atual e `ativo: false` |
| `restaurar()` | Limpa `deletedAt` e define `ativo: true` |
| `estaDeletada` | Getter que retorna `deletedAt !== null` |

### 2.3 Fluxo

```
Ativo ──────marcarDeletada()──────▶ Deletado (soft delete)
   ▲                                    │
   │                                    │
   └──────────restaurar()───────────────┘
```

---

## 3. Entidades com Soft Delete

### 3.1 Mesa

**Arquivo:** `src/domain/mesa/entities/Mesa.ts`

```typescript
desativar(): void {
  // Soft delete: desativa mesa
  Object.assign(this.props, {
    ativo: false,
    atualizadoEm: new Date(),
  });
}

marcarDeletada(): void {
  // Soft delete: marca como deletada
  Object.assign(this.props, {
    deletedAt: new Date(),
    ativo: false,
  });
}

restaurar(): void {
  Object.assign(this.props, {
    deletedAt: null,
    ativo: true,
  });
}
```

### 3.2 Categoria

**Arquivo:** `src/domain/cardapio/entities/Categoria.ts`

```typescript
desativar(): void {
  this.props.ativo = false;
}

ativar(): void {
  this.props.ativo = true;
}
```

### 3.3 Produto

**Arquivo:** `src/domain/cardapio/entities/ItemCardapio.ts`

```typescript
desativar(): void {
  this.props.ativo = false;
}

ativar(): void {
  this.props.ativo = true;
}
```

### 3.4 Restaurante

**Arquivo:** `src/domain/admin/entities/Restaurante.ts`

```typescript
desativar(): void {
  Object.assign(this.props, {
    ativo: false,
    desativadoEm: new Date(),
  });
}

ativar(): void {
  Object.assign(this.props, {
    ativo: true,
    desativadoEm: null,
  });
}
```

### 3.5 Grupo de Modificadores

**Arquivo:** `src/domain/cardapio/entities/ModificadorGrupo.ts`

```typescript
desativar(): void {
  this.props.ativo = false;
}
```

---

## 4. Filtragem em Queries

### 4.1 No Repository (Supabase)

Registros soft deleted devem ser filtrados nas queries:

```typescript
// No MesaRepository
async buscarPorRestauranteId(restauranteId: string): Promise<Mesa[]> {
  const { data } = await supabase
    .from('tables')
    .select('*')
    .eq('restaurant_id', restauranteId)
    .is('deleted_at', null);  // Filtra soft deleted
}
```

### 4.2 No Admin API Routes

```typescript
// GET /api/admin/tables
// Filtra mesas ativas (não deletadas)
const { data: mesas } = await supabase
  .from('tables')
  .select('*')
  .eq('restaurant_id', restaurantId)
  .eq('ativo', true);

// DELETE /api/admin/tables/:id
// Soft delete (não remove do banco)
await supabase
  .from('tables')
  .update({ deleted_at: new Date().toISOString(), ativo: false })
  .eq('id', tableId);
```

### 4.3 Em Rotas de Admin

```typescript
// src/app/api/admin/tables/[id]/route.ts

// Create - filtra soft deleted ao buscar
const { data: mesa } = await supabase
  .from('tables')
  .select('*')
  .eq('id', id)
  .is('deleted_at', null)
  .single();

// Delete - soft delete (não remove)
await supabase
  .from('tables')
  .update({ deleted_at: now, ativo: false })
  .eq('id', id);
```

---

## 5. Comportamento por Contexto

### 5.1 Cliente (Público)

- Itens `ativo: false` ou `deletedAt !== null` **não aparecem** no cardápio
- Mesas `ativo: false` não são exibidas para seleção

### 5.2 Admin

- Admin vê apenas itens `ativo: true` na listagem padrão
- Admin pode ver itens desativados em seção "Itens Inativos"
- Admin pode reativar itens desativados

### 5.3 Pedidos Históricos

- Pedidos antigos mantêm referência a produtos/categorias mesmo que deletados
- Dados do pedido são preservados integralmente
- Relatórios mostram dados históricos completos

---

## 6. Tabelas do Banco

### 6.1 Campo `deleted_at`

Adicionado a tabelas que suportam soft delete:

```sql
-- Exemplo para tables
ALTER TABLE tables ADD COLUMN deleted_at TIMESTAMPTZ;

-- Query para buscar apenas ativos
SELECT * FROM tables WHERE deleted_at IS NULL;

-- Query para buscar incluindo deletados
SELECT * FROM tables WHERE deleted_at IS NOT NULL;
```

### 6.2 Tabelas com Soft Delete

| Tabela | Campo deleted | Campo ativo |
|--------|---------------|-------------|
| `tables` | `deleted_at` | `ativo` |
| `categories` | — | `ativo` |
| `products` | — | `ativo` |
| `restaurants` | `desativado_em` | `ativo` |
| `modifier_groups` | — | `ativo` |

---

## 7. Estrutura de Arquivos

```
src/
├── domain/
│   ├── mesa/entities/Mesa.ts           # desativar(), marcarDeletada(), restaurar()
│   ├── cardapio/entities/
│   │   ├── Categoria.ts               # desativar(), ativar()
│   │   ├── ItemCardapio.ts            # desativar(), ativar()
│   │   └── ModificadorGrupo.ts        # desativar()
│   └── admin/entities/
│       └── Restaurante.ts             # desativar(), ativar()
│
├── application/admin/services/
│   ├── GerenciarMesaUseCase.ts        # trata 'desativar'/'ativar'
│   ├── GerenciarCategoriaUseCase.ts   # trata 'desativar'/'ativar'
│   ├── GerenciarProdutoUseCase.ts     # trata 'desativar'/'ativar'
│   └── DesativarRestauranteUseCase.ts
│
└── app/api/admin/
    ├── tables/[id]/route.ts           # Soft delete na deleção
    ├── categories/route.ts            # Filtra ativo/inativo
    └── products/route.ts               # Filtra ativo/inativo
```

---

## 8. Testes

### 8.1 Testes Unitários

```bash
# Testes de soft delete em Mesa
npm run test -- src/tests/unit/domain/mesa/

# Testes de soft delete em ItemCardapio
npm run test -- src/tests/unit/domain/cardapio/
```

### 8.2 Cenários de Teste

| Cenário | Comportamento Esperado |
|---------|----------------------|
| `mesa.desativar()` | `ativo: false`, timestamp atualizado |
| `mesa.ativar()` | `ativo: true` |
| `mesa.marcarDeletada()` | `deletedAt` definido, `ativo: false` |
| `mesa.restaurar()` | `deletedAt: null`, `ativo: true` |
| Query com `.is('deleted_at', null)` | Retorna apenas não deletados |

---

## 9. Boas Práticas

1. **Nunca use DELETE SQL** — use `UPDATE ... SET deleted_at = now()`
2. **Sempre filtre soft deleted** em queries de listagem pública
3. **Mantenha integridade referencial** — foreign keys não devem bloquear dados históricos
4. **Documente entidades com soft delete** — garanta que outros devs entendam o padrão
5. **Teste restauração** — certifique-se que `restaurar()` funciona corretamente
