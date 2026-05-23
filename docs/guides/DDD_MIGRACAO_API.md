# Migração DDD do apps/api

> **Status**: 🚧 Em Andamento
> **Criado**: 2026-05-22

---

## Visão Geral

O `apps/api` atualmente usa módulos tradicionais do NestJS (auth/, orders/, payments/, etc.). Esta documentação descreve o plano de migração para seguir a arquitetura DDD conforme `apps/web`.

---

## Estrutura Atual

> ⚠️ **NOTA**: A migração foi **iniciada**. O diretório `domain/` já existe com a estrutura DDD base (entities, repositories, services, codemap para cada bounded context). Os **módulos antigos** (auth/, orders/, etc.) **coexistem** com a nova estrutura e ainda não foram migrados.

```
apps/api/src/
├── auth/           # Autenticação (JWT, guards, strategies)
├── users/          # CRUD de usuários
├── restaurants/    # CRUD de restaurantes
├── orders/         # Gestão de pedidos
├── payments/       # Pagamentos PIX
├── products/       # CRUD de produtos
├── categories/     # CRUD de categorias
├── realtime/       # WebSocket gateway
├── common/         # Filters, interceptors, database
├── health/         # Health check
├── app.module.ts
└── main.ts
```

---

## Estrutura Alvo (DDD)

```
apps/api/src/
├── domain/
│   ├── shared/                 # Types, exceptions, interfaces
│   ├── admin/                 # Restaurantes, usuários-restaurante, mesas
│   │   ├── entities/
│   │   │   └── Restaurant.ts
│   │   ├── value-objects/
│   │   ├── repositories/       # Interfaces
│   │   └── services/
│   ├── autenticacao/           # Usuários, autenticação
│   │   ├── entities/
│   │   │   └── Usuario.ts
│   │   ├── value-objects/
│   │   │   └── Credenciais.ts
│   │   └── repositories/
│   ├── cardapio/               # Categorias, produtos, modificadores
│   │   ├── entities/
│   │   │   ├── Categoria.ts
│   │   │   ├── Produto.ts
│   │   │   └── GrupoModificador.ts
│   │   ├── value-objects/
│   │   └── repositories/
│   ├── mesa/                   # Mesas
│   │   ├── entities/
│   │   │   └── Mesa.ts
│   │   └── repositories/
│   ├── pedido/                 # Pedidos
│   │   ├── entities/
│   │   │   ├── Pedido.ts
│   │   │   └── ItemPedido.ts
│   │   ├── value-objects/
│   │   │   └── StatusPedido.ts
│   │   └── repositories/
│   └── pagamento/              # Pagamentos
│       ├── entities/
│       │   └── Pagamento.ts
│       ├── value-objects/
│       │   └── StatusPagamento.ts
│       └── repositories/
├── application/
│   └── [bounded-context]/
│       └── services/           # Use cases
├── infrastructure/
│   ├── persistence/            # Repositories Prisma
│   │   └── repositories/
│   └── external/               # Mercado Pago adapter
└── presentation/
    ├── controllers/           # REST controllers
    ├── gateways/              # WebSocket gateways
    └── dto/                   # Data Transfer Objects
```

---

## Mapeamento de Entidades

| Módulo Atual          | Bounded Context | Entidades Prisma                                        |
| --------------------- | --------------- | ------------------------------------------------------- |
| `auth/`               | autenticacao/   | UsersProfile                                            |
| `users/`              | autenticacao/   | UsersProfile                                            |
| `restaurants/`        | admin/          | Restaurant                                              |
| `orders/`             | pedido/         | Order, OrderItem, OrderStatusHistory                    |
| `payments/`           | pagamento/      | PaymentIntent, Subscription                             |
| `products/`           | cardapio/       | Product, ModifierGroup, ModifierValue, Combo, ComboItem |
| `categories/`         | cardapio/       | Category                                                |
| `realtime/`           | pedido/         | (WebSocket gateway)                                     |
| `tables/` (implícito) | mesa/           | Table                                                   |

---

## Ordem de Migração Sugerida

### Fase 1: Infraestrutura Base

1. Criar estrutura de diretórios DDD
2. Mover `common/` → `infrastructure/`
3. Configurar Prisma em `infrastructure/persistence/`

### Fase 2: Bounded Contexts Fundamentais

1. **autenticacao/** - Mover auth + users
2. **admin/** - Mover restaurants

### Fase 3: Bounded Contexts de Negócio

3. **cardapio/** - Mover categories + products
4. **mesa/** - Criar a partir de restaurants
5. **pedido/** - Mover orders
6. **pagamento/** - Mover payments

### Fase 4: Presentation Layer

1. Mapear controllers existentes para presentation/
2. Atualizar rotas em app.module.ts

---

## Critérios de Conclusão

- [ ] Estrutura de diretórios DDD criada
- [ ] Todos os módulos migrados para bounded contexts
- [ ] Controllers mapeados para presentation/
- [ ] Services migrados para application/
- [ ] Repositories implementados em infrastructure/
- [ ] Testes unitários passando
- [ ] ESLint e TypeScript compilando sem erros
- [ ] Documentation atualizada em AGENTS.md

---

## Riscos e Mitigações

| Risco                    | Mitigação                                              |
| ------------------------ | ------------------------------------------------------ |
| Breaking changes em APIs | Manter backwards compatibility durante transição       |
| many files para migrar   | Fazer migração incremental por bounded context         |
| testes falhando          | Manter testes existentes, adicionar novos gradualmente |
