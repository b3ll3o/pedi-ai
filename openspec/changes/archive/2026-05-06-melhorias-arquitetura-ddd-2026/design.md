# Design: Melhorias de Arquitetura DDD e Consolidação

## Technical Approach

Esta mudança consolidará value objects duplicados e esclarecerá ownership de eventos entre contextos DDD. A estratégia é:

1. **Copiar** `Dinheiro` para `shared/value-objects/` (mantendo o original temporariamente)
2. **Atualizar** todos os 38 imports que referenciam `Dinheiro` de `@/domain/pedido/value-objects/Dinheiro` para `@/domain/shared/value-objects/Dinheiro`
3. **Remover** o arquivo duplicado de `pedido/value-objects/Dinheiro.ts`
4. **Remover** `MetodoPagamento` duplicado de `pedido/` (já importado corretamente de `pagamento/` em alguns lugares)
5. **Remover** `PagamentoConfirmadoEvent` duplicado de `pedido/events/`

## Architecture Decisions

### Decision: Dinheiro belongs in shared, not pedido

**Choice**: Mover `Dinheiro` de `src/domain/pedido/value-objects/Dinheiro.ts` para `src/domain/shared/value-objects/Dinheiro.ts`

**Alternatives considered**:
- Manter em `pedido/` e exportar para outros contextos — viola princípio de que contexto não deve depender de outro contexto diretamente
- Criar um novo contexto `money/` — overkill para um value object

**Rationale**: `Dinheiro` é usado por `cardapio/`, `pagamento/`, `pedido/`, e `admin/`. Compartilhá-lo via `shared/` é o padrão DDD para value objects reutilizáveis entre contextos.

---

### Decision: MetodoPagamento ownership belongs to pagamento

**Choice**: `pagamento/` é o contexto dono de `MetodoPagamento`. Remover duplicado de `pedido/`.

**Alternatives considered**:
- Manter ambos os contextos com suas próprias versões (atual) — causa inconsistência

**Rationale**: Pagamento é o contexto natural para métodos de pagamento. `pedido/` apenas consome o método, não define regras sobre ele.

---

### Decision: PagamentoConfirmadoEvent ownership belongs to pagamento

**Choice**: `pagamento/` é o contexto dono do evento. `pedido/` consome o evento via event bus.

**Alternatives considered**:
- Manter evento em ambos contextos com diferentes payloads — causa confusão sobre qual usar

**Rationale**: O contexto que origina a confirmação (pagamento) deve ser o dono do evento. `pedido/` reage ao evento para fazer transição de status.

---

## Data Flow

### Flow: Event-driven Payment Confirmation

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  pedido/    │     │   pagamento/ │     │  kitchen/  │
│  Aggregate  │     │   Aggregate  │     │  (waiter)  │
└──────┬──────┘     └──────┬───────┘     └──────▲────┘
       │                    │                    │
       │                    ▼                    │
       │            ┌──────────────┐              │
       │            │ Pagamento   │              │
       │            │ Confirmado  │──────────────┘
       │            │ Event       │   (realtime)
       │            └──────────────┘
       │                    │
       │   Pedido observa evento via EventDispatcher
       │
       ▼
┌─────────────────┐
│ StatusPedido     │
│ transição para   │
│ 'paid'          │
└─────────────────┘
```

## File Changes

### Files to CREATE:
- `src/domain/shared/value-objects/Dinheiro.ts` (copiar do existente em pedido/)

### Files to MODIFY (imports):
- `src/domain/cardapio/aggregates/ComboAggregate.ts`
- `src/domain/cardapio/entities/ItemCardapio.ts`
- `src/domain/cardapio/entities/Combo.ts`
- `src/domain/cardapio/entities/ModificadorValor.ts`
- `src/domain/pagamento/aggregates/PagamentoAggregate.ts`
- `src/domain/pagamento/entities/Pagamento.ts`
- `src/infrastructure/persistence/cardapio/ItemCardapioRepository.ts`
- `src/infrastructure/persistence/cardapio/CardapioSyncService.ts`
- `src/infrastructure/persistence/cardapio/ModificadorGrupoRepository.ts`
- `src/infrastructure/persistence/pagamento/PagamentoRepository.ts`
- `src/infrastructure/persistence/pedido/PedidoRepository.ts`
- `src/infrastructure/persistence/pedido/CarrinhoRepository.ts`
- `src/infrastructure/persistence/admin/EstatisticasRepository.ts`
- `src/application/admin/services/GerenciarProdutoUseCase.ts`
- `src/application/admin/services/CriarValorModificadorUseCase.ts`
- `src/application/admin/services/AtualizarValorModificadorUseCase.ts`
- `src/application/admin/services/CriarGrupoModificadorUseCase.ts`
- `src/application/admin/services/ObterEstatisticasUseCase.ts`
- `src/tests/unit/domain/cardapio/ItemCardapio.test.ts`
- `src/tests/unit/domain/cardapio/ModificadorValor.test.ts`
- `src/tests/unit/domain/cardapio/ModificadorGrupo.test.ts`
- `src/tests/unit/domain/cardapio/Combo.test.ts`
- `src/tests/unit/domain/pagamento/Pagamento.test.ts`
- `src/tests/unit/domain/pedido/Dinheiro.test.ts` (mover para shared tests)
- `src/tests/unit/domain/pedido/ItemPedido.test.ts`
- `src/tests/unit/domain/pedido/Pedido.test.ts`
- `src/tests/unit/application/pedido/CriarPedidoUseCase.test.ts`
- `src/tests/unit/application/admin/GerenciarProdutoUseCase.test.ts`

### Files to MODIFY (exports):
- `src/domain/shared/index.ts` — adicionar export de `Dinheiro`

### Files to DELETE:
- `src/domain/pedido/value-objects/Dinheiro.ts`
- `src/domain/pedido/value-objects/MetodoPagamento.ts`
- `src/domain/pedido/events/PagamentoConfirmadoEvent.ts`
- `src/domain/pedido/value-objects/index.ts` (se vazio após remoção)

### Files to MODIFY (exports removal):
- `src/domain/pedido/events/index.ts` — remover export de `PagamentoConfirmadoEvent`
- `src/domain/pedido/value-objects/index.ts` — remover exports de `Dinheiro` e `MetodoPagamento`

## Interfaces / Contracts

### Interface: ValueObject Export
```typescript
// src/domain/shared/index.ts (adicionar)
export { Dinheiro } from './value-objects/Dinheiro';
```

### Updated Export: Pedido Events
```typescript
// src/domain/pedido/events/index.ts (remover)
- export { PagamentoConfirmadoEvent } from './PagamentoConfirmadoEvent';
```

### Updated Export: Pedido Value Objects
```typescript
// src/domain/pedido/value-objects/index.ts (remover linhas de Dinheiro e MetodoPagamento)
```

## Testing Strategy

1. **Testes unitários de Dinheiro** já existem em `src/tests/unit/domain/pedido/Dinheiro.test.ts`
   - Mover para `src/tests/unit/domain/shared/Dinheiro.test.ts`
   - Atualizar imports para usar nova localização

2. **Testes de integração** não necessitam de alteração — funcionam via interfaces

3. **Testes E2E** não são afetados — não testam internals de domain

4. **Verificação manual**:
   - `grep -r "class Dinheiro" src/` deve retornar 1 resultado
   - `grep -r "from '@/domain/pedido/value-objects/Dinheiro'" src/` deve retornar 0 resultados
   - `npm run test` deve passar
   - `npm run build` deve passar

## Migration / Rollout

### Phase 1: Preparação (1 commit)
1. Copiar `Dinheiro.ts` para `src/domain/shared/value-objects/`
2. Adicionar export em `src/domain/shared/index.ts`
3. Commit: "feat(shared): add Dinheiro value object"

### Phase 2: Atualizar Imports (1 commit)
1. Atualizar todos os 38+ arquivos que importam `Dinheiro` de `pedido/` para `shared/`
2. Atualizar testes
3. Commit: "refactor: migrate Dinheiro imports to shared"

### Phase 3: Remover Duplicações (1 commit)
1. Remover `src/domain/pedido/value-objects/Dinheiro.ts`
2. Remover `src/domain/pedido/value-objects/MetodoPagamento.ts`
3. Remover `src/domain/pedido/events/PagamentoConfirmadoEvent.ts`
4. Atualizar `src/domain/pedido/events/index.ts`
5. Atualizar `src/domain/pedido/value-objects/index.ts`
6. Commit: "chore: remove duplicate VOs and events from pedido"

### Phase 4: Verificação (1 commit)
1. Executar `npm run test`
2. Executar `npm run build`
3. Verificar cobertura mantida (80%+)
4. Commit: "chore: verify consolidation changes"

## Open Questions

1. **E2E Tests de password reset**: A mudança atual (`fluxo-redefinicao-senha`) está em paralelo. Devemos coordená-las para evitar conflitos? (Provavelmente não há conflitos, são em arquivos diferentes.)

2. **Events em `mesa/` e `cardapio/`**: A spec diz que precisam ser documentados. Após esta mudança, devemos abordar isso em uma mudança separada? (Sim, está fora do scope atual conforme proposal.)
