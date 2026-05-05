# Admin — Bounded Context

> Domínio que gerencia restaurantes e sua administração

## Visão Geral

O contexto de **Admin** é responsável por:
- Gerenciar restaurantes (CRUD)
- Gerenciar usuários vinculados
- Configurar restaurante
- Agregar contextos de cardápio e mesa

## Estrutura

```
src/domain/admin/
├── entities/
│   ├── Restaurante.ts        # Entidade restaurante
│   └── UsuarioRestaurante.ts # Vínculo usuário-restaurante
├── value-objects/
│   ├── ConfiguracoesRestaurante.ts
│   └── PapelRestaurante.ts   # owner, manager, staff
├── aggregates/
│   └── RestauranteAggregate.ts
├── events/
│   ├── RestauranteCriadoEvent.ts
│   ├── RestauranteAtualizadoEvent.ts
│   ├── RestauranteAtivadoEvent.ts
│   ├── RestauranteDesativadoEvent.ts
│   ├── CardapioAtualizadoEvent.ts
│   ├── UsuarioVinculadoRestauranteEvent.ts
│   └── UsuarioDesvinculadoRestauranteEvent.ts
└── repositories/
    ├── IRestauranteRepository.ts
    └── IUsuarioRestauranteRepository.ts
```

## Entidades

### Restaurante

```typescript
class Restaurante {
  id: string;
  nome: string;
  cnpj?: string;
  email: string;
  telefone?: string;
  ativo: boolean;
  configuracoes: ConfiguracoesRestaurante;
  criadoEm: Date;
  atualizadoEm: Date;
}
```

### UsuarioRestaurante

```typescript
class UsuarioRestaurante {
  id: string;
  usuarioId: string;
  restauranteId: string;
  papel: PapelRestaurante; // owner, manager, staff
  vinculadoEm: Date;
}
```

## Papéis

| Papel | Descrição | Permissões |
|-------|-----------|------------|
| `owner` | Dono | Tudo |
| `manager` | Gerente | Quase tudo exceto deletar restaurante |
| `staff` | Funcionário | Apenas leitura e atualização básica |

## Eventos de Domínio

| Evento | Quando |
|--------|--------|
| `RestauranteCriadoEvent` | Novo restaurante criado |
| `RestauranteAtualizadoEvent` | Dados atualizados |
| `RestauranteAtivadoEvent` | Restaurante reativado |
| `RestauranteDesativadoEvent` | Restaurante desativado |
| `UsuarioVinculadoRestauranteEvent` | Novo usuário vinculado |
| `UsuarioDesvinculadoRestauranteEvent` | Usuário desvinculado |

## Repositórios

### IRestauranteRepository

```typescript
interface IRestauranteRepository {
  findById(id: string): Promise<Restaurante | null>;
  findByOwner(usuarioId: string): Promise<Restaurante[]>;
  save(restaurante: Restaurante): Promise<void>;
  update(restaurante: Restaurante): Promise<void>;
}
```

### IUsuarioRestauranteRepository

```typescript
interface IUsuarioRestauranteRepository {
  findByUsuario(usuarioId: string): Promise<UsuarioRestaurante[]>;
  findByRestaurante(restauranteId: string): Promise<UsuarioRestaurante[]>;
  save(vinculo: UsuarioRestaurante): Promise<void>;
  delete(usuarioId: string, restauranteId: string): Promise<void>;
}
```

## Status de Implementação

| Componente | Status |
|------------|--------|
| Entities | ✅ Implementado |
| Value Objects | ✅ Implementado |
| Aggregates | ✅ Implementado |
| Events | ✅ Implementado |
| Repository Interfaces | ✅ Implementado |

---

*Criado: 2026-05-04*
