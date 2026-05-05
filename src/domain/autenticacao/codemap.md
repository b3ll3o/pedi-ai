# Autenticacao — Bounded Context

> Domínio que gerencia autenticação e sessões de usuários

## Visão Geral

O contexto de **Autenticacao** é responsável por:
- Criar e validar usuários
- Gerenciar sessões
- Autenticar credenciais
- Controlar redefinição de senha

## Estrutura

```
src/domain/autenticacao/
├── entities/
│   ├── Usuario.ts          # Entidade usuário
│   └── Sessao.ts           # Sessão autenticada
├── value-objects/
│   └── (herdados de shared)
├── aggregates/
│   └── UsuarioAggregate.ts  # Agregado do usuário
├── events/
│   ├── UsuarioCriadoEvent.ts
│   ├── SessaoCriadaEvent.ts
│   └── SessaoExpiradaEvent.ts
├── repositories/
│   └── IUsuarioRepository.ts
└── services/
    └── (vai em application)
```

## Entidades

### Usuario

```typescript
class Usuario {
  id: string;
  email: string;
  nome: string;
  createdAt: Date;
}
```

### Sessao

```typescript
class Sessao {
  id: string;
  usuarioId: string;
  token: string;
  expiraEm: Date;
  createdAt: Date;
}
```

## Eventos de Domínio

| Evento | Quando |
|--------|--------|
| `UsuarioCriadoEvent` | Novo usuário registrado |
| `SessaoCriadaEvent` | Login realizado |
| `SessaoExpiradaEvent` | Sessão expirou |

## Fluxo de Autenticação

```
1. Cliente envia email/senha
2. AutenticarUsuarioUseCase valida
3. Sessao criada com token
4. SessaoCriadaEvent publicado
5. Token retornado ao cliente
```

## Repositórios

### IUsuarioRepository

```typescript
interface IUsuarioRepository {
  findById(id: string): Promise<Usuario | null>;
  findByEmail(email: string): Promise<Usuario | null>;
  save(usuario: Usuario): Promise<void>;
  update(usuario: Usuario): Promise<void>;
}
```

## Status de Implementação

| Componente | Status |
|------------|--------|
| Entities | ✅ Implementado |
| Aggregates | ✅ Implementado |
| Events | ✅ Implementado |
| Repository Interfaces | ✅ Implementado |

---

*Criado: 2026-05-04*
