# Design: Multi-Restaurante — CRUD de Restaurantes e Cardápio

## Technical Approach

Transformar a relação 1:1 entre `Usuario` e `Restaurante` em N:N, permitindo que um owner gerencie múltiplos restaurantes, cada um com cardápio isolado. A implementação segue arquitetura DDD comdomain puro, casos de uso orquestrando infra, e apresentação Next.js.

---

## Architecture Decisions

### Decision: Junction Table `usuario_restaurantes` para Relacionamento N:N

**Choice**: Criar tabela de junção `usuario_restaurantes` em vez de array de `restauranteIds` no `Usuario`.

**Alternatives considered**:
- Array JSONB em `usuarios.restauranteIds` — simples mas queries difíceis, sem índices
- Multiple rows diretas sem junction table — violaria normalização

**Rationale**: A junction table permite índices eficientes, integridade referencial via FK, e papel por restaurante (owner/manager/staff). Supabase.handleiza bem N:M com junction tables.

---

### Decision: `restauranteId` obrigatório em todas as entidades de cardápio

**Choice**: Adicionar `restauranteId` como campo obrigatório em `Categoria`, `ItemCardapio`, `ModificadorGrupo`, `ModificadorValor`, e `Combo`.

**Alternatives considered**:
- Herança via `categoriaId` (item → categoria → restaurante) — acoplaitem à categoria,不便
- Queries com JOIN — performance degrada em offline-first

**Rationale**: Com IndexedDB offline-first, cada entidade precisa ser filtrável diretamente por `restauranteId`. Queries com JOIN não funcionam bem offline. Osupabase já tem `restaurante_id` em todas essas tabelas.

---

### Decision: Manter `Papel` global (owner/admin) e adicionar `PapelRestaurante` por junction

**Choice**: `Papel` continua sendo papel global do usuário no sistema; `UsuarioRestaurante.papel` define role dentro de cada restaurante.

**Alternatives considered**:
- Substituir `Papel` global por apenas junction — perderia distinção admin do sistema
- Duplicar papéis (global e local) — confuso

**Rationale**: `owner` e `admin` são papéis globais (criam restaurantes). `manager` e `staff` só fazem sentido no contexto de um restaurante específico. Separação clara de responsabilidades.

---

### Decision: Feature Flag `ENABLE_MULTI_RESTAURANT` para rollout gradual

**Choice**: Implementar feature flag que manté mcomportamento legacy quando false.

**Alternatives considered**:
- Migration única e imediata — risco de quebrar produção
- Branch separado — duplica manutenção

**Rationale**: Permite validar em staging primeiro, rollout progressivo, e rollback rápido se necessário.

---

### Decision: IndexedDB namespace por `restauranteId` para offline

**Choice**: Keys de cache incluem prefixo `restaurant_${restauranteId}_` para isolar cardápios.

**Alternatives considered**:
- Single cache com filtro em memória — risco de vazamento de dados entre restaurantes
- Cache por restaurantId分开 — simples e seguro

**Rationale**: Offline-first requer isolation completa. Cada restaurante tem sua queue de sync independente.

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ADMIN UI (Next.js)                            │
│  RestaurantSelector → context → todas as páginas filtram por restaurantId │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER (Use Cases)                        │
│  CriarRestauranteUseCase                                                │
│  ListarRestaurantesDoOwnerUseCase                                       │
│  VincularUsuarioRestauranteUseCase                                      │
│  GerenciarCategoriaUseCase (atualizado para receber restauranteId)       │
│  ...                                                                    │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       DOMAIN LAYER (Pure TypeScript)                    │
│  Restaurante, UsuarioRestaurante, Categoria, ItemCardapio (entities)     │
│  IRestauranteRepository, IUsuarioRestauranteRepository (interfaces)    │
│  Events: RestauranteCriadoEvent, UsuarioVinculadoRestauranteEvent        │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                                  │
│  Dexie (IndexedDB):                                                     │
│    - usuarios (removido restauranteId)                                  │
│    - usuario_restaurantes (NEW)                                        │
│    - restaurantes                                                       │
│    - categorias (restauranteId)                                         │
│    - itens_cardapio (restauranteId)                                    │
│    - modificadores_grupo (restauranteId)                                │
│    - modificadores_valor (restauranteId)                                │
│    - combos (restauranteId)                                             │
│                                                                          │
│  Supabase: espelha schema Dexie, sync por restauranteId                  │
│  CardapioSyncService: isola sync por restauranteId                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## File Changes

### NEW Files

**Domain Layer:**
```
src/domain/admin/entities/UsuarioRestaurante.ts
src/domain/admin/repositories/IUsuarioRestauranteRepository.ts
src/domain/admin/events/RestauranteCriadoEvent.ts
src/domain/admin/events/RestauranteAtualizadoEvent.ts
src/domain/admin/events/RestauranteDesativadoEvent.ts
src/domain/admin/events/UsuarioVinculadoRestauranteEvent.ts
src/domain/admin/events/UsuarioDesvinculadoRestauranteEvent.ts
src/domain/admin/events/CardapioAtualizadoEvent.ts
src/domain/admin/value-objects/PapelRestaurante.ts  (ou ajustar Papel.ts existente)
```

**Application Layer:**
```
src/application/admin/services/CriarRestauranteUseCase.ts
src/application/admin/services/ListarRestaurantesDoOwnerUseCase.ts
src/application/admin/services/AtualizarRestauranteUseCase.ts
src/application/admin/services/DesativarRestauranteUseCase.ts
src/application/admin/services/VincularUsuarioRestauranteUseCase.ts
src/application/admin/services/DesvincularUsuarioRestauranteUseCase.ts
src/application/admin/services/ListarEquipeRestauranteUseCase.ts
src/application/admin/services/ObterCardapioCompletoUseCase.ts
```

**Infrastructure Layer:**
```
src/infrastructure/persistence/admin/UsuarioRestauranteRepository.ts
```

**Presentation Layer:**
```
src/app/admin/restaurants/page.tsx
src/app/admin/restaurants/new/page.tsx
src/app/admin/restaurants/[id]/edit/page.tsx
src/app/admin/restaurants/[id]/team/page.tsx
src/components/admin/RestaurantSelector.tsx
src/components/admin/RestaurantCard.tsx
src/components/admin/RestaurantForm.tsx
src/components/admin/TeamManagement.tsx
src/stores/restaurantStore.ts  (Zustand store para restaurant context)
```

**Database Migration:**
```
supabase/migrations/XXXXXX_create_usuario_restaurantes.sql
supabase/migrations/XXXXXX_add_restaurante_id_to_menu_tables.sql
supabase/migrations/XXXXXX_remove_restaurante_id_from_usuarios.sql
```

**Scripts:**
```
scripts/migrate-to-multi-restaurant.ts
scripts/rollback-multi-restaurant.ts
```

---

### MODIFIED Files

**Domain Layer:**
| File | Changes |
|------|---------|
| `src/domain/admin/entities/Restaurante.ts` | Adicionar método `pertenceAoUsuario(usuarioId)` via repositório |
| `src/domain/autenticacao/entities/Usuario.ts` | Remover `restauranteId` dos props; atualizar métodos `podeAcessarRestaurante` |
| `src/domain/autenticacao/value-objects/Papel.ts` | Considerar renomear para `PapelGlobal` ou manter mas separar conceito |
| `src/domain/autenticacao/repositories/IUsuarioRepository.ts` | Remover `findByRestauranteId` (será substituído por `IUsuarioRestauranteRepository`) |
| `src/domain/cardapio/entities/ItemCardapio.ts` | Adicionar `restauranteId` aos props (já existe no DB, faltava no entity) |
| `src/domain/cardapio/entities/ModificadorGrupo.ts` | Adicionar `restauranteId` aos props |
| `src/domain/cardapio/entities/ModificadorValor.ts` | Adicionar `restauranteId` aos props |
| `src/domain/cardapio/entities/Combo.ts` | Adicionar `restauranteId` aos props |

**Infrastructure Layer:**
| File | Changes |
|------|---------|
| `src/infrastructure/persistence/database.ts` | Adicionar tabela `usuario_restaurantes` ao schema Dexie; remover índice `restauranteId` de `usuarios` |
| `src/infrastructure/persistence/types.ts` | Exportar `UsuarioRestauranteRecord` |
| `src/infrastructure/persistence/admin/RestauranteRepository.ts` | Adicionar `findByUsuarioId` |
| `src/infrastructure/persistence/cardapio/CategoriaRepository.ts` | Já filtra por restauranteId — confirmar que todas as queries têm filtro |
| `src/infrastructure/persistence/cardapio/ItemCardapioRepository.ts` | Adicionar `restauranteId` no `toDbModel` (já existe no DB mas não era usado) |
| `src/infrastructure/persistence/cardapio/CardapioSyncService.ts` | Já filtra por restauranteId — confirmar que sync é isolated |

**Application Layer:**
| File | Changes |
|------|---------|
| `src/application/admin/services/GerenciarCategoriaUseCase.ts` | Já recebe `restauranteId` — confirmar que validavinculo usuário-restaurante |
| `src/application/admin/services/GerenciarProdutoUseCase.ts` | Adicionar validação de restauranteId |
| `src/application/admin/services/index.ts` | Exportar novos use cases |

**Presentation Layer:**
| File | Changes |
|------|---------|
| `src/app/admin/dashboard/page.tsx` | Adicionar RestaurantSelector, redirecionar para `/admin/restaurants` se nenhum restaurante selecionado |
| `src/app/admin/products/page.tsx` | Filtrar por restaurante selecionado |
| `src/app/admin/categories/page.tsx` | Filtrar por restaurante selecionado |
| `src/app/admin/tables/page.tsx` | Filtrar por restaurante selecionado |
| `src/app/admin/orders/page.tsx` | Filtrar por restaurante selecionado |
| `src/app/admin/layout.tsx` (criar se não existir) | Adicionar context de restaurante, sidebar com selector |

**Config:**
| File | Changes |
|------|---------|
| `.env.local` | Adicionar `ENABLE_MULTI_RESTAURANT=false` |
| `src/lib/offline/types.ts` | Atualizar tipos de sync para incluir `restauranteId` |

---

### DELETED Files

Nenhum arquivo será deletado — todos são modificações ou adições.

---

## Directory Structure Additions

```
src/
├── domain/admin/
│   ├── entities/
│   │   └── UsuarioRestaurante.ts      [NEW]
│   ├── repositories/
│   │   └── IUsuarioRestauranteRepository.ts  [NEW]
│   ├── events/
│   │   ├── RestauranteCriadoEvent.ts         [NEW]
│   │   ├── RestauranteAtualizadoEvent.ts     [NEW]
│   │   ├── RestauranteDesativadoEvent.ts      [NEW]
│   │   ├── UsuarioVinculadoRestauranteEvent.ts [NEW]
│   │   ├── UsuarioDesvinculadoRestauranteEvent.ts [NEW]
│   │   └── CardapioAtualizadoEvent.ts        [NEW]
│   └── value-objects/
│       └── PapelRestaurante.ts              [NEW]
├── application/admin/services/
│   ├── CriarRestauranteUseCase.ts           [NEW]
│   ├── ListarRestaurantesDoOwnerUseCase.ts  [NEW]
│   ├── AtualizarRestauranteUseCase.ts       [NEW]
│   ├── DesativarRestauranteUseCase.ts       [NEW]
│   ├── VincularUsuarioRestauranteUseCase.ts [NEW]
│   ├── DesvincularUsuarioRestauranteUseCase.ts [NEW]
│   ├── ListarEquipeRestauranteUseCase.ts    [NEW]
│   └── ObterCardapioCompletoUseCase.ts      [NEW]
├── infrastructure/persistence/admin/
│   └── UsuarioRestauranteRepository.ts       [NEW]
├── presentation/
│   ├── components/admin/
│   │   ├── RestaurantSelector.tsx           [NEW]
│   │   ├── RestaurantCard.tsx               [NEW]
│   │   ├── RestaurantForm.tsx               [NEW]
│   │   └── TeamManagement.tsx              [NEW]
│   └── stores/
│       └── restaurantStore.ts               [NEW]
supabase/migrations/
├── XXXXXX_create_usuario_restaurantes.sql   [NEW]
├── XXXXXX_add_restaurante_id_to_menu_tables.sql [NEW]
└── XXXXXX_remove_restaurante_id_from_usuarios.sql [NEW]
scripts/
├── migrate-to-multi-restaurant.ts            [NEW]
└── rollback-multi-restaurant.ts              [NEW]
```

---

## Data Migration Strategy

### Phase 1: Schema Migration (Database)

```sql
-- 1. Criar tabela de junction
CREATE TABLE usuario_restaurantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  restaurante_id UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  papel VARCHAR(20) NOT NULL DEFAULT 'staff',
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, restaurante_id)
);
CREATE INDEX idx_usuario_restaurantes_usuario ON usuario_restaurantes(usuario_id);
CREATE INDEX idx_usuario_restaurantes_restaurante ON usuario_restaurantes(restaurante_id);

-- 2. Migrar dados existentes: cada usuário com restauranteId → junction com papel='owner'
INSERT INTO usuario_restaurantes (usuario_id, restaurante_id, papel)
SELECT id, restaurante_id, 'owner'
FROM usuarios
WHERE restaurante_id IS NOT NULL;

-- 3. Adicionar restaurante_id às tabelas de cardápio (se ainda não existir)
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS restaurante_id UUID REFERENCES restaurantes(id);
ALTER TABLE itens_cardapio ADD COLUMN IF NOT EXISTS restaurante_id UUID REFERENCES restaurantes(id);
ALTER TABLE grupos_modificadores ADD COLUMN IF NOT EXISTS restaurante_id UUID REFERENCES restaurantes(id);
ALTER TABLE modificador_valores ADD COLUMN IF NOT EXISTS restaurante_id UUID REFERENCES restaurantes(id);
ALTER TABLE combos ADD COLUMN IF NOT EXISTS restaurante_id UUID REFERENCES restaurantes(id);

-- 4. Backfill restaurante_id nas tabelas de cardápio (vindo da categoria para itens, etc.)
UPDATE itens_cardapio SET restaurante_id = (
  SELECT restaurante_id FROM categorias WHERE categorias.id = itens_cardapio.categoria_id
);

-- 5. Remover restauranteId da tabela usuarios
ALTER TABLE usuarios DROP COLUMN IF EXISTS restaurante_id;
```

### Phase 2: Domain & Application (código novo)

1. Criar entidades e interfaces novas (`UsuarioRestaurante`, `IUsuarioRestauranteRepository`)
2. Implementar novos use cases
3. Atualizar use cases existentes para receber `restauranteId` via context
4. Feature flag OFF: código legacy continua funcionando

### Phase 3: Presentation

1. Criar `restaurantStore` (Zustand) para gerenciar restaurante selecionado
2. Implementar `RestaurantSelector` component
3. Criar páginas de gestão de restaurantes
4. Atualizar páginas existentes para usar restaurant context

### Phase 4: Rollback Plan

```sql
-- Script de rollback
ALTER TABLE usuarios ADD COLUMN restaurante_id UUID REFERENCES restaurantes(id);
UPDATE usuarios SET restaurante_id = (
  SELECT restaurante_id FROM usuario_restaurantes 
  WHERE usuario_restaurantes.usuario_id = usuarios.id 
  LIMIT 1
);
DROP TABLE IF EXISTS usuario_restaurantes;
ALTER TABLE usuarios DROP COLUMN restaurante_id; -- recria com a constraint se necessário
```

---

## Dependency Changes

### NPM Packages
Nenhum pacote novo necessário — todas as dependências já existem:
- `dexie` (IndexedDB) — já usado
- `@supabase/supabase-js` — já usado
- `zustand` — já usado
- `react`/`next` — já usado

### Environment Variables
```env
ENABLE_MULTI_RESTAURANT=false  # Legacy mode por padrão
```

### Feature Flags
| Flag | Default | Description |
|------|---------|-------------|
| `ENABLE_MULTI_RESTAURANT` | `false` | Quando true, ativa modo multi-restaurante |

---

## Open Questions

1. **Papel do usuário que cria a primeira conta no Supabase**: Ao criar nova instância, quem é o primeiro `owner`? Considerar criar seed data ou lógica de primeiro acesso.

2. ** herdado de restaurantId em entidades existentes**: O `ItemCardapio` props não tinha `restauranteId` mas o DB sim. Confirmar se todos os lugares que criam `ItemCardapio` já fornecem `restauranteId` correto via `Categoria`.

3. **X dias para hard delete**: A especificação menciona "após X dias sem pedidos". Qual o valor de X? Sugestão: 30 dias.

4. ** Transferência de propriedade**: Out of scope por enquanto, mas o schema deve suportar no futuro (mudar `papel` de `owner` para outro usuário).

5. **Performance de queries com N:M**: Com muitos restaurantes e usuários, junction table pode crescer. Monitorar queries e considerar cache Redis no futuro se necessário.
