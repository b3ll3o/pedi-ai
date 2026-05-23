# Domain Layer — Autenticação

> Bounded Context de autenticação e usuários.

## Estrutura

```
domain/autenticacao/
├── entities/
│   └── Usuario.ts           # Entidade de usuário
├── value-objects/
│   └── Credenciais.ts       # Value object para credenciais
├── repositories/
│   └── IUsuarioRepository.ts # Interface do repositório
└── services/
    └── AutenticacaoService.ts # Regras de negócio de autenticação
```

## Entidades

### Usuario

```typescript
// TODO: Definir entidade Usuario
```

## Status

🔲 **Pendente de implementação** — Aguardando migração do módulo `auth/` atual.
