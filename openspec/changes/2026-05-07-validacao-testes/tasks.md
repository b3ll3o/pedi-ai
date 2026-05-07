# Tasks: Validação Completa de Testes

## Fase 1: Unit Tests — Domain Entities & Value Objects

### 1.1 Autenticação Domain

- [ ] `tests/unit/domain/autenticacao/entities/Usuario.test.ts`
  - Criar usuário com dados válidos
  - Validar email format
  - Validar senha strength
  - Testar papéis (dono, gerente, atendente, cliente)

- [ ] `tests/unit/domain/autenticacao/entities/Sessao.test.ts`
  - Criar sessão com expiração
  - Validar sessão expirada
  - Testar renovação de sessão

- [ ] `tests/unit/domain/autenticacao/value-objects/Papel.test.ts`
  - Criar Papel com valores válidos (dono, gerente, atendente, cliente)
  - Rejeitar valor inválido
  - Testar comparação de igualdade

- [ ] `tests/unit/domain/autenticacao/value-objects/Credenciais.test.ts`
  - Validar email format
  - Validar senha mínimo 6 caracteres
  - Testar validação customizada

### 1.2 Cardápio Domain

- [ ] `tests/unit/domain/cardapio/entities/Categoria.test.ts`
  - Criar categoria com dados válidos
  - Validar ordenação
  - Testar ativação/desativação

- [ ] `tests/unit/domain/cardapio/entities/ItemCardapio.test.ts`
  - Criar produto com dados válidos
  - Validar tipo (produto/combo)
  - Testar labels dietéticos
  - Validar preço > 0

- [ ] `tests/unit/domain/cardapio/entities/Combo.test.ts`
  - Criar combo com itens
  - Calcular preço bundle vs. soma individual
  - Validar combo com itens vazios

- [ ] `tests/unit/domain/cardapio/value-objects/LabelDietetico.test.ts`
  - Criar label com valores válidos
  - Testar labels compostos

- [ ] `tests/unit/domain/cardapio/aggregates/ModificadorGrupoAggregate.test.ts`
  - Adicionar modificador a grupo
  - Validar min/max selections
  - Testar grupo obrigatório sem seleção
  - Validar seleção além do máximo

- [ ] `tests/unit/domain/cardapio/aggregates/ComboAggregate.test.ts`
  - Calcular economia do bundle
  - Validar itens do combo
  - Testar remoção de item do combo

### 1.3 Mesa Domain

- [ ] `tests/unit/domain/mesa/entities/Mesa.test.ts`
  - Criar mesa com dados válidos
  - Gerar QR code payload
  - Validar assinatura do QR code
  - Testar mesa ativa/inativa

- [ ] `tests/unit/domain/mesa/aggregates/MesaAggregate.test.ts`
  - Gerar QR code com assinatura
  - Validar QR code (assinatura válida)
  - Rejeitar QR code com assinatura inválida
  - Testar labels únicos por restaurante

### 1.4 Pedido Domain

- [ ] `tests/unit/domain/pedido/entities/Pedido.test.ts`
  - Criar pedido com itens válidos
  - Validar transição de status (FSM)
  - Rejeitar transição inválida (ex: delivered → preparing)
  - Calcular total
  - Testar histórico de status

- [ ] `tests/unit/domain/pedido/entities/ItemPedido.test.ts`
  - Criar item com modificadores
  - Calcular subtotal (preço × quantidade + modificadores)
  - Validar quantidade > 0

- [ ] `tests/unit/domain/pedido/value-objects/StatusPedido.test.ts`
  - Criar status com valores válidos
  - Rejeitar status inválido
  - Testar transições válidas
  - Validar estados terminais (delivered, cancelled)

- [ ] `tests/unit/domain/pedido/aggregates/PedidoAggregate.test.ts`
  - Criar pedido via aggregate
  - Adicionar itens
  - Validar pelo menos 1 item
  - Testar transição de status via aggregate
  - Validar cancelamento

- [ ] `tests/unit/domain/pedido/aggregates/CarrinhoAggregate.test.ts`
  - Criar carrinho vazio
  - Adicionar item simples
  - Adicionar item com modificadores
  - Validar modificadores obrigatórios
  - Atualizar quantidade
  - Remover item
  - Calcular total
  - Limpar carrinho
  - Converter carrinho em pedido (toPedido)

### 1.5 Pagamento Domain

- [ ] `tests/unit/domain/pagamento/entities/Pagamento.test.ts`
  - Criar pagamento Pix
  - Validar transições de status
  - Testar idempotência (webhook duplicado)

- [ ] `tests/unit/domain/pagamento/entities/Transacao.test.ts`
  - Criar transação
  - Validar tipos (charge, refund)
  - Testar status da transação

- [ ] `tests/unit/domain/pagamento/value-objects/MetodoPagamento.test.ts`
  - Criar com valor válido (pix)
  - Rejeitar valor inválido

- [ ] `tests/unit/domain/pagamento/value-objects/StatusPagamento.test.ts`
  - Criar com valores válidos
  - Validar transições

- [ ] `tests/unit/domain/pagamento/aggregates/PagamentoAggregate.test.ts`
  - Criar Pix charge
  - Processar confirmação
  - Processar falha
  - Iniciar reembolso

### 1.6 Shared Domain

- [ ] `tests/unit/domain/shared/value-objects/Dinheiro.test.ts`
  - Criar com valor e moeda
  - Operações de soma/subtração
  - Multiplicação por quantidade
  - Formatação BRL
  - Comparação de igualdade
  - Validar valor negativo

---

## Fase 2: Unit Tests — Application Use Cases

### 2.1 Autenticação Application

- [ ] `tests/unit/application/autenticacao/services/AutenticarUsuarioUseCase.test.ts`
  - Autenticar com credenciais válidas
  - Rejeitar credenciais inválidas
  - Retornar sessão criada
  - Testar idempotência

- [ ] `tests/unit/application/autenticacao/services/RegistrarUsuarioUseCase.test.ts`
  - Registrar novo usuário
  - Atribuir papel correto baseado na intent
  - Rejeitar email duplicado

- [ ] `tests/unit/application/autenticacao/services/RedefinirSenhaUseCase.test.ts`
  - Solicitar redefinição
  - Redefinir com token válido
  - Rejeitar token expirado

### 2.2 Cardápio Application

- [ ] `tests/unit/application/cardapio/services/ListarCardapioUseCase.test.ts`
  - Listar categorias ativas
  - Listar produtos por categoria
  - Filtrar por restaurante
  - Ordenar por display_order

- [ ] `tests/unit/application/cardapio/services/ObterDetalheProdutoUseCase.test.ts`
  - Obter produto com modificadores
  - Obter combo com itens
  - Produto não encontrado

- [ ] `tests/unit/application/cardapio/services/CriarComboUseCase.test.ts`
  - Criar combo com itens válidos
  - Validar preço bundle
  - Rejeitar combo sem itens

### 2.3 Mesa Application

- [ ] `tests/unit/application/mesa/services/CriarMesaUseCase.test.ts`
  - Criar mesa com label único
  - Gerar QR code automaticamente
  - Rejeitar label duplicado

- [ ] `tests/unit/application/mesa/services/ValidarQRCodeUseCase.test.ts`
  - QR code válido → retorna mesa
  - QR code com assinatura inválida → rejeita
  - Mesa inativa → rejeita

### 2.4 Pedido Application

- [ ] `tests/unit/application/pedido/services/CriarPedidoUseCase.test.ts`
  - Criar pedido a partir do carrinho
  - Validar restaurantId
  - Associar mesa
  - Persistir com status pending_payment
  - Limpar carrinho após criação

- [ ] `tests/unit/application/pedido/services/AlterarStatusPedidoUseCase.test.ts`
  - Alterar status válido
  - Rejeitar transição inválida
  - Registrar histórico
  - Notificar eventos

- [ ] `tests/unit/application/pedido/services/ObterHistoricoPedidosUseCase.test.ts`
  - Listar pedidos do cliente
  - Ordenar por data decrescente
  - Filtrar por período

### 2.5 Pagamento Application

- [ ] `tests/unit/application/pagamento/services/CriarPixChargeUseCase.test.ts`
  - Criar Pix charge com valor correto
  - Retornar QR code data
  - Configurar timeout de 60s

- [ ] `tests/unit/application/pagamento/services/ProcessarWebhookUseCase.test.ts`
  - Processar webhook válido
  - Validar assinatura do webhook
  - Ignorar webhook duplicado (idempotência)
  - Atualizar status do pagamento
  - Emitir evento PagamentoConfirmado

- [ ] `tests/unit/application/pagamento/services/IniciarReembolsoUseCase.test.ts`
  - Iniciar reembolso
  - Atualizar status para refunded
  - Emitir evento

---

## Fase 3: Integration Tests — Repositories

### 3.1 Database Setup

- [ ] Configurar Dexie in-memory para testes
- [ ] Criar factory de dados de teste
- [ ] Setup/teardown de cada test suite

### 3.2 Repositories

- [ ] `tests/unit/integration/persistence/autenticacao/UsuarioRepository.test.ts`
  - Salvar e buscar usuário por email
  - Atualizar usuário

- [ ] `tests/unit/integration/persistence/cardapio/CategoriaRepository.test.ts`
  - CRUD completo de categoria
  - Listar ativas por restaurante

- [ ] `tests/unit/integration/persistence/cardapio/ItemCardapioRepository.test.ts`
  - CRUD de produto
  - Buscar por categoria
  - Buscar combos

- [ ] `tests/unit/integration/persistence/mesa/MesaRepository.test.ts`
  - CRUD de mesa
  - Buscar por restaurante

- [ ] `tests/unit/integration/persistence/pedido/PedidoRepository.test.ts`
  - Salvar pedido com itens
  - Buscar por ID
  - Buscar por clienteId
  - Buscar por mesaId
  - Atualizar status

- [ ] `tests/unit/integration/persistence/pedido/CarrinhoRepository.test.ts`
  - Salvar carrinho
  - Recuperar carrinho por cliente
  - Limpar carrinho

- [ ] `tests/unit/integration/persistence/pagamento/PagamentoRepository.test.ts`
  - Salvar pagamento
  - Buscar por pedidoId
  - Atualizar status

---

## Fase 4: Integration Tests — API Routes

### 4.1 Setup

- [ ] Configurar handler de API com mock do Supabase
- [ ] Criar factories de request/response

### 4.2 API Routes

- [ ] `tests/integration/api/restaurants.test.ts`
  - GET /api/restaurants — listar restaurantes ativos
  - GET /api/restaurants/:id — detalhes do restaurante

- [ ] `tests/integration/api/categories.test.ts`
  - GET /api/categories — listar por restaurante
  - POST /api/categories — criar (auth requerida)
  - PUT /api/categories/:id — atualizar
  - DELETE /api/categories/:id — soft delete

- [ ] `tests/integration/api/products.test.ts`
  - GET /api/products — listar por restaurante
  - POST /api/products — criar
  - PUT /api/products/:id — atualizar
  - DELETE /api/products/:id — soft delete

- [ ] `tests/integration/api/orders.test.ts`
  - GET /api/orders — listar (filtros)
  - GET /api/orders/:id — detalhes
  - POST /api/orders — criar pedido
  - PATCH /api/orders/:id/status — alterar status

- [ ] `tests/integration/api/webhooks/pix.test.ts`
  - POST /api/webhooks/pix — processar webhook
  - Validar assinatura
  - Idempotência

---

## Fase 5: E2E — Completar Fluxos Faltantes

### 5.1 Customer Flows

- [ ] Fluxo 13: Offline (cache do cardápio) — `tests/customer/offline.spec.ts` ✅
- [ ] Fluxo 14: Offline (pedido offline + sync) — expandir offline.spec.ts
- [ ] Fluxo 15: Reordenação — adicionar a order.spec.ts
- [ ] Fluxo 16: Histórico — expandir order.spec.ts

### 5.2 Admin Flows

- [ ] Fluxo 3: Gerenciamento de equipe — criar team.spec.ts
- [ ] Fluxo 4: Convite de membro — adicionar a team.spec.ts
- [ ] Fluxo 15: Recuperação de senha — criar admin-password-recovery.spec.ts

---

## Fase 6: CI/CD Integration

### 6.1 GitHub Actions

- [ ] Adicionar job `unit-tests` ao workflow
- [ ] Adicionar job `integration-tests` ao workflow
- [ ] Configurar Codecov upload
- [ ] Adicionar coverage gate (min 80%)

### 6.2 Coverage Configuration

- [ ] Configurar `vitest.config.ts` com coverage
- [ ] Configurar threshold por métrica (80%)
- [ ] Adicionar script `test:coverage:check`

### 6.3 Sharding (se necessário)

- [ ] Configurar playwright shards (4 shards)
- [ ] Aggregar resultados após shards
