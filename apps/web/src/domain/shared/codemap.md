# Shared — Módulos Compartilhados

> Utilities e tipos compartilhados entre bounded contexts

## Visão Geral

O diretório `shared/` contém:

- Value objects reutilizáveis
- Tipos compartilhados
- Exceptions de domínio
- Events compartilhados

## Estrutura

```
src/domain/shared/
├── types/              # Tipos compartilhados
├── exceptions/         # Exceções de domínio
└── (value objects em cada domínio)
```

## Value Objects Principais

### Dinheiro

```typescript
// Localização: src/domain/pedido/value-objects/Dinheiro.ts
class Dinheiro {
  valor: number;
  moeda: string; // 'BRL'

  adicionar(outro: Dinheiro): Dinheiro;
  subtrair(outro: Dinheiro): Dinheiro;
  multiplicar(fator: number): Dinheiro;
  equals(outro: Dinheiro): boolean;
  formatado(): string; // 'R$ XX,XX'
}
```

## Exceções

```typescript
// Exceções de domínio (para ser implementado)
class DomainException extends Error {}
class EntityNotFoundException extends DomainException {}
class InvalidStateTransitionException extends DomainException {}
class BusinessRuleViolationException extends DomainException {}
```

## Eventos Compartilhados

Os eventos são definidos em cada bounded context, mas seguem o padrão:

```typescript
interface DomainEvent {
  eventType: string;
  occurredOn: Date;
  aggregateId: string;
}
```

## Diretorizes

1. **Valor compartilhado** apenas quando faz sentido para múltiplos contextos
2. **Não force compartilhamento** prematura
3. **Evite dependências circulares** entre contextos

---

_Criado: 2026-05-04_
