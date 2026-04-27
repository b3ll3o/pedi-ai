# Proposal: Multi-Restaurante Admin — CRUD de Restaurantes e Cardápio

## Intent

Permitir que um administrador (owner) gerencie **múltiplos restaurantes**, cada um com seu próprio cardápio independente. Hoje o sistema é 1 usuário → 1 restaurante (relação 1:1 via `Usuario.restauranteId`). A mudança transforma essa relação em **N:N**, permitindo que um owner tenha vários restaurantes e que cada restaurante tenha seu próprio menu isolado.

## Scope

### In Scope

1. **Relacionamento N:N Usuario↔Restaurante**
   - Criar tabela de junction `usuario_restaurantes` (usuarioId, restauranteId, papel no restaurante)
   - Atualizar `Usuario` para remover campo `restauranteId` único
   - Migrar dados existentes (cada usuário existente recebe vínculo ao restaurante original)

2. **CRUD de Restaurantes (Admin)**
   - Criar restaurante (nome, CNPJ, endereço, telefone, logo)
   - Listar restaurantes do owner logado
   - Editar dados do restaurante
   - Desativar restaurante (soft delete — não exclui, apenas marca `ativo=false`)
   - Vincular/desvincular usuários (managers/staff) a cada restaurante

3. **CRUD de Cardápio por Restaurante (Admin)**
   - Cada restaurante tem categorias, produtos, grupos de modificadores e combos independentes
   - Adicionar produto ao cardápio
   - Editar produto (nome, descrição, preço, imagem, categoria, labels dietéticos)
   - **Retirar do menu** (soft delete — `ativo=false`, some do cardápio cliente mas permanece em pedidos históricos)
   - **Apagar produto** (hard delete — permanent, apenas se nunca foi pedido ou após X dias sem pedidos)
   - CRUD de categorias com disciplina de restaurante
   - CRUD de grupos de modificadores e valores

4. **UI de Admin — Seletor de Restaurante**
   - Sidebar/widget no admin para trocar entre restaurantes
   - Filtro de restaurante ativo em todas as telas de gestão
   - Criar/editar/Listar restaurantes acessível ao owner

5. **Sincronização Offline**
   - Cardápio offline isolado por restaurante (IndexedDB key inclui restauranteId)
   - Pedidos offline vinculados ao restaurante correto

### Out of Scope

- Login/logout, autenticação e gestão de sessão (já existe)
- Multi-restaurante para **cliente** (cliente escolhe restaurante ao acessar)
- Unified menu que agrega produtos de vários restaurantes
- Faturação ou gestão financeira cross-restaurante
- Transferência de propriedade de restaurante entre owners
- Relatórios consolidados entre restaurantes

## Approach

### 1. Migração de Schema (Supabase)

**Tabela nova `usuario_restaurantes`:**
```sql
CREATE TABLE usuario_restaurantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  restaurante_id UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  papel VARCHAR(20) NOT NULL DEFAULT 'staff', -- owner, manager, staff
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, restaurante_id)
);
CREATE INDEX idx_usuario_restaurantes_usuario ON usuario_restaurantes(usuario_id);
CREATE INDEX idx_usuario_restaurantes_restaurante ON usuario_restaurantes(restaurante_id);
```

**Remover coluna `restauranteId` de `usuarios`:**
```sql
ALTER TABLE usuarios DROP COLUMN IF EXISTS restaurante_id;
```

**Adicionar `restaurante_id` às entidades de cardápio:**
```sql
ALTER TABLE categorias ADD COLUMN restaurante_id UUID REFERENCES restaurantes(id);
ALTER TABLE itens_cardapio ADD COLUMN restaurante_id UUID REFERENCES restaurantes(id);
ALTER TABLE grupos_modificadores ADD COLUMN restaurante_id UUID REFERENCES restaurantes(id);
ALTER TABLE modificador_valores ADD COLUMN restaurante_id UUID REFERENCES restaurantes(id);
ALTER TABLE combos ADD COLUMN restaurante_id UUID REFERENCES restaurantes(id);
```

### 2. Camada de Domínio (DDD)

#### Entidade `Restaurante` (existente — revisar)
- Já existe em `src/domain/admin/entities/Restaurante.ts`
- Adicionar método `pertenceAoUsuario(usuarioId)` via novo repositório

#### Nova Entidade `UsuarioRestaurante`
- Local: `src/domain/admin/entities/UsuarioRestaurante.ts`
- Props: `id`, `usuarioId`, `restauranteId`, `papel`
- Métodos: `eDono()`, `eGerente()`, `eFuncionario()`

#### Value Objects — revisar
- `Papel` (existe) — precisa distinguir "papel global" vs "papel por restaurante"
- Considerar `PapelGlobal` (owner/admin) vs `PapelRestaurante` (owner/manager/staff por restaurante)

#### Repositórios — Interfaces novas
- `IRestauranteRepository` — existente, revisar métodos
- `IUsuarioRestauranteRepository` — nova interface: `findByUsuarioId`, `findByRestauranteId`, `save`, `delete`

#### Entidades de Cardápio — revisar
- `Categoria`, `ItemCardapio`, `ModificadorGrupo`, `ModificadorValor`, `Combo`
- Adicionar campo `restauranteId` às interfaces de props
- Todos os find/list devem filtrar por restauranteId

### 3. Camada de Aplicação (Use Cases)

| Use Case | Descrição |
|----------|-----------|
| `CriarRestauranteUseCase` | Owner cria novo restaurante |
| `ListarRestaurantesUseCase` | Lista todos restaurantes do owner |
| `AtualizarRestauranteUseCase` | Atualiza dados do restaurante |
| `DesativarRestauranteUseCase` | Soft delete (marca `ativo=false`) |
| `VincularUsuarioRestauranteUseCase` | Owner/manager vincula usuário a restaurante |
| `DesvincularUsuarioRestauranteUseCase` | Remove vínculo usuário-restaurante |
| `CriarCategoriaUseCase` | Cria categoria no contexto do restaurante |
| `AtualizarCategoriaUseCase` | Atualiza categoria |
| `ExcluirCategoriaUseCase` | Soft delete de categoria |
| `CriarProdutoUseCase` | Cria produto no cardápio do restaurante |
| `AtualizarProdutoUseCase` | Atualiza produto |
| `RetirarDoMenuUseCase` | Soft delete (remove do cardápio cliente) |
| `ApagarProdutoUseCase` | Hard delete (apaga permanentemente) |
| `ObterCardapioUseCase` | Retorna cardápio completo filtrado por restaurante |

### 4. Camada de Infraestrutura

- `RestauranteRepository` — implementar `IRestauranteRepository` com Dexie + Supabase
- `UsuarioRestauranteRepository` — nova implementação
- Atualizar repositórios de cardápio para filtrar por `restauranteId`
- `CardapioSyncService` — needs to scope sync per restauranteId

### 5. Camada de Apresentação (Admin UI)

**Novas páginas:**
- `/admin/restaurants` — lista de restaurantes do owner
- `/admin/restaurants/new` — criar restaurante
- `/admin/restaurants/[id]/edit` — editar restaurante
- `/admin/restaurants/[id]/team` — gerenciar equipe do restaurante

**Atualizar páginas existentes:**
- `/admin/menu` — adicionar seletor de restaurante no topo
- `/admin/products`, `/admin/categories` — filtro por restaurante
- Sidebar do admin — dropdown de "Trocar restaurante" no header

**Componentes novos:**
- `RestaurantSelector` — dropdown/widget para trocar restaurante ativo
- `RestaurantCard` — card na listagem de restaurantes
- `RestaurantForm` — formulário de criação/edição
- `TeamManagement` — lista de usuários vinculados ao restaurante

## Risks

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Quebrar autenticação existente ao remover `restauranteId` de `Usuario` | Alta | Crítico | Migrar dados primeiro; manter backward compatibility via junction; testar todos os fluxos de login |
| Queries de cardápio sem filtro de `restauranteId` retornam dados de outros restaurantes | Alta | Crítico | Adicionar filtro em todos os Use Cases de cardápio; lint rule custom; testes com restauranteId diferente |
| Offline sync mezclando cardápios de restaurantes | Alta | Alto | Namespaces de IndexedDB por `restauranteId`; separate sync queues |
| Performance degradada com N:M em queries | Média | Médio | Índices em `usuario_restaurantes`; queries indexes no Supabase |
| UI confusa ao trocar entre restaurantes | Média | Médio | Indicador visual claro de restaurante ativo; confirmar antes de trocar se houver dados não salvos |

## Rollback Plan

1. **Database**: Script SQL de rollback que:
   - Restaura coluna `restauranteId` em `usuarios`
   - Copia dados de `usuario_restaurantes` para `usuarios` (primeiro vínculo de cada usuário)
   - Remove tabela `usuario_restaurantes`
   - Remove coluna `restauranteId` das tabelas de cardápio

2. **Código**: Manter as mudanças do PR em branch separada (`feature/multi-restaurante`) até validação completa antes de merge na main.

3. **Feature flag**: Implementar via variável de ambiente `ENABLE_MULTI_RESTAURANT=false` que mantêm comportamento legacy até habilitado.

## Success Criteria

1. ✅ Owner pode criar, editar, listar e desativar múltiplos restaurantes
2. ✅ Cada restaurante tem cardápio (categorias, produtos, modificadores, combos) independente
3. ✅ Admin pode adicionar produto ao cardápio, editar, retirar do menu (soft delete) e apagar (hard delete)
4. ✅ Admin pode gerenciar a equipe de cada restaurante (vincular/desvincular managers/staff)
5. ✅ Cardápio offline funciona isolado por restaurante
6. ✅ Managers/staff veem apenas restaurantes aos quais estão vinculados
7. ✅ Soft delete preserva dados em pedidos históricos
8. ✅ Migration script preserva dados existentes sem perda
9. ✅ 100% dos testes unitários e integração passando
10. ✅ Cobertura de testes mantida em 80%+ para statements, branches, functions e lines
