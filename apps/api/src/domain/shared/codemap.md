# Domain Layer — Shared

> Types, exceptions e utilities compartilhadas entre todos os bounded contexts.

## Estrutura

```
domain/shared/
├── exceptions/
│   └── *.ts              # Exceções customizadas
├── types/
│   └── *.ts              # Types compartilhados
└── entities/
    └── AggregateRoot.ts  # Classe base para aggregate roots
```

## Status

🔲 **Pendente de implementação** — Tipos compartilhados serão migrados de `common/` para cá.
