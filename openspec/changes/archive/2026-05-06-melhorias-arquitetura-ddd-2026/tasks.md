# Tasks: Melhorias de Arquitetura DDD e Consolidação

## Phase 1: Preparação — Adicionar Dinheiro ao Shared Domain

- [ ] 1.1 Criar diretório `src/domain/shared/value-objects/` (se não existir)
- [ ] 1.2 Copiar `src/domain/pedido/value-objects/Dinheiro.ts` para `src/domain/shared/value-objects/Dinheiro.ts`
- [ ] 1.3 Adicionar export em `src/domain/shared/index.ts`:
  ```typescript
  export { Dinheiro } from './value-objects/Dinheiro';
  ```

## Phase 2: Atualizar Imports — Migrar Dinheiro para Shared

### Domain Layer (cardapio)
- [ ] 2.1 Atualizar `src/domain/cardapio/aggregates/ComboAggregate.ts` — mudar import de `Dinheiro`
- [ ] 2.2 Atualizar `src/domain/cardapio/entities/ItemCardapio.ts` — mudar import de `Dinheiro`
- [ ] 2.3 Atualizar `src/domain/cardapio/entities/Combo.ts` — mudar import de `Dinheiro`
- [ ] 2.4 Atualizar `src/domain/cardapio/entities/ModificadorValor.ts` — mudar import de `Dinheiro`

### Domain Layer (pagamento)
- [ ] 2.5 Atualizar `src/domain/pagamento/aggregates/PagamentoAggregate.ts` — mudar import de `Dinheiro`
- [ ] 2.6 Atualizar `src/domain/pagamento/entities/Pagamento.ts` — mudar import de `Dinheiro`

### Infrastructure Layer (cardapio)
- [ ] 2.7 Atualizar `src/infrastructure/persistence/cardapio/ItemCardapioRepository.ts` — mudar import de `Dinheiro`
- [ ] 2.8 Atualizar `src/infrastructure/persistence/cardapio/CardapioSyncService.ts` — mudar import de `Dinheiro`
- [ ] 2.9 Atualizar `src/infrastructure/persistence/cardapio/ModificadorGrupoRepository.ts` — mudar import de `Dinheiro`

### Infrastructure Layer (pagamento)
- [ ] 2.10 Atualizar `src/infrastructure/persistence/pagamento/PagamentoRepository.ts` — mudar import de `Dinheiro`

### Infrastructure Layer (pedido)
- [ ] 2.11 Atualizar `src/infrastructure/persistence/pedido/PedidoRepository.ts` — mudar import de `Dinheiro`
- [ ] 2.12 Atualizar `src/infrastructure/persistence/pedido/CarrinhoRepository.ts` — mudar import de `Dinheiro` e `MetodoPagamento`

### Infrastructure Layer (admin)
- [ ] 2.13 Atualizar `src/infrastructure/persistence/admin/EstatisticasRepository.ts` — mudar import de `Dinheiro`

### Application Layer (admin)
- [ ] 2.14 Atualizar `src/application/admin/services/GerenciarProdutoUseCase.ts` — mudar import de `Dinheiro`
- [ ] 2.15 Atualizar `src/application/admin/services/CriarValorModificadorUseCase.ts` — mudar import de `Dinheiro`
- [ ] 2.16 Atualizar `src/application/admin/services/AtualizarValorModificadorUseCase.ts` — mudar import de `Dinheiro`
- [ ] 2.17 Atualizar `src/application/admin/services/CriarGrupoModificadorUseCase.ts` — mudar import de `Dinheiro`
- [ ] 2.18 Atualizar `src/application/admin/services/ObterEstatisticasUseCase.ts` — mudar import de `Dinheiro`

### Tests (domain)
- [ ] 2.19 Atualizar `src/tests/unit/domain/cardapio/ItemCardapio.test.ts` — mudar import de `Dinheiro`
- [ ] 2.20 Atualizar `src/tests/unit/domain/cardapio/ModificadorValor.test.ts` — mudar import de `Dinheiro`
- [ ] 2.21 Atualizar `src/tests/unit/domain/cardapio/ModificadorGrupo.test.ts` — mudar import de `Dinheiro`
- [ ] 2.22 Atualizar `src/tests/unit/domain/cardapio/Combo.test.ts` — mudar import de `Dinheiro`
- [ ] 2.23 Atualizar `src/tests/unit/domain/pagamento/Pagamento.test.ts` — mudar import de `Dinheiro`
- [ ] 2.24 Atualizar `src/tests/unit/domain/pedido/Dinheiro.test.ts` — mudar import para `shared` (mover arquivo se necessário)
- [ ] 2.25 Atualizar `src/tests/unit/domain/pedido/ItemPedido.test.ts` — mudar import de `Dinheiro`
- [ ] 2.26 Atualizar `src/tests/unit/domain/pedido/Pedido.test.ts` — mudar import de `Dinheiro`

### Tests (application)
- [ ] 2.27 Atualizar `src/tests/unit/application/pedido/CriarPedidoUseCase.test.ts` — mudar import de `Dinheiro`
- [ ] 2.28 Atualizar `src/tests/unit/application/admin/GerenciarProdutoUseCase.test.ts` — mudar import de `Dinheiro`

## Phase 3: Remover Duplicações — Limpar pedido Domain

### Remover arquivos duplicados
- [ ] 3.1 Remover `src/domain/pedido/value-objects/Dinheiro.ts`
- [ ] 3.2 Remover `src/domain/pedido/value-objects/MetodoPagamento.ts`
- [ ] 3.3 Remover `src/domain/pedido/events/PagamentoConfirmadoEvent.ts`

### Atualizar exports
- [ ] 3.4 Atualizar `src/domain/pedido/events/index.ts` — remover export de `PagamentoConfirmadoEvent`
- [ ] 3.5 Atualizar `src/domain/pedido/value-objects/index.ts` — remover exports de `Dinheiro` e `MetodoPagamento`
- [ ] 3.6 Verificar se `src/domain/pedido/value-objects/index.ts` está vazio — se sim, remover arquivo e atualizar import no `index.ts` do domain

## Phase 4: Verificação — Build e Testes

### Verificações manuais
- [ ] 4.1 Executar `grep -r "class Dinheiro" src/domain/` — deve retornar apenas 1 resultado em `shared/`
- [ ] 4.2 Executar `grep -r "from '@/domain/pedido/value-objects/Dinheiro'" src/` — deve retornar 0 resultados
- [ ] 4.3 Executar `grep -r "from '@/domain/pedido/value-objects/MetodoPagamento'" src/` — deve retornar 0 resultados
- [ ] 4.4 Executar `grep -r "PagamentoConfirmadoEvent" src/domain/pedido/` — deve retornar 0 resultados (exceto se referenciado em testes antigos)

### Build e testes
- [ ] 4.5 Executar `npm run build` — deve completar sem erros
- [ ] 4.6 Executar `npm run test` — todos os testes devem passar
- [ ] 4.7 Verificar cobertura mantida (80%+)

### Commit
- [ ] 4.8 Commitar mudanças com mensagem convencional:
  ```
  refactor!: consolidate DDD value objects and events

  - Move Dinheiro to shared/domain
  - Remove duplicate MetodoPagamento from pedido
  - Remove duplicate PagamentoConfirmadoEvent from pedido
  - Update 38+ imports across domain, infrastructure, and tests
  ```
