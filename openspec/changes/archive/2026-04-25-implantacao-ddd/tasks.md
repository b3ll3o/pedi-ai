# Tasks: Implementação de Arquitetura DDD

## Phase 1: Foundation

- [x] 1.1 Criar estrutura de diretórios `src/domain/shared/`
- [x] 1.2 Criar `src/domain/shared/types/Entity.ts` — interface base para entidades
- [x] 1.3 Criar `src/domain/shared/types/ValueObject.ts` — interface base para value objects
- [x] 1.4 Criar `src/domain/shared/types/AggregateRoot.ts` — interface base para aggregates
- [x] 1.5 Criar `src/domain/shared/events/DomainEvent.ts` — interface base para eventos
- [x] 1.6 Criar `src/domain/shared/events/EventDispatcher.ts` — dispatcher singleton para eventos
- [x] 1.7 Criar `src/domain/shared/index.ts` — exports compartilhados
- [x] 1.8 Criar `src/application/shared/types/UseCase.ts` — interface base para use cases
- [x] 1.9 Criar `src/application/shared/index.ts` — exports compartilhados
- [x] 1.10 Criar `src/infrastructure/persistence/schema.ts` — schema Dexie unificado
- [x] 1.11 Mover `src/lib/offline/db.ts` para `src/infrastructure/persistence/database.ts`
- [x] 1.12 Configurar ESLint: bloquear imports de `react`, `next`, `infrastructure`, `presentation` em `domain/`
- [x] 1.13 Atualizar `tsconfig.json` com path aliases para nova estrutura
- [x] 1.14 Verificar que `npm run build` passa com nova estrutura base

---

## Phase 2: Domain Layer

### 2.1 Pedido Bounded Context

- [x] 2.1.1 Criar `src/domain/pedido/entities/Pedido.ts`
- [x] 2.1.2 Criar `src/domain/pedido/entities/ItemPedido.ts`
- [x] 2.1.3 Criar `src/domain/pedido/value-objects/StatusPedido.ts`
- [x] 2.1.4 Criar `src/domain/pedido/value-objects/Dinheiro.ts`
- [x] 2.1.5 Criar `src/domain/pedido/value-objects/MetodoPagamento.ts`
- [x] 2.1.6 Criar `src/domain/pedido/aggregates/PedidoAggregate.ts`
- [x] 2.1.7 Criar `src/domain/pedido/aggregates/CarrinhoAggregate.ts`
- [x] 2.1.8 Criar `src/domain/pedido/events/PedidoCriadoEvent.ts`
- [x] 2.1.9 Criar `src/domain/pedido/events/PedidoStatusAlteradoEvent.ts`
- [x] 2.1.10 Criar `src/domain/pedido/events/PagamentoConfirmadoEvent.ts`
- [x] 2.1.11 Criar `src/domain/pedido/services/CalculadoraTotal.ts`
- [x] 2.1.12 Criar `src/domain/pedido/repositories/IPedidoRepository.ts`
- [x] 2.1.13 Criar `src/domain/pedido/repositories/ICarrinhoRepository.ts`
- [x] 2.1.14 Criar `src/domain/pedido/index.ts`

### 2.2 Cardápio Bounded Context

- [x] 2.2.1 Criar `src/domain/cardapio/entities/Categoria.ts`
- [x] 2.2.2 Criar `src/domain/cardapio/entities/ItemCardapio.ts`
- [x] 2.2.3 Criar `src/domain/cardapio/entities/Combo.ts`
- [x] 2.2.4 Criar `src/domain/cardapio/entities/ModificadorValor.ts`
- [x] 2.2.5 Criar `src/domain/cardapio/entities/ModificadorGrupo.ts`
- [x] 2.2.6 Criar `src/domain/cardapio/value-objects/TipoItemCardapio.ts`
- [x] 2.2.7 Criar `src/domain/cardapio/value-objects/LabelDietetico.ts`
- [x] 2.2.8 Criar `src/domain/cardapio/aggregates/ModificadorGrupoAggregate.ts`
- [x] 2.2.9 Criar `src/domain/cardapio/aggregates/ComboAggregate.ts`
- [x] 2.2.10 Criar `src/domain/cardapio/events/CardapioAtualizadoEvent.ts`
- [x] 2.2.11 Criar `src/domain/cardapio/repositories/ICategoriaRepository.ts`
- [x] 2.2.12 Criar `src/domain/cardapio/repositories/IItemCardapioRepository.ts`
- [x] 2.2.13 Criar `src/domain/cardapio/repositories/IModificadorGrupoRepository.ts`
- [x] 2.2.14 Criar `src/domain/cardapio/index.ts`

### 2.3 Mesa Bounded Context

- [x] 2.3.1 Criar `src/domain/mesa/entities/Mesa.ts`
- [x] 2.3.2 Criar `src/domain/mesa/value-objects/QRCodePayload.ts`
- [x] 2.3.3 Criar `src/domain/mesa/aggregates/MesaAggregate.ts`
- [x] 2.3.4 Criar `src/domain/mesa/events/MesaCriadaEvent.ts`
- [x] 2.3.5 Criar `src/domain/mesa/events/MesaDesativadaEvent.ts`
- [x] 2.3.6 Criar `src/domain/mesa/repositories/IMesaRepository.ts`
- [x] 2.3.7 Criar `src/domain/mesa/index.ts`

### 2.4 Pagamento Bounded Context

- [x] 2.4.1 Criar `src/domain/pagamento/entities/Pagamento.ts`
- [x] 2.4.2 Criar `src/domain/pagamento/entities/Transacao.ts`
- [x] 2.4.3 Criar `src/domain/pagamento/value-objects/MetodoPagamento.ts`
- [x] 2.4.4 Criar `src/domain/pagamento/value-objects/StatusPagamento.ts`
- [x] 2.4.5 Criar `src/domain/pagamento/aggregates/PagamentoAggregate.ts`
- [x] 2.4.6 Criar `src/domain/pagamento/events/PagamentoConfirmadoEvent.ts`
- [x] 2.4.7 Criar `src/domain/pagamento/events/PagamentoFalhouEvent.ts`
- [x] 2.4.8 Criar `src/domain/pagamento/events/ReembolsoIniciadoEvent.ts`
- [x] 2.4.9 Criar `src/domain/pagamento/events/ReembolsoConfirmadoEvent.ts`
- [x] 2.4.10 Criar `src/domain/pagamento/repositories/IPagamentoRepository.ts`
- [x] 2.4.11 Criar `src/domain/pagamento/repositories/ITransacaoRepository.ts`
- [x] 2.4.12 Criar `src/domain/pagamento/index.ts`

### 2.5 Autenticação Bounded Context

- [x] 2.5.1 Criar `src/domain/autenticacao/entities/Usuario.ts`
- [x] 2.5.2 Criar `src/domain/autenticacao/entities/Sessao.ts`
- [x] 2.5.3 Criar `src/domain/autenticacao/value-objects/Papel.ts`
- [x] 2.5.4 Criar `src/domain/autenticacao/value-objects/Credenciais.ts`
- [x] 2.5.5 Criar `src/domain/autenticacao/aggregates/UsuarioAggregate.ts`
- [x] 2.5.6 Criar `src/domain/autenticacao/events/UsuarioCriadoEvent.ts`
- [x] 2.5.7 Criar `src/domain/autenticacao/events/SessaoCriadaEvent.ts`
- [x] 2.5.8 Criar `src/domain/autenticacao/events/SessaoExpiradaEvent.ts`
- [x] 2.5.9 Criar `src/domain/autenticacao/repositories/IUsuarioRepository.ts`
- [x] 2.5.10 Criar `src/domain/autenticacao/repositories/ISessaoRepository.ts`
- [x] 2.5.11 Criar `src/domain/autenticacao/index.ts`

### 2.6 Admin Bounded Context

- [x] 2.6.1 Criar `src/domain/admin/entities/Restaurante.ts`
- [x] 2.6.2 Criar `src/domain/admin/value-objects/ConfiguracoesRestaurante.ts`
- [x] 2.6.3 Criar `src/domain/admin/value-objects/Estatisticas.ts`
- [x] 2.6.4 Criar `src/domain/admin/aggregates/AdminAggregate.ts`
- [x] 2.6.5 Criar `src/domain/admin/events/RestauranteAtualizadoEvent.ts`
- [x] 2.6.6 Criar `src/domain/admin/repositories/IRestauranteRepository.ts`
- [x] 2.6.7 Criar `src/domain/admin/repositories/IEstatisticasRepository.ts`
- [x] 2.6.8 Criar `src/domain/admin/index.ts`

---

## Phase 3: Application Layer

### 3.1 Pedido Application Services

- [x] 3.1.1 Criar `src/application/pedido/services/CriarPedidoUseCase.ts`
- [x] 3.1.2 Criar `src/application/pedido/services/AlterarStatusPedidoUseCase.ts`
- [x] 3.1.3 Criar `src/application/pedido/services/ObterHistoricoPedidosUseCase.ts`
- [x] 3.1.4 Criar `src/application/pedido/services/FinalizarPedidoUseCase.ts`
- [x] 3.1.5 Criar `src/application/pedido/index.ts`

### 3.2 Cardápio Application Services

- [x] 3.2.1 Criar `src/application/cardapio/services/ListarCardapioUseCase.ts`
- [x] 3.2.2 Criar `src/application/cardapio/services/ObterDetalheProdutoUseCase.ts`
- [x] 3.2.3 Criar `src/application/cardapio/services/CriarComboUseCase.ts`
- [x] 3.2.4 Criar `src/application/cardapio/services/ListarCategoriasUseCase.ts`
- [x] 3.2.5 Criar `src/application/cardapio/index.ts`

### 3.3 Mesa Application Services

- [x] 3.3.1 Criar `src/application/mesa/services/CriarMesaUseCase.ts`
- [x] 3.3.2 Criar `src/application/mesa/services/ValidarQRCodeUseCase.ts`
- [x] 3.3.3 Criar `src/application/mesa/services/ListarMesasUseCase.ts`
- [x] 3.3.4 Criar `src/application/mesa/index.ts`

### 3.4 Pagamento Application Services

- [x] 3.4.1 Criar `src/application/pagamento/services/CriarPixChargeUseCase.ts`
- [x] 3.4.2 Criar `src/application/pagamento/services/CriarStripePaymentIntentUseCase.ts`
- [x] 3.4.3 Criar `src/application/pagamento/services/ProcessarWebhookUseCase.ts`
- [x] 3.4.4 Criar `src/application/pagamento/services/IniciarReembolsoUseCase.ts`
- [x] 3.4.5 Criar `src/application/pagamento/index.ts`

### 3.5 Autenticação Application Services

- [x] 3.5.1 Criar `src/application/autenticacao/services/RegistrarUsuarioUseCase.ts`
- [x] 3.5.2 Criar `src/application/autenticacao/services/AutenticarUsuarioUseCase.ts`
- [x] 3.5.3 Criar `src/application/autenticacao/services/ValidarSessaoUseCase.ts`
- [x] 3.5.4 Criar `src/application/autenticacao/services/RedefinirSenhaUseCase.ts`
- [x] 3.5.5 Criar `src/application/autenticacao/index.ts`

### 3.6 Admin Application Services

- [x] 3.6.1 Criar `src/application/admin/services/GerenciarCategoriaUseCase.ts`
- [x] 3.6.2 Criar `src/application/admin/services/GerenciarProdutoUseCase.ts`
- [x] 3.6.3 Criar `src/application/admin/services/GerenciarMesaUseCase.ts`
- [x] 3.6.4 Criar `src/application/admin/services/ObterEstatisticasUseCase.ts`
- [x] 3.6.5 Criar `src/application/admin/services/GerenciarPedidosAdminUseCase.ts`
- [x] 3.6.6 Criar `src/application/admin/index.ts`

---

## Phase 4: Infrastructure Layer

### 4.1 Pedido Infrastructure (Persistence)

- [x] 4.1.1 Criar `src/infrastructure/persistence/pedido/PedidoRepository.ts`
- [x] 4.1.2 Criar `src/infrastructure/persistence/pedido/CarrinhoRepository.ts`
- [x] 4.1.3 Criar `src/infrastructure/persistence/pedido/schema.ts`
- [x] 4.1.4 Criar `src/infrastructure/persistence/pedido/index.ts`

### 4.2 Cardápio Infrastructure (Persistence)

- [x] 4.2.1 Criar `src/infrastructure/persistence/cardapio/CategoriaRepository.ts`
- [x] 4.2.2 Criar `src/infrastructure/persistence/cardapio/ItemCardapioRepository.ts`
- [x] 4.2.3 Criar `src/infrastructure/persistence/cardapio/ModificadorGrupoRepository.ts`
- [x] 4.2.4 Criar `src/infrastructure/persistence/cardapio/CardapioSyncService.ts`
- [x] 4.2.5 Criar `src/infrastructure/persistence/cardapio/index.ts`

### 4.3 Mesa Infrastructure (Persistence)

- [x] 4.3.1 Criar `src/infrastructure/persistence/mesa/MesaRepository.ts`
- [x] 4.3.2 Criar `src/infrastructure/persistence/mesa/index.ts`

### 4.4 Pagamento Infrastructure (Persistence + External)

- [x] 4.4.1 Criar `src/infrastructure/persistence/pagamento/PagamentoRepository.ts`
- [x] 4.4.2 Criar `src/infrastructure/persistence/pagamento/TransacaoRepository.ts`
- [x] 4.4.3 Criar `src/infrastructure/persistence/pagamento/index.ts`
- [x] 4.4.4 Criar `src/infrastructure/external/PixAdapter.ts`
- [x] 4.4.5 Criar `src/infrastructure/external/StripeAdapter.ts`
- [x] 4.4.6 Criar `src/infrastructure/external/index.ts`

### 4.5 Autenticação Infrastructure (Persistence + External)

- [x] 4.5.1 Criar `src/infrastructure/persistence/autenticacao/UsuarioRepository.ts`
- [x] 4.5.2 Criar `src/infrastructure/persistence/autenticacao/SessaoRepository.ts`
- [x] 4.5.3 Criar `src/infrastructure/persistence/autenticacao/index.ts`
- [x] 4.5.4 Criar `src/infrastructure/external/SupabaseAuthAdapter.ts`
- [x] 4.5.5 Atualizar `src/infrastructure/external/index.ts` com SupabaseAuthAdapter

### 4.6 Admin Infrastructure (Persistence)

- [x] 4.6.1 Criar `src/infrastructure/persistence/admin/RestauranteRepository.ts`
- [x] 4.6.2 Criar `src/infrastructure/persistence/admin/EstatisticasRepository.ts`
- [x] 4.6.3 Criar `src/infrastructure/persistence/admin/index.ts`

---

## Phase 5: Presentation Layer

### 5.1 Migrar Presentation - Pedido

- [ ] 5.1.1 Migrar `src/presentation/hooks/usePedido.ts` — usar CriarPedidoUseCase e AlterarStatusPedidoUseCase
- [ ] 5.1.2 Migrar `src/presentation/hooks/useCarrinho.ts` — usar CarrinhoAggregate via ICarrinhoRepository
- [ ] 5.1.3 Refatorar `src/presentation/pages/checkout/page.tsx` — delegar para hooks que usam use cases
- [ ] 5.1.4 Refatorar `src/presentation/pages/pedidos/page.tsx` — delegar para ObterHistoricoPedidosUseCase
- [ ] 5.1.5 Refatorar `src/presentation/pages/pedido/[id]/page.tsx` — delegar para use cases

### 5.2 Migrar Presentation - Cardápio

- [ ] 5.2.1 Migrar `src/presentation/hooks/useCardapio.ts` — usar ListarCardapioUseCase
- [ ] 5.2.2 Migrar `src/presentation/hooks/useProduto.ts` — usar ObterDetalheProdutoUseCase
- [ ] 5.2.3 Refatorar `src/presentation/pages/cardapio/page.tsx` — delegar para use cases
- [ ] 5.2.4 Refatorar `src/presentation/components/cardapio/` — componentes devem apenas renderizar

### 5.3 Migrar Presentation - Mesa

- [ ] 5.3.1 Migrar `src/presentation/hooks/useMesa.ts` — usar ListarMesasUseCase e ValidarQRCodeUseCase
- [ ] 5.3.2 Refatorar `src/presentation/pagesmesa/[id]/page.tsx` — delegar para ValidarQRCodeUseCase
- [ ] 5.3.3 Refatorar `src/presentation/pages/admin/mesas/page.tsx` — delegar para use cases

### 5.4 Migrar Presentation - Pagamento

- [ ] 5.4.1 Migrar `src/presentation/hooks/usePagamento.ts` — usar CriarPixChargeUseCase e CriarStripePaymentIntentUseCase
- [ ] 5.4.2 Refatorar `src/presentation/components/payment/` — componentes devem apenas renderizar
- [ ] 5.4.3 Refatorar `src/presentation/pages/api/webhooks/pagamento.ts` — delegar para ProcessarWebhookUseCase

### 5.5 Migrar Presentation - Autenticação

- [ ] 5.5.1 Migrar `src/presentation/hooks/useAuth.ts` — usar AutenticarUsuarioUseCase e ValidarSessaoUseCase
- [ ] 5.5.2 Migrar `src/presentation/hooks/useRegistro.ts` — usar RegistrarUsuarioUseCase
- [ ] 5.5.3 Refatorar `src/presentation/pages/login/page.tsx` — delegar para hooks → use cases
- [ ] 5.5.4 Refatorar `src/presentation/pages/register/page.tsx` — delegar para hooks → use cases
- [ ] 5.5.5 Atualizar `src/presentation/components/AuthProvider.tsx` — usar AuthContext delegando para application

### 5.6 Migrar Presentation - Admin

- [ ] 5.6.1 Migrar `src/presentation/hooks/useEstatisticas.ts` — usar ObterEstatisticasUseCase
- [ ] 5.6.2 Migrar `src/presentation/hooks/useGerenciarCardapio.ts` — usar GerenciarCategoriaUseCase e GerenciarProdutoUseCase
- [ ] 5.6.3 Migrar `src/presentation/hooks/useGerenciarMesas.ts` — usar GerenciarMesaUseCase
- [ ] 5.6.4 Migrar `src/presentation/hooks/useGerenciarPedidos.ts` — usar GerenciarPedidosAdminUseCase
- [ ] 5.6.5 Refatorar `src/presentation/pages/admin/page.tsx` — delegar para use cases
- [ ] 5.6.6 Refatorar `src/presentation/pages/admin/cardapio/page.tsx` — delegar para GerenciarCardapioUseCase
- [ ] 5.6.7 Refatorar `src/presentation/pages/admin/pedidos/page.tsx` — delegar para GerenciarPedidosAdminUseCase

### 5.7 Atualizar Estrutura de Pastas Presentation

- [ ] 5.7.1 Garantir que `src/presentation/` contém apenas: pages, components, hooks
- [ ] 5.7.2 Mover qualquer lógica de negócio dos components para domain ou application
- [ ] 5.7.3 Atualizar exports em `src/presentation/index.ts` se existir

---

## Phase 6: Verification

### 6.1 Build e Compilação

- [ ] 6.1.1 Executar `npm run build` — verificar que não há erros de compilação
- [ ] 6.1.2 Verificar que `src/domain/` compila standalone (sem React/Next.js)
- [ ] 6.1.3 Verificar que todos os path aliases funcionam corretamente
- [ ] 6.1.4 Verificar que ESLint não reporta violações de dependências entre camadas

### 6.2 Testes Unitários

- [ ] 6.2.1 Criar testes unitários para `src/domain/pedido/aggregates/PedidoAggregate.test.ts`
- [ ] 6.2.2 Criar testes unitários para `src/domain/pedido/aggregates/CarrinhoAggregate.test.ts`
- [ ] 6.2.3 Criar testes unitários para `src/domain/cardapio/aggregates/ComboAggregate.test.ts`
- [ ] 6.2.4 Criar testes unitários para `src/domain/mesa/aggregates/MesaAggregate.test.ts`
- [ ] 6.2.5 Criar testes unitários para `src/domain/pagamento/aggregates/PagamentoAggregate.test.ts`
- [ ] 6.2.6 Criar testes unitários para `src/domain/autenticacao/aggregates/UsuarioAggregate.test.ts`
- [ ] 6.2.7 Criar testes unitários para domain value objects (StatusPedido, Dinheiro, etc.)
- [ ] 6.2.8 Criar testes de integração para use cases com InMemoryRepository
- [ ] 6.2.9 Executar `npm run test:coverage` — verificar cobertura ≥ 80%

### 6.3 Testes E2E

- [ ] 6.3.1 Executar todos os testes E2E existentes com Playwright
- [ ] 6.3.2 Verificar fluxo de pedido completo (checkout → pagamento → confirmação)
- [ ] 6.3.3 Verificar fluxo de autenticação (login, logout, registro)
- [ ] 6.3.4 Verificar fluxo admin (CRUD de cardápio, mesas, pedidos)
- [ ] 6.3.5 Verificar funcionamento offline (cardápio disponível, pedidos enfileirados)

### 6.4 Dependências e Limpeza

- [ ] 6.4.1 Deletar `src/services/orderService.ts` — código migrado
- [ ] 6.4.2 Deletar `src/services/tableService.ts` — código migrado
- [ ] 6.4.3 Deletar `src/services/userService.ts` — código migrado
- [ ] 6.4.4 Deletar `src/services/analyticsService.ts` — código migrado
- [ ] 6.4.5 Deletar `src/services/adminOrderService.ts` — código migrado
- [ ] 6.4.6 Deletar `src/lib/qr.ts` — código migrado para domain
- [ ] 6.4.7 Verificar que todos os imports antigos foram atualizados
- [ ] 6.4.8 Atualizar `codemap.md` com nova estrutura DDD

### 6.5 Critérios de Aceitação Finais

- [ ] 6.5.1 Verificar que 100% do código de domínio está em `src/domain/`
- [ ] 6.5.2 Verificar que 100% dos use cases está em `src/application/`
- [ ] 6.5.3 Verificar que 100% das implementações de infraestrutura está em `src/infrastructure/`
- [ ] 6.5.4 Verificar que `src/presentation/` contém apenas renderização e coleta de input
- [ ] 6.5.5 Verificar que `src/domain/` não tem imports de Next.js, React, ou bibliotecas de infra
- [ ] 6.5.6 Verificar que todos os testes unitários passam com cobertura ≥ 80%
- [ ] 6.5.7 Verificar que todos os testes E2E passam
- [ ] 6.5.8 Verificar zero breaking changes na API pública (pages, API routes)

---

## Notas de Execução

1. **Ordem de migração por bounded context**: Pedido → Cardápio → Mesa → Pagamento → Autenticação → Admin
2. **Cada contexto migrado**: criar domain → application → infrastructure → presentation
3. **Manter código antigo commented-by-default** até que o contexto seja oficialmente migrado
4. **Executar testes após cada contexto** antes de prosseguir para o próximo
5. **Rollback por contexto**: revert do merge commit do bounded context afetado se necessário
