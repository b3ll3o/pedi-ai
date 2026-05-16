# Cardapio — Bounded Context

> Domínio que gerencia cardápio, categorias e produtos

## Visão Geral

O contexto de **Cardapio** é responsável por:

- Gerenciar categorias do cardápio
- Gerenciar produtos/itens
- Gerenciar modificadores e grupos
- Calcular preços de combos

## Estrutura

```
src/domain/cardapio/
├── entities/
│   ├── Categoria.ts
│   ├── Produto.ts
│   └── GrupoModificador.ts
├── value-objects/
│   ├── Preco.ts
│   ├── Alergeno.ts
│   └── ValorModificador.ts
├── aggregates/
│   └── CardapioAggregate.ts
├── events/
│   └── (events compartilhados via shared)
├── repositories/
│   ├── ICategoriaRepository.ts
│   ├── IProdutoRepository.ts
│   └── IGrupoModificadorRepository.ts
└── services/
    └── (vai em application)
```

## Entidades

### Categoria

```typescript
class Categoria {
  id: string;
  restauranteId: string;
  nome: string;
  descricao?: string;
  ordem: number;
  ativo: boolean;
}
```

### Produto

```typescript
class Produto {
  id: string;
  restauranteId: string;
  categoriaId: string;
  nome: string;
  descricao: string;
  preco: Preco;
  imagem?: string;
  alergenos: Alergeno[];
  grupoModificadorId?: string;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}
```

## Hierarquia

```
Restaurante
  └── Categoria
        └── Produto
              └── GrupoModificador (opcional)
                    └── Valores (P, M, G)
```

## Repositórios

### IProdutoRepository

```typescript
interface IProdutoRepository {
  findById(id: string): Promise<Produto | null>;
  findByCategoria(categoriaId: string): Promise<Produto[]>;
  findByRestaurante(restauranteId: string): Promise<Produto[]>;
  save(produto: Produto): Promise<void>;
  update(produto: Produto): Promise<void>;
}
```

## Status de Implementação

| Componente            | Status                 |
| --------------------- | ---------------------- |
| Entities              | ✅ Implementado        |
| Value Objects         | ✅ Implementado        |
| Aggregates            | ✅ Implementado        |
| Repository Interfaces | ✅ Implementado        |
| Events                | 🔄 Parcial (em shared) |

---

_Criado: 2026-05-04_
