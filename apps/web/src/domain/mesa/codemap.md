# Mesa — Bounded Context

> Domínio que gerencia mesas e QR codes

## Visão Geral

O contexto de **Mesa** é responsável por:

- Gerenciar mesas do restaurante
- Gerar e validar QR codes
- Associar mesas a restaurantes

## Estrutura

```
src/domain/mesa/
├── entities/
│   └── Mesa.ts
├── value-objects/
│   └── NumeroMesa.ts
├── aggregates/
│   └── MesaAggregate.ts
├── events/
│   └── (events compartilhados via shared)
└── repositories/
    └── IMesaRepository.ts
```

## Entidades

### Mesa

```typescript
class Mesa {
  id: string;
  restauranteId: string;
  numero: NumeroMesa;
  capacidade: number;
  qrCode: string;
  ativo: boolean;
}
```

## QR Code

O QR code é único por mesa e codifica:

```
https://pedi.ai/menu?r={restauranteId}&m={mesaId}
```

Formato do payload:

```typescript
{
  restauranteId: string;
  mesaId: string;
  timestamp: number;
}
```

Assinatura: HMAC-SHA256

## Repositórios

### IMesaRepository

```typescript
interface IMesaRepository {
  findById(id: string): Promise<Mesa | null>;
  findByRestaurante(restauranteId: string): Promise<Mesa[]>;
  findByNumero(restauranteId: string, numero: number): Promise<Mesa | null>;
  save(mesa: Mesa): Promise<void>;
  update(mesa: Mesa): Promise<void>;
}
```

## Status de Implementação

| Componente            | Status          |
| --------------------- | --------------- |
| Entities              | ✅ Implementado |
| Value Objects         | ✅ Implementado |
| Aggregates            | ✅ Implementado |
| Repository Interfaces | ✅ Implementado |
| Events                | 🔄 Parcial      |

---

_Criado: 2026-05-04_
