# Arquitetura DDD - Pedi-AI

> **Versão:** 1.0.0 | **Atualizado:** 2026-04-27 | **Status:** Migração em andamento

---

## 1. Visão Geral da Arquitetura

O Pedi-AI adota uma arquitetura **Domain-Driven Design (DDD)** em 4 camadas, organizada por **Bounded Contexts** (contextos delimitados). Esta estrutura coexiste com a arquitetura tradicional do Next.js, permitindo migração incremental sem interromper o desenvolvimento.

### Princípios Fundamentais

| Princípio | Descrição |
|-----------|-----------|
| **Isolamento do Domínio** | `src/domain/` é puro TypeScript — sem imports de React, Next.js ou bibliotecas de infraestrutura |
| **Inversão de Dependência** | Repositórios são **interfaces** definidas em domain e **implementadas** em infrastructure |
| **Agregados como Fronteira** | Agregados (PedidoAggregate, MesaAggregate) encapsulam invariantes e são a unidade de persistência |
| **Eventos como Ponte** | Domain events disparam operações assíncronas sem acoplamento direto entre contextos |

---

## 2. Diagrama de Arquitetura


```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                                 │
│                                                                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │
│   │   pages/    │  │ components/ │  │   hooks/    │  │   app/api/      │    │
│   │  (Next.js)  │  │  (React)   │  │ (React Q.)  │  │  (API Routes)   │    │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘    │
│                                      │                                       │
│                              useCriarPedido()                                │
│                              useListarCardapio()                             │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            APPLICATION LAYER                                 │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    Use Cases (Serviços)                              │   │
│   │   CriarPedidoUseCase  │  AlterarStatusPedidoUseCase  │  etc.        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Estrutura: src/application/[bounded-context]/services/*.ts                  │
│                                                                              │
│   ⚠️  Depende APENAS de domain + interfaces de infrastructure                │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DOMAIN LAYER                                    │
│                                                                              │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│   │ pedido/  │  │ cardapio │  │   mesa/  │  │pagamento │  │   auth/  │  │
│   │          │  │          │  │          │  │          │  │          │  │
│   │Entities  │  │Entities  │  │Entities  │  │Entities  │  │Entities  │  │
│   │VO        │  │VO        │  │VO        │  │VO        │  │VO        │  │
│   │Aggregate │  │Aggregate │  │Aggregate │  │Aggregate │  │Aggregate │  │
│   │Events    │  │Events    │  │Events    │  │Events    │  │Events    │  │
│   │Services  │  │Services  │  │Services  │  │Services  │  │Services  │  │
│   │Repos*    │  │Repos*    │  │Repos*    │  │Repos*    │  │Repos*    │  │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         shared/                                       │   │
│   │   EntityClass  │  ValueObjectClass  │  AggregateRootClass  │  Events │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ⚠️  ZERO dependências externas — puro TypeScript                          │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INFRASTRUCTURE LAYER                                │
│                                                                              │
│   ┌─────────────────────────────┐    ┌─────────────────────────────────┐    │
│   │     persistence/            │    │          external/               │    │
│   │                             │    │                                  │    │
│   │  pedido/PedidoRepository.ts │    │  SupabaseAuthAdapter.ts         │    │
│   │  pedido/CarrinhoRepository.ts│    │  StripeAdapter.ts               │    │
│   │  cardapio/CategoriaRepo.ts  │    │  PixAdapter.ts                  │    │
│   │  mesa/MesaRepository.ts     │    │  QRCodeCryptoService.ts         │    │
│   │  pagamento/PagamentoRepo.ts │    │                                  │    │
│   │                             │    │                                  │    │
│   │  database.ts (Dexie)        │    │                                  │    │
│   │  schema.ts                  │    │                                  │    │
│   └─────────────────────────────┘    └─────────────────────────────────┘    │
│                                                                              │
│   ⚠️  Implementa interfaces definidas em domain                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL APIS                                       │
│                                                                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                       │
│   │  Supabase   │  │   Stripe    │  │Mercado Pago │                       │
│   │  (Auth +    │  │  (Payments) │  │   (Pix)     │                       │
│   │   Realtime) │  │             │  │             │                       │
│   └─────────────┘  └─────────────┘  └─────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Regras de Dependência (Enforced by Architecture)

```
domain  →  (nada - é o centro da arquitetura)
application  →  domain + interfaces de infrastructure
infrastructure  →  domain
presentation  →  application + (parcialmente) domain types
```

---

## 3. Cada Camada Explicada

### 3.1 Domain Layer (`src/domain/`)

**Propósito:** Contém TODA a lógica de negócio pura — entidades, value objects, aggregates, eventos, serviços de domínio e interfaces de repositório. **Zero dependências externas.**

#### O que vai em cada subdiretório:

| Subdiretório | Conteúdo | Exemplo |
|--------------|----------|---------|
| `entities/` | Entidades com identity (ID único) | `Pedido`, `ItemPedido`, `Mesa`, `Usuario` |
| `value-objects/` | Objetos imutáveis definidos pelos seus atributos | `Dinheiro`, `StatusPedido`, `QRCodePayload`, `Papel` |
| `aggregates/` | Aggregate roots que encapsulam invariantes | `PedidoAggregate`, `CarrinhoAggregate`, `MesaAggregate`, `PagamentoAggregate` |
| `events/` | Domain events — operações que ocorreram | `PedidoCriadoEvent`, `MesaDesativadaEvent`, `PagamentoConfirmadoEvent` |
| `services/` | Regras de negócio que não pertencem a uma entidade específica | `QRCodeValidationService`, `CalculadoraTotal` |
| `repositories/` | **Interfaces** de repositório (contratos, não implementações) | `IPedidoRepository`, `IMesaRepository` |

#### Tipos Base (em `domain/shared/types/`)

```typescript
// Entity - objetos com identity
interface Entity<T> {
  readonly id: string;
  equals(other: Entity<T>): boolean;
}

// ValueObject - objetos imutáveis definidos por atributos
interface ValueObject<T> {
  equals(other: ValueObject<T>): boolean;
}

// AggregateRoot - entidade com timestamps de criação/atualização
interface AggregateRoot<T> extends Entity<T> {
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
```


#### Exemplo: Entity Pedido

```typescript
// src/domain/pedido/entities/Pedido.ts
export class Pedido extends AggregateRootClass<PedidoProps> {
  get clienteId(): string | undefined { return this.props.clienteId; }
  get mesaId(): string | undefined { return this.props.mesaId; }
  get restauranteId(): string { return this.props.restauranteId; }
  get status(): StatusPedido { return this.props.status; }
  get itens(): ItemPedido[] { return [...this.props.itens]; }
  get total(): Dinheiro { return this.props.total; }

  adicionarItem(item: ItemPedido): void { /* ... */ }
  removerItem(itemId: string): void { /* ... */ }
  alterarStatus(novoStatus: StatusPedido): void { /* ... */ }

  static criar(props: Omit<PedidoProps, 'createdAt' | 'updatedAt' | 'subtotal' | 'tax' | 'total'>): Pedido {
    const pedido = new Pedido({ ...props, subtotal: Dinheiro.ZERO, tax: Dinheiro.ZERO, total: Dinheiro.ZERO, createdAt: new Date(), updatedAt: new Date() });
    pedido.atualizarTotais();
    return pedido;
  }
}
```

#### Exemplo: Value Object Dinheiro

```typescript
// src/domain/pedido/value-objects/Dinheiro.ts
export class Dinheiro extends ValueObjectClass<DinheiroValue> {
  static readonly ZERO = new Dinheiro({ valor: 0, moeda: 'BRL' });
  static readonly BRL = 'BRL';

  get reais(): number { return this.props.valor / 100; }
  get valor(): number { return this.props.valor; }
  get moeda(): string { return this.props.moeda; }

  somar(outro: Dinheiro): Dinheiro {
    if (this.props.moeda !== outro.props.moeda) {
      throw new Error('Não é possível somar moedas diferentes');
    }
    return new Dinheiro({ valor: this.props.valor + outro.props.valor, moeda: this.props.moeda });
  }

  multiplicar(fator: number): Dinheiro {
    return new Dinheiro({ valor: Math.round(this.props.valor * fator), moeda: this.props.moeda });
  }

  static criar(valorEmCentavos: number, moeda: string = 'BRL'): Dinheiro {
    return new Dinheiro({ valor: valorEmCentavos, moeda });
  }

  static criarDeReais(valorEmReais: number, moeda: string = 'BRL'): Dinheiro {
    return new Dinheiro({ valor: Math.round(valorEmReais * 100), moeda });
  }
}
```

#### Exemplo: Aggregate PedidoAggregate

```typescript
// src/domain/pedido/aggregates/PedidoAggregate.ts
export class PedidoAggregate {
  private pedido: Pedido;
  private eventDispatcher: EventDispatcher;

  constructor(pedido: Pedido, eventDispatcher?: EventDispatcher) {
    this.pedido = pedido;
    this.eventDispatcher = eventDispatcher ?? EventDispatcher.getInstance();
    this.validarInvariantes();
  }

  private validarInvariantes(): void {
    // Invariante 1: pedido deve ter pelo menos um item
    if (this.pedido.itens.length === 0) {
      throw new Error('Pedido deve ter pelo menos um item');
    }
    // Invariante 2: total deve ser igual a soma de subtotal + tax
    const calculoEsperado = this.pedido.subtotal.somar(this.pedido.tax);
    if (!calculoEsperado.equals(this.pedido.total)) {
      throw new Error('Total do pedido não corresponde à soma do subtotal com tax');
    }
  }

  alterarStatus(novoStatus: StatusPedido): void {
    const statusAnterior = this.pedido.status;
    this.pedido.alterarStatus(novoStatus);
    const event = new PedidoStatusAlteradoEvent(this.pedido, statusAnterior, novoStatus);
    this.eventDispatcher.dispatch(event);
  }

  static criar(props: Omit<PedidoProps, 'createdAt' | 'updatedAt' | 'subtotal' | 'tax' | 'total'>): PedidoAggregate {
    const pedido = Pedido.criar(props);
    const aggregate = new PedidoAggregate(pedido);
    const event = new PedidoCriadoEvent(pedido);
    aggregate.eventDispatcher.dispatch(event);
    return aggregate;
  }
}
```

#### Exemplo: Domain Event

```typescript
// src/domain/pedido/events/PedidoCriadoEvent.ts
export class PedidoCriadoEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'PedidoCriadoEvent';

  constructor(
    public readonly pedido: Pedido,
    occurredOn?: Date
  ) {
    this.occurredOn = occurredOn ?? new Date();
  }
}
```

#### Exemplo: Interface de Repositório (contrato)

```typescript
// src/domain/pedido/repositories/IPedidoRepository.ts
export interface IPedidoRepository {
  create(pedido: Pedido): Promise<Pedido>;
  findById(id: string): Promise<Pedido | null>;
  findByClienteId(clienteId: string): Promise<Pedido[]>;
  findByMesaId(mesaId: string): Promise<Pedido[]>;
  findByRestauranteId(restauranteId: string): Promise<Pedido[]>;
  update(pedido: Pedido): Promise<Pedido>;
  delete(id: string): Promise<void>;
}
```

---

### 3.2 Application Layer (`src/application/`)

**Propósito:** Orquestra casos de uso (use cases), coordenando domain e infrastructure. Cada bounded context tem seus próprios serviços de use case.

#### Estrutura

```
src/application/[bounded-context]/services/
├── CriarPedidoUseCase.ts
├── AlterarStatusPedidoUseCase.ts
├── FinalizarPedidoUseCase.ts
├── ObterHistoricoPedidosUseCase.ts
└── index.ts
```

#### Interface UseCase

```typescript
// src/application/shared/types/UseCase.ts
export interface UseCase<I, O> {
  execute(input: I): Promise<O> | O;
}
```

#### Exemplo: CriarPedidoUseCase

```typescript
// src/application/pedido/services/CriarPedidoUseCase.ts
export class CriarPedidoUseCase implements UseCase<CriarPedidoInput, CriarPedidoOutput> {
  constructor(
    private pedidoRepo: IPedidoRepository,
    private carrinhoRepo: ICarrinhoRepository,
    private eventDispatcher: EventDispatcher
  ) {}

  async execute(input: CriarPedidoInput): Promise<CriarPedidoOutput> {
    // 1. Obter carrinho
    const carrinho = await this.carrinhoRepo.get();
    if (!carrinho) throw new Error('Carrinho não encontrado');
    if (carrinho.isEmpty) throw new Error('Não é possível criar pedido com carrinho vazio');

    // 2. Criar PedidoAggregate a partir do carrinho
    const pedidoId = crypto.randomUUID();
    const pedidoEntity = carrinho.toPedido(pedidoId, 0);

    // 3. Persistir via IPedidoRepository
    const pedidoCriado = await this.pedidoRepo.create(pedidoEntity);

    // 4. Disparar PedidoCriadoEvent
    const evento = new PedidoCriadoEvent(pedidoCriado);
    this.eventDispatcher.dispatch(evento);

    // 5. Limpar carrinho
    await this.carrinhoRepo.clear();

    // 6. Retornar pedido criado
    return { pedido: pedidoCriado };
  }
}
```


### 3.3 Infrastructure Layer (`src/infrastructure/`)

**Propósito:** Implementa os contratos definidos em domain (repositórios, adapters). Contém persistência (Dexie/IndexedDB), adapters externos (Supabase, Stripe, Pix) e serviços técnicos.

#### Estrutura

```
src/infrastructure/
├── persistence/
│   ├── database.ts          # PediDatabase (Dexie)
│   ├── schema.ts           # Schemas de tabelas
│   ├── pedido/
│   │   ├── PedidoRepository.ts    # Implementa IPedidoRepository
│   │   └── CarrinhoRepository.ts # Implementa ICarrinhoRepository
│   ├── cardapio/
│   ├── mesa/
│   ├── pagamento/
│   ├── autenticacao/
│   └── admin/
├── external/
│   ├── SupabaseAuthAdapter.ts    # Adapter para Supabase Auth
│   ├── StripeAdapter.ts         # Adapter para Stripe
│   └── PixAdapter.ts            # Adapter para Pix/Mercado Pago
└── services/
    └── QRCodeCryptoService.ts   # Serviço de criptografia de QR code
```

#### Exemplo: PedidoRepository (Implementação Dexie)

```typescript
// src/infrastructure/persistence/pedido/PedidoRepository.ts
export class PedidoRepository implements IPedidoRepository {
  constructor(private db: PediDatabase) {}

  async create(pedido: Pedido): Promise<Pedido> {
    const dbModel = this.toDbModel(pedido);
    await this.db.pedidos.put(dbModel);
    return pedido;
  }

  async findById(id: string): Promise<Pedido | null> {
    const dbModel = await this.db.pedidos.get(id);
    if (!dbModel) return null;
    return this.fromDbModel(dbModel);
  }

  async findByMesaId(mesaId: string): Promise<Pedido[]> {
    const dbModels = await this.db.pedidos.where('mesaId').equals(mesaId).toArray();
    return dbModels.map(m => this.fromDbModel(m));
  }

  // ... outras operações CRUD

  private toDbModel(pedido: Pedido): PedidoRecord {
    return {
      id: pedido.id,
      clienteId: pedido.clienteId,
      mesaId: pedido.mesaId,
      restauranteId: pedido.restauranteId,
      status: pedido.status.toString(),
      itens: JSON.stringify(pedido.itens.map(item => this.itemPedidoToStored(item))),
      subtotal: JSON.stringify({ valor: pedido.subtotal.valor, moeda: pedido.subtotal.moeda }),
      // ...
    };
  }
}
```

#### Exemplo: StripeAdapter

```typescript
// src/infrastructure/external/StripeAdapter.ts
export class StripeAdapter implements IStripeAdapter {
  constructor(
    private secretKey: string = process.env.STRIPE_SECRET_KEY ?? '',
    private baseUrl: string = 'https://api.stripe.com'
  ) {}

  async criarPaymentIntent(valorEmCentavos: number, pedidoId: string): Promise<StripePaymentIntent> {
    // Implementação real faria chamada HTTP para Stripe API
    return {
      id: `pi_${pedidoId}_${Date.now()}`,
      clientSecret: `pi_${pedidoId}_secret_${Date.now()}`,
      valor: valorEmCentavos,
      status: 'requires_payment_method',
    };
  }
}
```

---

### 3.4 Presentation Layer (`src/presentation/`)

**Propósito:** Camada de UI do Next.js — páginas, componentes React e custom hooks. Coexiste com a estrutura tradicional em `src/app/`, `src/components/`, `src/hooks/`.

#### Estrutura

```
src/presentation/
├── pages/           # Componentes de página (Next.js App Router)
├── components/      # Componentes reutilizáveis
└── hooks/          # Custom hooks que chamam application services
```

#### Exemplo: Hook usando Use Case

```typescript
// src/presentation/hooks/usePedido.ts (hipotético - ainda não migrado)
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CriarPedidoUseCase } from '@/application/pedido/services/CriarPedidoUseCase';
import { IPedidoRepository } from '@/domain/pedido/repositories/IPedidoRepository';
import { PedidoRepository } from '@/infrastructure/persistence/pedido/PedidoRepository';

const pedidoRepository: IPedidoRepository = new PedidoRepository(db);
const criarPedidoUseCase = new CriarPedidoUseCase(
  pedidoRepository,
  carrinhoRepo,
  EventDispatcher.getInstance()
);

export function useCriarPedido() {
  const queryClient = useQueryClient();
 
  return useMutation({
    mutationFn: async (params: { clienteId?: string; mesaId?: string }) => {
      return criarPedidoUseCase.execute(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}
```

---

## 4. Bounded Contexts

O sistema é dividido em **6 contextos delimitados**, cada um com sua própria estrutura de domínio:

### 4.1 Pedido (`src/domain/pedido/`)

**Responsabilidade:** Gestão de pedidos, carrinho e cálculo de totais.

| Artefato | Descrição |
|----------|-----------|
| `entities/Pedido.ts` | Entidade principal com itens, status, totais |
| `entities/ItemPedido.ts` | Item individual do pedido com modificadores |
| `aggregates/PedidoAggregate.ts` | Encapsula invariantes (pedido deve ter itens, totais devem bater) |
| `aggregates/CarrinhoAggregate.ts` | Carrinho do cliente antes do checkout |
| `value-objects/Dinheiro.ts` | Value object para valores monetários (em centavos) |
| `value-objects/StatusPedido.ts` | Status: `pending_payment`, `paid`, `preparing`, `ready`, `delivered`, `cancelled` |
| `value-objects/MetodoPagamento.ts` | PIX, Cartão, Dinheiro |
| `value-objects/ModificadorSelecionado.ts` | Modificador escolhido pelo cliente |
| `services/CalculadoraTotal.ts` | Domain service para cálculo de totais |
| `events/PedidoCriadoEvent.ts` | Dispara quando pedido é criado |
| `events/PedidoStatusAlteradoEvent.ts` | Dispara quando status muda |
| `repositories/IPedidoRepository.ts` | Interface do repositório de pedidos |

### 4.2 Cardápio (`src/domain/cardapio/`)

**Responsabilidade:** Catálogo de produtos, categorias, combos e modificadores.

| Artefato | Descrição |
|----------|-----------|
| `entities/Categoria.ts` | Categoria do cardápio |
| `entities/ItemCardapio.ts` | Produto individual |
| `entities/Combo.ts` | Combo de produtos |
| `entities/ModificadorValor.ts` | Valor de modificador (ex: "Sem lactose +R") |
| `aggregates/ModificadorGrupoAggregate.ts` | Grupo de modificadores (ex: "Bebidas") |
| `aggregates/ComboAggregate.ts` | Agregado de combo |
| `repositories/ICategoriaRepository.ts` | Interface para categorias |
| `repositories/IItemCardapioRepository.ts` | Interface para itens |

### 4.3 Mesa (`src/domain/mesa/`)

**Responsabilidade:** Gestão de mesas e validação de QR codes.

| Artefato | Descrição |
|----------|-----------|
| `entities/Mesa.ts` | Entidade de mesa |
| `value-objects/QRCodePayload.ts` | Payload criptografado do QR code |
| `aggregates/MesaAggregate.ts` | Agregado com validação de QR e geração de payload |
| `services/QRCodeValidationService.ts` | Serviço de validação de QR code |
| `repositories/IMesaRepository.ts` | Interface do repositório de mesas |

### 4.4 Pagamento (`src/domain/pagamento/`)

**Responsabilidade:** Processamento de pagamentos, transações e reembolso.

| Artefato | Descrição |
|----------|-----------|
| `entities/Pagamento.ts` | Entidade de pagamento |
| `entities/Transacao.ts` | Transação individual |
| `value-objects/StatusPagamento.ts` | Status: `pending`, `confirmed`, `failed`, `refunded` |
| `value-objects/MetodoPagamento.ts` | PIX, Cartão, Dinheiro |
| `aggregates/PagamentoAggregate.ts` | Agregado com lógica de confirmação/reembolso |
| `events/PagamentoConfirmadoEvent.ts` | Dispara quando pagamento confirmado |
| `events/ReembolsoIniciadoEvent.ts` | Dispara quando reembolso iniciado |
| `repositories/IPagamentoRepository.ts` | Interface para pagamentos |
| `repositories/ITransacaoRepository.ts` | Interface para transações |


### 4.5 Autenticação (`src/domain/autenticacao/`)

**Responsabilidade:** Usuários, sessões e papéis.

| Artefato | Descrição |
|----------|-----------|
| `entities/Usuario.ts` | Entidade de usuário |
| `entities/Sessao.ts` | Sessão do usuário |
| `value-objects/Papel.ts` | Papéis: `admin`, `owner`, `manager`, `waiter`, `customer` |
| `value-objects/Credenciais.ts` | Email e senha (value object) |
| `aggregates/UsuarioAggregate.ts` | Agregado de usuário |
| `events/UsuarioCriadoEvent.ts` | Dispara quando usuário é criado |
| `events/SessaoExpiradaEvent.ts` | Dispara quando sessão expira |
| `repositories/IUsuarioRepository.ts` | Interface para usuários |
| `repositories/ISessaoRepository.ts` | Interface para sessões |

### 4.6 Admin (`src/domain/admin/`)

**Responsabilidade:** Restaurantes, vínculo usuário-restaurante, configurações, estatísticas.

| Artefato | Descrição |
|----------|-----------|
| `entities/Restaurante.ts` | Entidade de restaurante (multi-tenant) |
| `entities/UsuarioRestaurante.ts` | Vínculo usuário-restaurante com papel |
| `value-objects/PapelRestaurante.ts` | Papéis no contexto do restaurante: `dono`, `gerente`, `atendente` |
| `value-objects/ConfiguracoesRestaurante.ts` | Configurações operacionais |
| `aggregates/RestauranteAggregate.ts` | Agregado de restaurante |
| `events/RestauranteCriadoEvent.ts` | Dispara quando restaurante é criado |
| `events/RestauranteAtualizadoEvent.ts` | Dispara quando restaurante é atualizado |
| `repositories/IRestauranteRepository.ts` | Interface para restaurantes |

---

## 5. Fluxo de Dados

### 5.1 Fluxo: Criação de Pedido

```
┌──────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                        │
│                                                              │
│  checkout/page.tsx                                           │
│  └── useCriarPedido().mutateAsync({ clienteId, mesaId })    │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                        │
│                                                              │
│  CriarPedidoUseCase.execute({ clienteId, mesaId })          │
│  ├── 1. Obtém carrinho (ICarrinhoRepository)                │
│  ├── 2. Valida carrinho não vazio                           │
│  ├── 3. Cria PedidoAggregate.criar()                        │
│  │       └── Valida invariantes (deve ter itens, totais OK) │
│  ├── 4. Persiste via IPedidoRepository.create()              │
│  ├── 5. Dispara PedidoCriadoEvent                           │
│  └── 6. Limpa carrinho                                      │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                        DOMAIN LAYER                           │
│                                                              │
│  PedidoAggregate.criar()                                     │
│  ├── Pedido.criar() → new Pedido({...})                     │
│  ├── Invariantes validadas                                   │
│  ├── PedidoCriadoEvent disparado                             │
│  └── Retorna PedidoAggregate com PedidoEntity               │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                     INFRASTRUCTURE LAYER                      │
│                                                              │
│  PedidoRepository.create(pedido)                             │
│  ├── toDbModel(pedido) → serializa para Dexie               │
│  ├── db.pedidos.put(dbModel) → persiste em IndexedDB         │
│  └── Retorna pedido deserializado                            │
│                                                              │
│  Se online: sync com Supabase (background sync)              │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Fluxo: Validação de QR Code de Mesa

```
Cliente escaneia QR
        │
        ▼
presentation: table/[id]/page.tsx
        │
        ▼ useValidarQRCode()
application: ValidarQRCodeUseCase.execute(qrPayload)
        │
        ▼
domain: MesaAggregate.validarQRCode(qrPayload)
        │
        ├── QRCodePayload.validate(assinatura)
        │
        ▼
infrastructure: MesaRepository.findById(mesaId)
        │
        ▼
domain: Retorna MesaAggregate se válido
        │
        ▼
presentation: Redireciona para cardápio da mesa
```

### 5.3 Fluxo: Pagamento com Stripe

```
Cliente seleciona "Cartão de Crédito"
        │
        ▼
presentation: checkout/page.tsx
        │
        ▼ useCriarPaymentIntent()
application: CriarStripePaymentIntentUseCase.execute({ valor, pedidoId })
        │
        ├── IPagamentoRepository.create(pagamento)
        │
        ▼
infrastructure: StripeAdapter.criarPaymentIntent(valorEmCentavos, pedidoId)
        │
        ├── HTTP POST para https://api.stripe.com/v1/payment_intents
        │
        ▼
domain: PagamentoAggregate.confirmar()
        │
        └── PagamentoConfirmadoEvent disparado
```

---

## 6. Regras de Dependência

### 6.1 Regras Obrigatórias

| Camada | Pode importar de | Não pode importar de |
|--------|------------------|---------------------|
| **domain/** | Nenhuma camada (puro) | application, infrastructure, presentation, react, next |
| **application/** | domain, interfaces de infrastructure | infrastructure concreta, presentation, react |
| **infrastructure/** | domain | application, presentation |
| **presentation/** | application, domain (types) | — |

### 6.2 Padrões de Import Proibidos no Domain

```typescript
// ❌ PROIBIDO em src/domain/pedido/entities/Pedido.ts
import { useState } from 'react';                              // BLOQUEADO
import { SupabaseClient } from '@supabase/supabase-js';       // BLOQUEADO
import '@/stores/cartStore';                                  // BLOQUEADO
import '@/infrastructure/persistence/pedido/PedidoRepository'; // BLOQUEADO
import 'next/navigation';                                       // BLOQUEADO
```

```typescript
// ✅ PERMITIDO em src/domain/pedido/entities/Pedido.ts
import { AggregateRootClass } from '@/domain/shared';          // OK
import { StatusPedido } from '../value-objects/StatusPedido';  // OK
import type { IPedidoRepository } from '@/domain/pedido/repositories/IPedidoRepository'; // OK
```

### 6.3 Dependency Inversion

**Interfaces** são definidas em `domain/` e **implementadas** em `infrastructure/`:

```
domain/pedido/repositories/IPedidoRepository.ts (interface)
        │
        │ implements
        ▼
infrastructure/persistence/pedido/PedidoRepository.ts (implementação)
```

Isso permite:
- Trocar implementação (ex: Dexie → WebSQL) sem mudar domain
- Criar implementações em memória para testes unitários
- Manter domain independente de detalhes técnicos


---

## 7. DDD na Prática

### 7.1 Exemplo Completo: Criar um Pedido

#### Step 1: Domain — Entidade Pedido

```typescript
// src/domain/pedido/entities/Pedido.ts
export class Pedido extends AggregateRootClass<PedidoProps> {
  get clienteId(): string | undefined { return this.props.clienteId; }
  get mesaId(): string | undefined { return this.props.mesaId; }
  get restauranteId(): string { return this.props.restauranteId; }
  get status(): StatusPedido { return this.props.status; }
  get itens(): ItemPedido[] { return [...this.props.itens]; }
  get total(): Dinheiro { return this.props.total; }

  adicionarItem(item: ItemPedido): void {
    const existente = this.props.itens.find(i => i.id === item.id);
    if (existente) {
      existente.atualizarQuantidade(existente.quantidade + item.quantidade);
    } else {
      this.props.itens.push(item);
    }
    this.atualizarTotais();
    this.touch();
  }

  private atualizarTotais(): void {
    let novoSubtotal = Dinheiro.ZERO;
    for (const item of this.props.itens) {
      novoSubtotal = novoSubtotal.somar(item.subtotal);
    }
    const novoTotal = novoSubtotal.somar(this.props.tax);
    Object.assign(this.props, { subtotal: novoSubtotal, total: novoTotal });
  }

  static criar(props: Omit<PedidoProps, 'createdAt' | 'updatedAt' | 'subtotal' | 'tax' | 'total'>): Pedido {
    const now = new Date();
    const pedido = new Pedido({
      ...props,
      subtotal: Dinheiro.ZERO,
      tax: Dinheiro.ZERO,
      total: Dinheiro.ZERO,
      createdAt: now,
      updatedAt: now,
    });
    pedido.atualizarTotais();
    return pedido;
  }
}
```

#### Step 2: Domain — Aggregate PedidoAggregate

```typescript
// src/domain/pedido/aggregates/PedidoAggregate.ts
export class PedidoAggregate {
  private pedido: Pedido;
  private eventDispatcher: EventDispatcher;

  constructor(pedido: Pedido, eventDispatcher?: EventDispatcher) {
    this.pedido = pedido;
    this.eventDispatcher = eventDispatcher ?? EventDispatcher.getInstance();
    this.validarInvariantes();
  }

  private validarInvariantes(): void {
    if (this.pedido.itens.length === 0) {
      throw new Error('Pedido deve ter pelo menos um item');
    }
    const calculoEsperado = this.pedido.subtotal.somar(this.pedido.tax);
    if (!calculoEsperado.equals(this.pedido.total)) {
      throw new Error('Total do pedido não corresponde à soma do subtotal com tax');
    }
  }

  static criar(props: Omit<PedidoProps, 'createdAt' | 'updatedAt' | 'subtotal' | 'tax' | 'total'>): PedidoAggregate {
    const pedido = Pedido.criar(props);
    const aggregate = new PedidoAggregate(pedido);
    const event = new PedidoCriadoEvent(pedido);
    aggregate.eventDispatcher.dispatch(event);
    return aggregate;
  }
}
```

#### Step 3: Domain — Interface do Repositório

```typescript
// src/domain/pedido/repositories/IPedidoRepository.ts
export interface IPedidoRepository {
  create(pedido: Pedido): Promise<Pedido>;
  findById(id: string): Promise<Pedido | null>;
  findByClienteId(clienteId: string): Promise<Pedido[]>;
  findByMesaId(mesaId: string): Promise<Pedido[]>;
  findByRestauranteId(restauranteId: string): Promise<Pedido[]>;
  update(pedido: Pedido): Promise<Pedido>;
  delete(id: string): Promise<void>;
}
```

#### Step 4: Infrastructure — Implementação do Repositório

```typescript
// src/infrastructure/persistence/pedido/PedidoRepository.ts
export class PedidoRepository implements IPedidoRepository {
  constructor(private db: PediDatabase) {}

  async create(pedido: Pedido): Promise<Pedido> {
    const dbModel = this.toDbModel(pedido);
    await this.db.pedidos.put(dbModel);
    return pedido;
  }

  async findById(id: string): Promise<Pedido | null> {
    const dbModel = await this.db.pedidos.get(id);
    if (!dbModel) return null;
    return this.fromDbModel(dbModel);
  }

  private toDbModel(pedido: Pedido): PedidoRecord {
    return {
      id: pedido.id,
      clienteId: pedido.clienteId,
      mesaId: pedido.mesaId,
      restauranteId: pedido.restauranteId,
      status: pedido.status.toString(),
      itens: JSON.stringify(pedido.itens),
      subtotal: JSON.stringify({ valor: pedido.subtotal.valor, moeda: pedido.subtotal.moeda }),
      tax: JSON.stringify({ valor: pedido.tax.valor, moeda: pedido.tax.moeda }),
      total: JSON.stringify({ valor: pedido.total.valor, moeda: pedido.total.moeda }),
      createdAt: pedido.createdAt,
      updatedAt: pedido.updatedAt,
    };
  }
}
```

#### Step 5: Application — Criar o Use Case

```typescript
// src/application/pedido/services/CriarPedidoUseCase.ts
export class CriarPedidoUseCase implements UseCase<CriarPedidoInput, CriarPedidoOutput> {
  constructor(
    private pedidoRepo: IPedidoRepository,
    private carrinhoRepo: ICarrinhoRepository,
    private eventDispatcher: EventDispatcher
  ) {}

  async execute(input: CriarPedidoInput): Promise<CriarPedidoOutput> {
    const carrinho = await this.carrinhoRepo.get();
    if (!carrinho || carrinho.isEmpty) {
      throw new Error('Não é possível criar pedido com carrinho vazio');
    }

    const pedidoId = crypto.randomUUID();
    const pedidoEntity = carrinho.toPedido(pedidoId, 0);
    const pedidoCriado = await this.pedidoRepo.create(pedidoEntity);

    this.eventDispatcher.dispatch(new PedidoCriadoEvent(pedidoCriado));
    await this.carrinhoRepo.clear();

    return { pedido: pedidoCriado };
  }
}
```

### 7.2 Exemplo: Value Object Dinheiro

Value objects são imutáveis e definidos pelos seus atributos:

```typescript
// Diferentes formas de criar Dinheiro resultam no mesmo valor
const a = Dinheiro.criar(1500, 'BRL');         // R$ 15,00
const b = Dinheiro.criarDeReais(15, 'BRL');    // R$ 15,00
const c = Dinheiro.criarDeReais(14.5, 'BRL').somar(Dinheiro.criar(50)); // R$ 15,00

console.log(a.equals(b)); // true
console.log(a.valor);    // 1500 (centavos)
console.log(a.reais);    // 15 (reais)

// Operações criam novos objetos (imutável)
const resultado = a.somar(b); // Retorna novo Dinheiro
console.log(resultado.valor); // 3000
```

### 7.3 Exemplo: Validação de QR Code com Aggregate

```typescript
// src/domain/mesa/aggregates/MesaAggregate.ts
export class MesaAggregate {
  private mesa: Mesa;
  private eventDispatcher: EventDispatcher;

  constructor(
    mesa: Mesa,
    repository: IMesaRepository,
    eventDispatcher: EventDispatcher,
    qrCodeValidationService: IQRCodeValidationService
  ) {
    this.mesa = mesa;
    this.repository = repository;
    this.eventDispatcher = eventDispatcher ?? EventDispatcher.getInstance();
    this.qrCodeValidationService = qrCodeValidationService;
    this.validarInvariantes();
  }

  private validarInvariantes(): void {
    if (!this.mesa.label || this.mesa.label.trim().length === 0) {
      throw new Error('Label da mesa não pode ser vazio');
    }
    if (!this.mesa.restauranteId || this.mesa.restauranteId.trim().length === 0) {
      throw new Error('RestauranteId da mesa não pode ser vazio');
    }
  }

  gerarQRCodePayload(secret: string): QRCodePayload {
    const assinatura = this.qrCodeValidationService.gerarAssinatura(
      this.mesa.restauranteId,
      this.mesa.id,
      secret
    );
    return QRCodePayload.reconstruir({
      restauranteId: this.mesa.restauranteId,
      mesaId: this.mesa.id,
      assinatura,
    });
  }

  static async criar(
    props: Omit<MesaProps, 'createdAt' | 'updatedAt'>,
    repository: IMesaRepository,
    eventDispatcher: EventDispatcher,
    secret: string,
    qrCodeValidationService: IQRCodeValidationService
  ): Promise<MesaAggregate> {
    const assinatura = qrCodeValidationService.gerarAssinatura(
      props.restauranteId,
      props.id,
      secret
    );
    const qrCodePayload = QRCodePayload.reconstruir({
      restauranteId: props.restauranteId,
      mesaId: props.id,
      assinatura,
    });

    const mesa = Mesa.criar({ ...props, qrCodePayload });
    const aggregate = new MesaAggregate(mesa, repository, eventDispatcher, qrCodeValidationService);

    const event = new MesaCriadaEvent(mesa);
    aggregate.eventDispatcher.dispatch(event);

    return aggregate;
  }
}
```

### 7.4 Exemplo: Domain Events com EventDispatcher

```typescript
// Domain Event
export class PedidoCriadoEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'PedidoCriadoEvent';

  constructor(
    public readonly pedido: Pedido,
    occurredOn?: Date
  ) {
    this.occurredOn = occurredOn ?? new Date();
  }
}

// EventDispatcher (singleton)
export class EventDispatcher {
  private static instance: EventDispatcher;
  private handlers: Map<string, EventHandler[]> = new Map();

  static getInstance(): EventDispatcher {
    if (!EventDispatcher.instance) {
      EventDispatcher.instance = new EventDispatcher();
    }
    return EventDispatcher.instance;
  }

  register(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  dispatch(event: DomainEvent): void {
    const handlers = this.handlers.get(event.eventType) ?? [];
    handlers.forEach(handler => handler(event));
  }
}

// Uso no Aggregate
static criar(props: ...): PedidoAggregate {
  const pedido = Pedido.criar(props);
  const aggregate = new PedidoAggregate(pedido);
  const event = new PedidoCriadoEvent(pedido);
  aggregate.eventDispatcher.dispatch(event); // Dispara o evento
  return aggregate;
}
```



---

## 8. Estado da Migração

### 8.1 Resumo Geral

A migração para DDD está **em andamento**. As camadas Domain, Application e Infrastructure já estão implementadas. A Presentation layer (hooks, pages migradas para usar use cases) ainda está em progresso.

### 8.2 Status por Camada

| Camada | Status | Descrição |
|--------|--------|-----------|
| **Domain** | ✅ Implementado | Entidades, VOs, Aggregates, Events, Services, Repositories (interfaces) para 6 contextos |
| **Application** | ✅ Implementado | Use Cases para 6 contextos (migrados de services antigos) |
| **Infrastructure** | ✅ Implementado | Repositories (Dexie), Adapters (Stripe, Pix, Supabase) |
| **Presentation** | ⚠️ Parcial | Estrutura existe mas hooks/pages ainda não usam use cases consistentemente |

### 8.3 Status por Bounded Context

| Contexto | Domain | Application | Infrastructure | Presentation |
|----------|--------|-------------|----------------|--------------|
| **Pedido** | ✅ Completo | ✅ Completo | ✅ Completo | ⚠️ Em progresso |
| **Cardápio** | ✅ Completo | ✅ Completo | ✅ Completo | ⚠️ Em progresso |
| **Mesa** | ✅ Completo | ✅ Completo | ✅ Completo | ⚠️ Em progresso |
| **Pagamento** | ✅ Completo | ✅ Completo | ✅ Completo | ⚠️ Em progresso |
| **Autenticação** | ✅ Completo | ✅ Completo | ✅ Completo | ⚠️ Em progresso |
| **Admin** | ✅ Completo | ✅ Completo | ✅ Completo | ⚠️ Em progresso |

### 8.4 O que Existe Hoje

#### Domain Layer — Implementado
```
src/domain/
├── shared/
│   ├── types/
│   │   ├── Entity.ts
│   │   ├── ValueObject.ts
│   │   └── AggregateRoot.ts
│   └── events/
│       ├── DomainEvent.ts
│       └── EventDispatcher.ts
├── pedido/
│   ├── entities/Pedido.ts, ItemPedido.ts
│   ├── value-objects/Dinheiro.ts, StatusPedido.ts, MetodoPagamento.ts, ModificadorSelecionado.ts
│   ├── aggregates/PedidoAggregate.ts, CarrinhoAggregate.ts
│   ├── events/PedidoCriadoEvent.ts, PedidoStatusAlteradoEvent.ts, PagamentoConfirmadoEvent.ts
│   ├── services/CalculadoraTotal.ts
│   └── repositories/IPedidoRepository.ts, ICarrinhoRepository.ts
├── cardapio/
├── mesa/
│   ├── entities/Mesa.ts
│   ├── value-objects/QRCodePayload.ts
│   ├── aggregates/MesaAggregate.ts
│   ├── services/QRCodeValidationService.ts
│   └── repositories/IMesaRepository.ts
├── pagamento/
├── autenticacao/
│   ├── entities/Usuario.ts, Sessao.ts
│   ├── value-objects/Papel.ts, Credenciais.ts
│   ├── aggregates/UsuarioAggregate.ts
│   ├── events/UsuarioCriadoEvent.ts, SessaoCriadaEvent.ts, SessaoExpiradaEvent.ts
│   └── repositories/IUsuarioRepository.ts, ISessaoRepository.ts
└── admin/
    ├── entities/Restaurante.ts, UsuarioRestaurante.ts
    ├── value-objects/PapelRestaurante.ts, ConfiguracoesRestaurante.ts
    ├── aggregates/RestauranteAggregate.ts
    ├── events/RestauranteCriadoEvent.ts, RestauranteAtualizadoEvent.ts, etc.
    └── repositories/IRestauranteRepository.ts, IUsuarioRestauranteRepository.ts
```

#### Application Layer — Implementado
```
src/application/
├── shared/
│   └── types/UseCase.ts
├── pedido/services/
│   ├── CriarPedidoUseCase.ts
│   ├── AlterarStatusPedidoUseCase.ts
│   ├── FinalizarPedidoUseCase.ts
│   └── ObterHistoricoPedidosUseCase.ts
├── cardapio/services/
├── mesa/services/
│   ├── CriarMesaUseCase.ts
│   ├── ValidarQRCodeUseCase.ts
│   └── ListarMesasUseCase.ts
├── pagamento/services/
│   ├── CriarStripePaymentIntentUseCase.ts
│   ├── CriarPixChargeUseCase.ts
│   ├── ProcessarWebhookUseCase.ts
│   └── IniciarReembolsoUseCase.ts
├── autenticacao/services/
│   ├── AutenticarUsuarioUseCase.ts
│   ├── RegistrarUsuarioUseCase.ts
│   ├── ValidarSessaoUseCase.ts
│   └── RedefinirSenhaUseCase.ts
└── admin/services/
    ├── CriarRestauranteUseCase.ts
    ├── AtualizarRestauranteUseCase.ts
    ├── GerenciarProdutoUseCase.ts
    ├── GerenciarCategoriaUseCase.ts
    └── ObterEstatisticasUseCase.ts
```

#### Infrastructure Layer — Implementado
```
src/infrastructure/
├── persistence/
│   ├── database.ts (PediDatabase - Dexie)
│   ├── pedido/PedidoRepository.ts, CarrinhoRepository.ts
│   ├── cardapio/CategoriaRepository.ts, ItemCardapioRepository.ts, ModificadorGrupoRepository.ts
│   ├── mesa/MesaRepository.ts
│   ├── pagamento/PagamentoRepository.ts, TransacaoRepository.ts
│   ├── autenticacao/UsuarioRepository.ts, SessaoRepository.ts
│   └── admin/RestauranteRepository.ts, UsuarioRestauranteRepository.ts, EstatisticasRepository.ts
├── external/
│   ├── SupabaseAuthAdapter.ts
│   ├── StripeAdapter.ts
│   └── PixAdapter.ts
└── services/
    └── QRCodeCryptoService.ts
```

### 8.5 O que Ainda Precisa Ser Feito

#### Phase 5: Presentation Layer (Em progresso)
- [ ] Migrar hooks em  para usar use cases
- [ ] Atualizar pages em  para usar hooks migrados
- [ ] Criar bridging hooks que conectam React Query com use cases
- [ ] Remover dependência direta de stores Zustand nos componentes

#### Phase 6: Verificação
- [ ] Criar unit tests para domain layer aggregates (≥80% cobertura)
- [ ] Criar integration tests para application layer use cases
- [ ] Atualizar testes E2E para fluxos migrados
- [ ] Verificar ESLint rules para imports inválidos

#### Phase 7: Cleanup
- [ ] Remover arquivos deprecated em `src/services/`
- [ ] Remover arquivos deprecated em `src/stores/` (lógica migrada)
- [ ] Remover `src/lib/qr.ts` (lógica migrada para domain)
- [ ] Atualizar imports em toda a codebase

### 8.6 Arquivos Legados (ainda não migrados)

| Arquivo | Responsabilidade Original | Status |
|---------|------------------------|--------|
| `src/services/orderService.ts` | Lógica de pedido | ⚠️ Deprecated, usar domain/application |
| `src/services/tableService.ts` | Lógica de mesa | ⚠️ Deprecated, usar domain/application |
| `src/stores/cartStore.ts` | Estado do carrinho | ⚠️ UI state apenas, lógica em domain |
| `src/stores/menuStore.ts` | Estado do cardápio | ⚠️ UI state apenas, lógica em domain |
| `src/lib/qr.ts` | Validação QR code | ⚠️ Deprecated, usar MesaAggregate |
| `src/lib/auth/` | Autenticação | ⚠️ Deprecated, usar SupabaseAuthAdapter |

---

## 9. Referências

- **Design Document**: `openspec/changes/archive/2026-04-25-implantacao-ddd/design.md`
- **Archive Report**: `openspec/changes/archive/2026-04-25-implantacao-ddd/archive-report.md`
- **Codemap**: `codemap.md`
- **Specs de Domínio**: `openspec/specs/[contexto]/spec.md`

---

*Documento atualizado em 2026-04-27*
