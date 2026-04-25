# Design: Implementação de Arquitetura DDD

## Technical Approach

A migração para DDD será **incremental e não-intrusiva**, organizada por bounded context. A estratégia é:

1. **Nova estrutura em paralelo** (`src/domain/`, `src/application/`, `src/infrastructure/`) coexiste com estrutura atual
2. **Cada bounded context é migrado isoladamente** — pedido → cardápio → mesa → pagamento → autenticação → admin
3. **Dependências são invertidas gradualmente** — presentation passa a depender de application (novo) que depende de domain (novo)
4. **Código antigo fica commented-by-default** até que o contexto seja oficialmente migrado

### Princípios de Migração

| Princípio | Descrição |
|-----------|-----------|
| **Isolamento do Domínio** | `src/domain/` não pode importar de nenhuma outra camada (nem React, nem Next.js) |
| **Interfaces como Contratos** | Repositórios são definidos como interfaces em `domain/`, implementados em `infrastructure/` |
| **Injeção de Dependência** | Application services recebem repositórios via construtor |
| **Eventos como Ponte** | Domain events disparam operações assíncronas sem acoplamento direto |
| **Presentation como Camada Fina** | Componentes e páginas apenas renderizam e coletam input |

---

## Architecture Decisions

### Decision: Layer Structure and Dependency Rules

**Choice**: Estrutura de 4 camadas com dependência unidirecional estrita

```
src/
├── domain/                    # REGRAS DE NEGÓCIO - puro, testável, sem deps
│   ├── [bounded-context]/
│   │   ├── entities/
│   │   ├── value-objects/
│   │   ├── aggregates/
│   │   ├── events/
│   │   ├── services/
│   │   └── repositories/       # Interfaces (contratos)
│   └── shared/                # Types, utils compartilhados
├── application/               # CASOS DE USO - orquestração
│   └── [bounded-context]/
│       └── services/
├── infrastructure/            # IMPLEMENTAÇÕES - adapters, repos, APIs
│   ├── persistence/           # Dexie implementations
│   └── external/              # APIs externas (Supabase, Stripe, Pix)
└── presentation/              # NEXT.JS - UI, input do usuário
    ├── pages/
    ├── components/
    └── hooks/
```

**Alternatives considered**:
- 3 camadas (domain, application, infrastructure) sem presentation separada — rejeitado porque Next.js App Router exige estrutura específica em `src/app/`
- Presentation dentro de application — rejeitado porque mistura responsabilidades de UI com orquestração

**Rationale**: A estrutura de 4 camadas permite que `presentation/` seja o mais próximo possível do App Router do Next.js, enquanto domain permanece puro e testável.

**Dependency Rules (enforced by linting)**:
```
domain → (nada)
application → domain + interfaces de infrastructure
infrastructure → domain
presentation → application + (eventualmente) domain types
```

---

### Decision: Domain Code Isolation Strategy (No React/Next.js Imports in Domain)

**Choice**: Domain é 100% isolado de frameworks — apenas TypeScript puro e tipos primitivos.

**Implementation**:
- `src/domain/*` contém apenas arquivos `.ts` (não `.tsx`)
- Regra ESLint: `no-restricted-imports` bloqueia imports de `react`, `next`, `@/infrastructure`, `@/presentation`
- Build separate `domain` package em `packages/domain` (futuro) para garantir zero deps

**Alternatives considered**:
- Usar `React.FC` no domain — rejeitado porque mistura React com lógica de negócio
- Usar `next/dist/*` types — rejeitado porque domain deve funcionar standalone

**Rationale**: Domain isolado permite:
1. Testes unitários sem renderizar React
2. Reutilização em contextos não-Node (ex: edge functions)
3. Refatoração de infra sem tocar regras de negócio

**Example of forbidden pattern**:
```typescript
// ❌ PROIBIDO em src/domain/pedido/entities/Pedido.ts
import { useState } from 'react'           // BLOQUEADO
import { SupabaseClient } from '@supabase/supabase-js'  // BLOQUEADO
import '@/stores/cartStore'               // BLOQUEADO
```

**Correct pattern**:
```typescript
// ✅ PERMITIDO em src/domain/pedido/entities/Pedido.ts
import { DomainEvent } from '@/domain/shared/events/DomainEvent'
import type { IPedidoRepository } from '@/domain/pedido/repositories/IPedidoRepository'
```

---

### Decision: Repository Pattern Implementation (Dexie/IndexedDB)

**Choice**: Repositórios são **interfaces** definidas em `domain/` e **implementadas** em `infrastructure/persistence/` usando Dexie.

**Interface location**: `src/domain/[bounded-context]/repositories/IRepository.ts`
```typescript
// src/domain/pedido/repositories/IPedidoRepository.ts
export interface IPedidoRepository {
  create(pedido: Pedido): Promise<Pedido>;
  findById(id: string): Promise<Pedido | null>;
  findByClienteId(clienteId: string): Promise<Pedido[]>;
  findByMesaId(mesaId: string): Promise<Pedido[]>;
  update(pedido: Pedido): Promise<Pedido>;
  delete(id: string): Promise<void>;
}
```

**Implementation location**: `src/infrastructure/persistence/[bounded-context]/Repository.ts`
```typescript
// src/infrastructure/persistence/pedido/PedidoRepository.ts
import { IPedidoRepository } from '@/domain/pedido/repositories/IPedidoRepository';
import { Pedido } from '@/domain/pedido/entities/Pedido';
import { db } from '@/lib/offline/db';

export class PedidoRepository implements IPedidoRepository {
  async create(pedido: Pedido): Promise<Pedido> {
    await db.pedidos.add(pedido.toPlain());
    return pedido;
  }
  // ... outras implementações
}
```

**Dexie Schema Integration**:
```typescript
// src/infrastructure/persistence/schema.ts
import Dexie from 'dexie';

export class PediDatabase extends Dexie {
  pedido!: Table<PedidoDTO>;
  carrinho!: Table<CarrinhoDTO>;
  // ... outras tabelas
}
```

**Alternatives considered**:
- Repositórios com implementations direto em domain — rejeitado porque viola dependency inversion (domain seria acoplado a Dexie)
- Repositórios apenas em memória para testes — rejeitado porque app precisa persistência offline real

**Rationale**: Repository pattern com Dexie permite:
1. Swap de implementação (ex: IndexedDB → WebSQL) sem mudar domain
2. Testes com repositório em memória
3. Persistência offline offline-first

---

### Decision: How Presentation Layer Accesses Application Layer

**Choice**: Presentation acessa application via **custom hooks** que encapsulam o use case.

```
Presentation Layer
├── pages/           # Componentes de página (Next.js)
├── components/     # Componentes reutilizáveis
└── hooks/           # Custom hooks que chamam application services
```

**Exemplo de Hook Migrado**:
```typescript
// src/presentation/hooks/usePedido.ts (NOVO)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CriarPedidoUseCase } from '@/application/pedido/services/CriarPedidoUseCase';
import { IPedidoRepository } from '@/domain/pedido/repositories/IPedidoRepository';
import { PedidoRepository } from '@/infrastructure/persistence/pedido/PedidoRepository';

const pedidoRepository: IPedidoRepository = new PedidoRepository();
const criarPedidoUseCase = new CriarPedidoUseCase(pedidoRepository);

export function useCriarPedido() {
  return useMutation({
    mutationFn: (params: CriarPedidoParams) => criarPedidoUseCase.execute(params),
  });
}
```

**Exemplo de Page Migrada**:
```typescript
// src/presentation/pages/checkout/page.tsx (MIGRADO)
'use client';
import { useCriarPedido } from '@/presentation/hooks/usePedido';

export default function CheckoutPage() {
  const criarPedido = useCriarPedido();
  
  async function handleSubmit() {
    await criarPedido.mutateAsync({ cart, customerId, tableId, paymentMethod });
  }
  
  // ... renderização
}
```

**Alternatives considered**:
- Pages chamam use cases diretamente (sem hooks) — rejeitado porque mistura UI com lógica de chamada
- Hooks chamam repositories diretamente (sem use cases) — rejeitado porque viola "application" layer

**Rationale**: Hooks como bridge permitem:
1. Reutilização de lógica de chamada em múltiplas páginas
2. Integração natural com React Query (caching, invalidation)
3. Testes de página podem mockar hooks

---

### Decision: Domain Events Implementation Approach

**Choice**: Domain events são **classes imutáveis** com `occurredAt` timestamp, definidos em `domain/shared/events/`.

**Base Event Structure**:
```typescript
// src/domain/shared/events/DomainEvent.ts
export interface DomainEvent {
  readonly eventName: string;
  readonly occurredAt: Date;
  readonly payload: unknown;
}
```

**Concrete Event Example**:
```typescript
// src/domain/pedido/events/PedidoCriadoEvent.ts
import { DomainEvent } from '@/domain/shared/events/DomainEvent';

export interface PedidoCriadoEventPayload {
  pedidoId: string;
  clienteId: string;
  total: number;
}

export class PedidoCriadoEvent implements DomainEvent {
  readonly eventName = 'PedidoCriadoEvent';
  readonly occurredAt: Date;
  readonly payload: PedidoCriadoEventPayload;

  constructor(payload: PedidoCriadoEventPayload) {
    this.occurredAt = new Date();
    this.payload = payload;
  }
}
```

**Event Dispatcher**:
```typescript
// src/domain/shared/events/EventDispatcher.ts
type EventHandler<T extends DomainEvent> = (event: T) => void;

class EventDispatcher {
  private handlers: Map<string, EventHandler<DomainEvent>[]> = new Map();

  register<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void;
  dispatch(event: DomainEvent): void;
}
```

**Integration with Application Layer**:
```typescript
// src/application/pedido/services/CriarPedidoUseCase.ts
export class CriarPedidoUseCase {
  constructor(
    private pedidoRepository: IPedidoRepository,
    private eventDispatcher: EventDispatcher
  ) {}

  async execute(params: CriarPedidoParams): Promise<Pedido> {
    const pedido = PedidoAggregate.criar(params);
    await this.pedidoRepository.create(pedido);
    
    this.eventDispatcher.dispatch(new PedidoCriadoEvent({
      pedidoId: pedido.id,
      clienteId: params.clienteId,
      total: pedido.total.valor,
    }));
    
    return pedido;
  }
}
```

**Alternatives considered**:
- Events como simple const objects — rejeitado porque não permite type safety no payload
- Events disparados via Observable pattern — rejeitado porque adiciona coupling desnecessário

**Rationale**: Domain events permitem:
1. Audit trail de operações
2. Decoupling entre bounded contexts (ex: PedidoCriadoEvent pode trigger sync de analytics)
3. Testes verificam que eventos corretos foram emitidos

---

### Decision: File Organization Within Each Bounded Context

**Choice**: Cada bounded context segue estrutura fixa, mesmo que alguns diretórios estejam vazios inicialmente.

**Directory Structure per Bounded Context**:
```
src/domain/[context]/
├── entities/              # Entidades com identity
│   ├── Pedido.ts
│   └── ItemPedido.ts
├── value-objects/         # Value objects imutáveis
│   ├── StatusPedido.ts
│   └── Dinheiro.ts
├── aggregates/            # Aggregate roots
│   ├── PedidoAggregate.ts
│   └── CarrinhoAggregate.ts
├── events/                # Domain events
│   ├── PedidoCriadoEvent.ts
│   └── PedidoStatusAlteradoEvent.ts
├── services/              # Domain services (regras que não pertencem a entidade)
│   └── CalculadoraFrete.ts
└── repositories/          # Interfaces (contratos)
    ├── IPedidoRepository.ts
    └── ICarrinhoRepository.ts

src/application/[context]/
└── services/              # Use cases
    ├── CriarPedidoUseCase.ts
    └── AlterarStatusPedidoUseCase.ts

src/infrastructure/persistence/[context]/
├── PedidoRepository.ts    # Implementação Dexie
├── CarrinhoRepository.ts
└── schema.ts              # Schema Dexie (se necessário)
```

**File Naming Conventions**:
- Entidades: `NomeEntidade.ts` (ex: `Pedido.ts`)
- Value Objects: `NomeVO.ts` (ex: `StatusPedido.ts`)
- Aggregates: `NomeAggregate.ts` (ex: `PedidoAggregate.ts`)
- Events: `NomeEvent.ts` (ex: `PedidoCriadoEvent.ts`)
- Use Cases: `VerboNomeUseCase.ts` (ex: `CriarPedidoUseCase.ts`)
- Repositories: `INomeRepository.ts` (interface) e `NomeRepository.ts` (impl)

**Alternatives considered**:
- Estrutura plana por context — rejeitado porque dificulta navegação em contexts grandes
- Pasta `domain/` no root — rejeitado porque conflita com Next.js `app/` directory

**Rationale**: Estrutura fixa permite:
1. Localização predictível de arquivos
2. Crescimento ordenado sem refatoração de estrutura
3. Onboarding consistente entre devs

---

## Data Flow

### Fluxo de Dados: Criação de Pedido

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│  src/presentation/pages/checkout/page.tsx                        │
│  src/presentation/hooks/useCriarPedido.ts                       │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ useCriarPedido.mutateAsync()
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                         │
│  src/application/pedido/services/CriarPedidoUseCase.ts          │
│                                                                 │
│  1. Recebe dados do cart (DTOs)                                │
│  2. Valida input (use case)                                    │
│  3. Cria PedidoAggregate com dados validados                    │
│  4. Chama IPedidoRepository.create(pedido)                     │
│  5. Dispara PedidoCriadoEvent                                   │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ IPedidoRepository.create()
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DOMAIN LAYER                            │
│  src/domain/pedido/                                             │
│  ├── entities/Pedido.ts        # Lógica de status transition   │
│  ├── aggregates/PedidoAggregate.ts  # Invariants, factory      │
│  ├── value-objects/Dinheiro.ts # Immutable money type          │
│  └── events/PedidoCriadoEvent.ts # Event payload               │
│                                                                 │
│  ⚠️  ZERO imports de React, Next.js, ou Infrastructure         │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ Implementação concreta
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      INFRASTRUCTURE LAYER                       │
│  src/infrastructure/persistence/pedido/PedidoRepository.ts      │
│  src/infrastructure/persistence/pedido/schema.ts               │
│                                                                 │
│  1. Serializa Pedido → PedidoDTO                               │
│  2. Persiste em IndexedDB via Dexie                            │
│  3. Se online, sync com Supabase                               │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         EXTERNAL APIS                           │
│  Supabase (Database, Auth, Realtime)                            │
│  Stripe/Pix (Pagamento)                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados:qr Code de Mesa

```
Cliente escaneia QR ──▶ Presentation (table/page.tsx)
                              │
                              ▼ useValidarQRCode()
                         Application (mesa/services/)
                              │
                              ▼ ValidarQRCodeUseCase
                         Domain (mesa/MesaAggregate)
                              │ QRCodePayload.validate()
                              ▼
                         Infrastructure (Supabase auth)
```

---

## File Changes

### Fase 1: Estrutura Base (Criação de diretórios e arquivos compartilhados)

**NOVO - A criar**:
```
src/domain/shared/
├── types/
│   ├── Entity.ts              # Base Entity interface
│   ├── ValueObject.ts         # Base VO interface
│   └── AggregateRoot.ts       # Base Aggregate interface
├── events/
│   ├── DomainEvent.ts         # Base event interface
│   └── EventDispatcher.ts     # Singleton event dispatcher
└── index.ts                  # Shared exports

src/application/shared/
├── types/
│   └── UseCase.ts             # Base use case interface
└── di/
    └── Container.ts          # Simple DI container (futuro)

src/infrastructure/persistence/
├── schema.ts                 # Dexie schema unificado
└── database.ts               # PediDatabase class (mover de src/lib/offline/db.ts)
```

**MODIFICADO**:
```
src/lib/offline/db.ts         # Mover para src/infrastructure/persistence/database.ts
```

---

### Fase 2: Bounded Context - Pedido

**NOVO - A criar**:
```
src/domain/pedido/
├── entities/
│   ├── Pedido.ts
│   └── ItemPedido.ts
├── value-objects/
│   ├── StatusPedido.ts
│   ├── Dinheiro.ts
│   └── MetodoPagamento.ts
├── aggregates/
│   ├── PedidoAggregate.ts
│   └── CarrinhoAggregate.ts
├── events/
│   ├── PedidoCriadoEvent.ts
│   ├── PedidoStatusAlteradoEvent.ts
│   └── PagamentoConfirmadoEvent.ts
├── services/
│   └── CalculadoraTotal.ts   # Domain service para cálculo
└── repositories/
    ├── IPedidoRepository.ts
    └── ICarrinhoRepository.ts

src/application/pedido/services/
├── CriarPedidoUseCase.ts
├── AlterarStatusPedidoUseCase.ts
├── ObterHistoricoPedidosUseCase.ts
└── FinalizarPedidoUseCase.ts

src/infrastructure/persistence/pedido/
├── PedidoRepository.ts
├── CarrinhoRepository.ts
└── schemas.ts                # Dexie tables para pedido
```

**A MODIFICAR**:
```
src/services/orderService.ts   # Deprecated - código migrado para domain/application
src/stores/cartStore.ts       # Mantido mas sem lógica de negócio (apenas UI state)
```

---

### Fase 3: Bounded Context - Cardápio

**NOVO - A criar**:
```
src/domain/cardapio/
├── entities/
│   ├── Categoria.ts
│   ├── ItemCardapio.ts
│   ├── Combo.ts
│   └── ModificadorValor.ts
├── value-objects/
│   ├── TipoItemCardapio.ts
│   ├── LabelDietetico.ts
│   └── Preco.ts
├── aggregates/
│   ├── ModificadorGrupoAggregate.ts
│   └── ComboAggregate.ts
├── events/
│   └── CardapioAtualizadoEvent.ts
└── repositories/
    ├── ICategoriaRepository.ts
    ├── IItemCardapioRepository.ts
    └── IModificadorGrupoRepository.ts

src/application/cardapio/services/
├── ListarCardapioUseCase.ts
├── ObterDetalheProdutoUseCase.ts
├── CriarComboUseCase.ts
└── ListarCategoriasUseCase.ts

src/infrastructure/persistence/cardapio/
├── CategoriaRepository.ts
├── ItemCardapioRepository.ts
└── ModificadorGrupoRepository.ts
```

**A MODIFICAR**:
```
src/stores/menuStore.ts        # Mantido para UI state, lógica migrada
src/lib/offline/sync.ts        # Sync service refatorado para usar use cases
```

---

### Fase 4: Bounded Context - Mesa

**NOVO - A criar**:
```
src/domain/mesa/
├── entities/
│   └── Mesa.ts
├── value-objects/
│   └── QRCodePayload.ts
├── aggregates/
│   └── MesaAggregate.ts
├── events/
│   ├── MesaCriadaEvent.ts
│   └── MesaDesativadaEvent.ts
└── repositories/
    └── IMesaRepository.ts

src/application/mesa/services/
├── CriarMesaUseCase.ts
├── ValidarQRCodeUseCase.ts
└── ListarMesasUseCase.ts

src/infrastructure/persistence/mesa/
└── MesaRepository.ts
```

**A MODIFICAR**:
```
src/services/tableService.ts    # Migrado para domain/application
src/lib/qr.ts                   # Lógica de QR migrada para domain
```

---

### Fase 5: Bounded Context - Pagamento

**NOVO - A criar**:
```
src/domain/pagamento/
├── entities/
│   ├── Pagamento.ts
│   └── Transacao.ts
├── value-objects/
│   ├── MetodoPagamento.ts
│   └── StatusPagamento.ts
├── aggregates/
│   └── PagamentoAggregate.ts
├── events/
│   ├── PagamentoConfirmadoEvent.ts
│   ├── PagamentoFalhouEvent.ts
│   ├── ReembolsoIniciadoEvent.ts
│   └── ReembolsoConfirmadoEvent.ts
└── repositories/
    ├── IPagamentoRepository.ts
    └── ITransacaoRepository.ts

src/application/pagamento/services/
├── CriarPixChargeUseCase.ts
├── CriarStripePaymentIntentUseCase.ts
├── ProcessarWebhookUseCase.ts
└── IniciarReembolsoUseCase.ts

src/infrastructure/
├── persistence/pagamento/
│   ├── PagamentoRepository.ts
│   └── TransacaoRepository.ts
└── external/
    ├── PixAdapter.ts
    └── StripeAdapter.ts
```

**A MODIFICAR**:
```
src/components/payment/         # Components migrados para presentation
```

---

### Fase 6: Bounded Context - Autenticação

**NOVO - A criar**:
```
src/domain/autenticacao/
├── entities/
│   ├── Usuario.ts
│   └── Sessao.ts
├── value-objects/
│   ├── Papel.ts
│   └── Credenciais.ts
├── aggregates/
│   └── UsuarioAggregate.ts
├── events/
│   ├── UsuarioCriadoEvent.ts
│   ├── SessaoCriadaEvent.ts
│   └── SessaoExpiradaEvent.ts
└── repositories/
    ├── IUsuarioRepository.ts
    └── ISessaoRepository.ts

src/application/autenticacao/services/
├── RegistrarUsuarioUseCase.ts
├── AutenticarUsuarioUseCase.ts
├── ValidarSessaoUseCase.ts
└── RedefinirSenhaUseCase.ts

src/infrastructure/
├── persistence/autenticacao/
│   ├── UsuarioRepository.ts
│   └── SessaoRepository.ts
└── external/
    └── SupabaseAuthAdapter.ts
```

**A MODIFICAR**:
```
src/lib/auth/                  # Migrado para infrastructure/external
src/middleware.ts              # Atualizado para usar domain entities
```

---

### Fase 7: Bounded Context - Admin

**NOVO - A criar**:
```
src/domain/admin/
├── entities/
│   └── Restaurante.ts
├── value-objects/
│   ├── ConfiguracoesRestaurante.ts
│   └── Estatisticas.ts
├── aggregates/
│   └── AdminAggregate.ts
├── events/
│   └── RestauranteAtualizadoEvent.ts
└── repositories/
    ├── IRestauranteRepository.ts
    └── IEstatisticasRepository.ts

src/application/admin/services/
├── GerenciarCategoriaUseCase.ts
├── GerenciarProdutoUseCase.ts
├── GerenciarMesaUseCase.ts
├── ObterEstatisticasUseCase.ts
└── GerenciarPedidosAdminUseCase.ts

src/infrastructure/persistence/admin/
├── RestauranteRepository.ts
└── EstatisticasRepository.ts
```

**A MODIFICAR**:
```
src/services/adminOrderService.ts  # Migrado
src/services/analyticsService.ts   # Migrado
```

---

### Arquivos para DELETAR (após migração completa)

```
src/services/orderService.ts        # Delete após migração pedido
src/services/tableService.ts        # Delete após migração mesa
src/services/userService.ts         # Delete após migração autenticação
src/services/analyticsService.ts    # Delete após migração admin
src/services/adminOrderService.ts   # Delete após migração admin
src/lib/qr.ts                       # Delete após migração mesa
src/lib/auth/                       # Delete após migração autenticação (substituído por SupabaseAuthAdapter)
```

---

## Interfaces / Contracts

### Repository Interfaces (Domain)

```typescript
// src/domain/pedido/repositories/IPedidoRepository.ts
import { Pedido } from '../entities/Pedido';
export interface IPedidoRepository {
  create(pedido: Pedido): Promise<Pedido>;
  findById(id: string): Promise<Pedido | null>;
  findByClienteId(clienteId: string): Promise<Pedido[]>;
  findByMesaId(mesaId: string): Promise<Pedido[]>;
  findByRestauranteId(restauranteId: string): Promise<Pedido[]>;
  update(pedido: Pedido): Promise<Pedido>;
  delete(id: string): Promise<void>;
}

// src/domain/pedido/repositories/ICarrinhoRepository.ts
import { Carrinho } from '../aggregates/CarrinhoAggregate';
export interface ICarrinhoRepository {
  get(clienteId: string): Promise<Carrinho | null>;
  save(carrinho: Carrinho): Promise<void>;
  clear(clienteId: string): Promise<void>;
}
```

### Domain Event Interface

```typescript
// src/domain/shared/events/DomainEvent.ts
export interface DomainEvent {
  readonly eventName: string;
  readonly occurredAt: Date;
  readonly payload: unknown;
}

// src/domain/shared/events/EventDispatcher.ts
export type EventHandler<T extends DomainEvent> = (event: T) => void;

export class EventDispatcher {
  private static instance: EventDispatcher;
  private handlers = new Map<string, EventHandler<DomainEvent>[]>();

  static getInstance(): EventDispatcher { /* singleton */ }
  
  register<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void;
  
  unregister<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void;
  
  dispatch(event: DomainEvent): void;
  
  clear(): void;
}
```

### Use Case Interface

```typescript
// src/application/shared/types/UseCase.ts
export interface UseCase<Input, Output> {
  execute(input: Input): Promise<Output> | Output;
}
```

### Aggregate Base Interface

```typescript
// src/domain/shared/types/AggregateRoot.ts
export interface AggregateRoot {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
```

---

## Testing Strategy

### Unit Tests (Domain Layer)

**Cobertura**: ≥ 80% (conforme AGENTS.md)

```typescript
// src/domain/pedido/__tests__/PedidoAggregate.test.ts
import { describe, it, expect } from 'vitest';
import { PedidoAggregate } from '../aggregates/PedidoAggregate';

describe('PedidoAggregate', () => {
  describe('criar', () => {
    it('deve criar pedido com itens', () => {
      const pedido = PedidoAggregate.criar({
        clienteId: 'cliente-1',
        mesaId: 'mesa-1',
        itens: [{ produtoId: 'prod-1', quantidade: 2, preco: 10 }],
      });
      
      expect(pedido.itens).toHaveLength(1);
      expect(pedido.status.valor).toBe('pending_payment');
    });
    
    it('deve lançar erro se carrinho vazio', () => {
      expect(() => PedidoAggregate.criar({ clienteId: 'c1', mesaId: 'm1', itens: [] }))
        .toThrow('Pedido deve conter pelo menos um item');
    });
  });
});
```

### Integration Tests (Application Layer)

```typescript
// src/application/pedido/__tests__/CriarPedidoUseCase.test.ts
import { describe, it, expect, vi } from 'vitest';
import { CriarPedidoUseCase } from '../services/CriarPedidoUseCase';
import { PedidoRepository } from '@/infrastructure/persistence/pedido/PedidoRepository';

describe('CriarPedidoUseCase', () => {
  it('deve criar pedido via repository', async () => {
    const mockRepo = { create: vi.fn().mockResolvedValue(pedidoMock) };
    const useCase = new CriarPedidoUseCase(mockRepo);
    
    const result = await useCase.execute(paramsMock);
    
    expect(mockRepo.create).toHaveBeenCalled();
  });
});
```

### E2E Tests (Playwright - existentes)

- **Manter**: Todos os 17 specs E2E existentes
- **Atualizar**: Seletores que mudam com refatoração
- **Adicionar**: Novos specs para fluxos DDD (se necessário)

### Migration Testing

| Fase | Testes |
|------|--------|
| 1. Estrutura base | Verificar que arquivos compilam |
| 2. Pedido | Rodar unit tests + E2E pedido |
| 3. Cardápio | Rodar unit tests + E2E menu |
| ... | ... |
| 7. Admin | Rodar todos os testes |

---

## Migration / Rollout

### Fase 1: Estrutura Base (Semana 1)
**Objetivo**: Criar infraestrutura inicial sem alterar código existente.

1. Criar `src/domain/shared/` com tipos base
2. Criar `src/application/shared/` com UseCase interface
3. Criar `src/infrastructure/persistence/` movendo Dexie setup
4. Configurar ESLint rules para bloquear imports inválidos
5. Criar build script que compila domain standalone

**Critério de saída**: `npm run build` passa com nova estrutura

---

### Fase 2: Pedido (Semana 2-3)
**Objetivo**: Migrar contexto de pedido.

1. Criar todas as entidades, VOs, aggregates em `src/domain/pedido/`
2. Criar interfaces de repository
3. Implementar `PedidoRepository` e `CarrinhoRepository` em Dexie
4. Criar use cases em `src/application/pedido/services/`
5. Migrar `src/services/orderService.ts` → use cases
6. Migrar `src/stores/cartStore.ts` lógica de validação → domain
7. Atualizar hooks em `src/presentation/hooks/` para usar use cases
8. Rodar testes unitários + E2E

**Critério de saída**: 100% dos testes E2E de pedido passam

---

### Fase 3: Cardápio (Semana 4)
**Objetivo**: Migrar contexto de cardápio.

1. Criar `src/domain/cardapio/` (Categoria, ItemCardapio, Combo, etc.)
2. Implementar repositories em Dexie
3. Migrar `src/stores/menuStore.ts` lógica → domain
4. Criar `ListarCardapioUseCase` e `ObterDetalheProdutoUseCase`
5. Migrar sync service

**Critério de saída**: Navegação de cardápio funciona offline

---

### Fase 4: Mesa (Semana 5)
**Objetivo**: Migrar contexto de mesa.

1. Criar `src/domain/mesa/` (Mesa, QRCodePayload)
2. Implementar `MesaRepository`
3. Migrar `src/services/tableService.ts` → use cases
4. Migrar `src/lib/qr.ts` → domain services

**Critério de saída**: QR code de mesa funciona

---

### Fase 5: Pagamento (Semana 6-7)
**Objetivo**: Migrar contexto de pagamento.

1. Criar `src/domain/pagamento/` (Pagamento, Transacao)
2. Implementar adapters para Pix e Stripe
3. Criar webhooks use cases
4. Migrar components de payment

**Critério de saída**: Checkout completo funciona

---

### Fase 6: Autenticação (Semana 8)
**Objetivo**: Migrar contexto de autenticação.

1. Criar `src/domain/autenticacao/` (Usuario, Sessao)
2. Implementar `SupabaseAuthAdapter`
3. Migrar `src/lib/auth/` → infrastructure
4. Atualizar middleware

**Critério de saída**: Login/logout funciona

---

### Fase 7: Admin (Semana 9-10)
**Objetivo**: Migrar contexto admin.

1. Criar `src/domain/admin/` (Restaurante, Estatisticas)
2. Implementar repositories
3. Migrar `src/services/analyticsService.ts`
4. Migrar admin pages

**Critério de saída**: Dashboard admin funciona

---

### Fase 8: Cleanup (Semana 11)
**Objetivo**: Remover código duplicado.

1. Deletar arquivos deprecated
2. Atualizar todos os imports
3. Verificar que todos os testes passam
4. Documentar padrões no codemap.md

---

## Open Questions

| # | Pergunta | Impacto | Recomendação |
|---|----------|--------|--------------|
| 1 | **DI Container** | Precisamos de um container de injeção de dependência (tns Container, TypeDI) ou construtores manuais são suficientes? | Começar com construtores manuais. Se a complexidade crescer, introduzir container no Phase 8. |
| 2 | **Bounded Context "Admin"** | Admin faz cross-context operations. Devemos criar um Application Service que orquestra outros use cases ou cada context expõe admin use cases? | Admin Aggregate é coordinator. `GerenciarPedidosAdminUseCase` chama `AlterarStatusPedidoUseCase` do context pedido. |
| 3 | **Existing Zustand Stores** | Stores atuais (cartStore, menuStore, tableStore) têm UI state E business logic. Devemos dividi-los ou substituí-los completamente? | Dividir: UI state fica no store (Zustand), business logic migra para domain. Store usa hooks que chamam use cases. |
| 4 | **API Routes como Presentation** | API routes (`src/app/api/`) são presentation (recebem requests HTTP) ou infrastructure (implementam detalhes técnicos)? | São **presentation** —，它们 convertem HTTP → Use Case. HTTP parsing e error handling ficam aqui. |
| 5 | **Sync Strategy** | Como domain events interagem com background sync do offline-first? | Evento `PedidoCriado` é emitido localmente. Sync service se inscreve no evento e envia para Supabase. |
| 6 | **Test Doubles** | Como testar use cases sem DB real? Criar `InMemoryPedidoRepository`? | Sim, criar `InMemory*Repository` implementations em `__tests__/` folder. |
| 7 | **React Query Integration** | Use cases retornam Promises. Quem gerencia cache? React Query no hook? | Sim, hooks em presentation usam React Query que chama use cases. Cache keys definiddas no hook. |
| 8 | **Typescript path aliases** | Manter `@/` aliases ou migrar para relative imports em domain? | Manter `@/` para presentation, relative imports OBRIGATÓRIOS em domain para garantir isolation. |
