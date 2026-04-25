# Delta for Autenticação Bounded Context

## Overview

This delta spec defines DDD layer requirements for the `autenticacao` bounded context, covering auth and register domains. All requirements enforce clean separation between domain logic, application use cases, infrastructure implementations, and presentation.

## ADDED Requirements

### Requirement: Autenticação Domain Layer — Entities
The domain layer MUST contain authentication-related entities.

#### Scenario: Usuario Entity Exists
- GIVEN the `src/domain/autenticacao/entities/` directory
- WHEN the codebase is inspected
- THEN a `Usuario.ts` entity MUST exist with properties: `id`, `email`, `papel` (owner/manager/staff/cliente), `restauranteId`, `criadoEm`
- AND the entity MUST NOT import from Next.js, React, or infrastructure layers

#### Scenario: Sessao Entity Exists
- GIVEN the `src/domain/autenticacao/entities/` directory
- WHEN the codebase is inspected
- THEN a `Sessao.ts` entity MUST exist with properties: `id`, `usuarioId`, `token`, `expiracao`, `dispositivo`
- AND the entity MUST contain session validation logic

### Requirement: Autenticação Domain Layer — Value Objects
The domain layer MUST contain value objects.

#### Scenario: Papel Value Object Exists
- GIVEN the `src/domain/autenticacao/value-objects/` directory
- WHEN the codebase is inspected
- THEN a `Papel.ts` value object MUST exist with values: `owner`, `manager`, `staff`, `cliente`

#### Scenario: Credenciais Value Object Exists
- GIVEN the `src/domain/autenticacao/value-objects/` directory
- WHEN the codebase is inspected
- THEN a `Credenciais.ts` value object MUST exist with `email` and `senha` properties
- AND it MUST provide validation for email format and senha strength

### Requirement: Autenticação Domain Layer — Aggregates
The domain layer MUST contain aggregate roots.

#### Scenario: UsuarioAggregate Exists
- GIVEN the `src/domain/autenticacao/aggregates/` directory
- WHEN the codebase is inspected
- THEN a `UsuarioAggregate.ts` aggregate root MUST exist
- AND it MUST encapsulate Usuario entity and role-based access logic

### Requirement: Autenticação Domain Layer — Repository Interfaces
The domain layer MUST define repository interfaces.

#### Scenario: IUsuarioRepository Interface Exists
- GIVEN the `src/domain/autenticacao/repositories/` directory
- WHEN the codebase is inspected
- THEN an `IUsuarioRepository.ts` interface MUST exist with methods: `findById(id)`, `findByEmail(email)`, `save(usuario)`, `delete(id)`

#### Scenario: ISessaoRepository Interface Exists
- GIVEN the `src/domain/autenticacao/repositories/` directory
- WHEN the codebase is inspected
- THEN an `ISessaoRepository.ts` interface MUST exist with methods: `findByToken(token)`, `save(sessao)`, `delete(token)`, `deleteExpired()`

### Requirement: Autenticação Domain Layer — Domain Events
The domain layer MUST define domain events.

#### Scenario: Domain Events Exist
- GIVEN the `src/domain/autenticacao/events/` directory
- WHEN the codebase is inspected
- THEN `UsuarioCriadoEvent.ts`, `SessaoCriadaEvent.ts`, `SessaoExpiradaEvent.ts` event classes MUST exist

### Requirement: Autenticação Application Layer — Use Cases
The application layer MUST contain use case services.

#### Scenario: RegistrarUsuarioUseCase Exists
- GIVEN the `src/application/autenticacao/services/` directory
- WHEN the codebase is inspected
- THEN a `RegistrarUsuarioUseCase.ts` class MUST exist
- AND it MUST create UsuarioAggregate and call Supabase Auth

#### Scenario: AutenticarUsuarioUseCase Exists
- GIVEN the `src/application/autenticacao/services/` directory
- WHEN the codebase is inspected
- THEN an `AutenticarUsuarioUseCase.ts` class MUST exist
- AND it MUST validate credentials and create session

#### Scenario: ValidarSessaoUseCase Exists
- GIVEN the `src/application/autenticacao/services/` directory
- WHEN the codebase is inspected
- THEN a `ValidarSessaoUseCase.ts` class MUST exist
- AND it MUST verify session validity and return usuario data

#### Scenario: RedefinirSenhaUseCase Exists
- GIVEN the `src/application/autenticacao/services/` directory
- WHEN the codebase is inspected
- THEN a `RedefinirSenhaUseCase.ts` class MUST exist
- AND it MUST handle password reset flow via Supabase Auth

### Requirement: Autenticação Infrastructure Layer — Persistence
The infrastructure layer MUST implement repository interfaces.

#### Scenario: UsuarioRepository Implementation Exists
- GIVEN the `src/infrastructure/persistence/autenticacao/` directory
- WHEN the codebase is inspected
- THEN a `UsuarioRepository.ts` class MUST exist implementing `IUsuarioRepository`
- AND it MUST use Dexie for local caching

#### Scenario: SessaoRepository Implementation Exists
- GIVEN the `src/infrastructure/persistence/autenticacao/` directory
- WHEN the codebase is inspected
- THEN a `SessaoRepository.ts` class MUST exist implementing `ISessaoRepository`
- AND it MUST handle session persistence

### Requirement: Autenticação Infrastructure Layer — External Adapters
The infrastructure layer MUST contain external API adapters.

#### Scenario: SupabaseAuthAdapter Exists
- GIVEN the `src/infrastructure/external/` directory
- WHEN the codebase is inspected
- THEN a `SupabaseAuthAdapter.ts` class MUST exist
- AND it MUST wrap Supabase Auth operations
- AND it MUST expose a clean interface for use cases

### Requirement: Autenticação Presentation Layer — Boundaries
The presentation layer MUST only contain UI rendering and input collection.

#### Scenario: Auth Pages Delegate to Application Layer
- GIVEN `src/presentation/pages/login.tsx` and `src/presentation/pages/register.tsx`
- WHEN the pages are inspected
- THEN they MUST NOT contain authentication logic
- AND login/register operations MUST delegate to use cases

#### Scenario: Auth Hooks Delegate to Application Layer
- GIVEN `src/presentation/hooks/` contains auth-related hooks
- WHEN the hooks are inspected
- THEN each hook MUST call use cases from `src/application/autenticacao/services/`

#### Scenario: Session State Management
- GIVEN session state is needed in presentation
- WHEN the session state is managed
- THEN the presentation layer MUST use application layer services to get/set session data
- AND the presentation layer MUST NOT access Supabase Auth directly

### Requirement: Autenticação Dependency Rules
The system MUST enforce unidirectional dependency flow between layers.

#### Scenario: Domain Has No External Dependencies
- GIVEN any file in `src/domain/autenticacao/`
- WHEN imports are inspected
- THEN NO import from `src/application/`, `src/infrastructure/`, or `src/presentation/` MUST exist

#### Scenario: Presentation Uses AuthProvider Pattern
- GIVEN authentication state is needed across presentation
- WHEN auth state is accessed
- THEN the presentation layer MUST use an AuthContext that delegates to application layer
- AND the AuthContext MUST NOT bypass application layer

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.
