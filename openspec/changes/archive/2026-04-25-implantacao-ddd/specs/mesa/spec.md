# Delta for Mesa Bounded Context

## Overview

This delta spec defines DDD layer requirements for the `mesa` bounded context, covering the table domain. All requirements enforce clean separation between domain logic, application use cases, infrastructure implementations, and presentation.

## ADDED Requirements

### Requirement: Mesa Domain Layer — Entities
The domain layer MUST contain the Mesa entity.

#### Scenario: Mesa Entity Exists
- GIVEN the `src/domain/mesa/entities/` directory
- WHEN the codebase is inspected
- THEN a `Mesa.ts` entity MUST exist with properties: `id`, `restauranteId`, `label`, `qrCodePayload`, `qrCodeAssinatura`, `ativo`, `createdAt`
- AND the entity MUST contain domain logic for QR code payload generation and validation
- AND the entity MUST NOT import from Next.js, React, or infrastructure layers

### Requirement: Mesa Domain Layer — Value Objects
The domain layer MUST contain value objects for immutable concepts.

#### Scenario: QRCodePayload Value Object Exists
- GIVEN the `src/domain/mesa/value-objects/` directory
- WHEN the codebase is inspected
- THEN a `QRCodePayload.ts` value object MUST exist with properties: `restauranteId`, `mesaId`, `assinatura`
- AND the value object MUST provide validation method for signature verification

### Requirement: Mesa Domain Layer — Aggregates
The domain layer MUST contain aggregates for table management.

#### Scenario: MesaAggregate Exists
- GIVEN the `src/domain/mesa/aggregates/` directory
- WHEN the codebase is inspected
- THEN a `MesaAggregate.ts` aggregate root MUST exist
- AND it MUST encapsulate Mesa entity and QR code generation logic
- AND it MUST enforce: active tables cannot have duplicate labels within same restaurant

### Requirement: Mesa Domain Layer — Repository Interfaces
The domain layer MUST define repository interfaces as contracts.

#### Scenario: IMesaRepository Interface Exists
- GIVEN the `src/domain/mesa/repositories/` directory
- WHEN the codebase is inspected
- THEN an `IMesaRepository.ts` interface MUST exist with methods: `findById(id)`, `findByRestauranteId(restauranteId)`, `findAtivas()`, `save(mesa)`, `delete(id)`

### Requirement: Mesa Domain Layer — Domain Events
The domain layer MUST define domain events.

#### Scenario: Domain Events Exist
- GIVEN the `src/domain/mesa/events/` directory
- WHEN the codebase is inspected
- THEN `MesaCriadaEvent.ts`, `MesaDesativadaEvent.ts` event classes MUST exist

### Requirement: Mesa Application Layer — Use Cases
The application layer MUST contain use case services.

#### Scenario: CriarMesaUseCase Exists
- GIVEN the `src/application/mesa/services/` directory
- WHEN the codebase is inspected
- THEN a `CriarMesaUseCase.ts` class MUST exist
- AND it MUST create MesaAggregate, generate QR code, and persist via IMesaRepository

#### Scenario: ValidarQRCodeUseCase Exists
- GIVEN the `src/application/mesa/services/` directory
- WHEN the codebase is inspected
- THEN a `ValidarQRCodeUseCase.ts` class MUST exist
- AND it MUST validate QR code payload and signature
- AND it MUST return mesa identification or error

#### Scenario: ListarMesasUseCase Exists
- GIVEN the `src/application/mesa/services/` directory
- WHEN the codebase is inspected
- THEN a `ListarMesasUseCase.ts` class MUST exist
- AND it MUST return all mesas for a restaurant

### Requirement: Mesa Infrastructure Layer — Persistence
The infrastructure layer MUST implement repository interfaces.

#### Scenario: MesaRepository Implementation Exists
- GIVEN the `src/infrastructure/persistence/mesa/` directory
- WHEN the codebase is inspected
- THEN a `MesaRepository.ts` class MUST exist implementing `IMesaRepository`
- AND it MUST use Dexie for IndexedDB persistence

### Requirement: Mesa Presentation Layer — Boundaries
The presentation layer MUST only contain UI rendering and input collection.

#### Scenario: Table Components Delegate to Application Layer
- GIVEN any component in `src/presentation/` related to tables
- WHEN the component is inspected
- THEN it MUST NOT contain business logic
- AND all data operations MUST delegate to application use cases

#### Scenario: QRCode Generation Uses Domain Logic
- GIVEN the presentation layer needs QR code generation
- WHEN the QR code is generated
- THEN the request MUST be routed through MesaAggregate domain logic
- AND the presentation layer MUST NOT construct QR code payloads directly

### Requirement: Mesa Dependency Rules
The system MUST enforce unidirectional dependency flow between layers.

#### Scenario: Domain Has No External Dependencies
- GIVEN any file in `src/domain/mesa/`
- WHEN imports are inspected
- THEN NO import from `src/application/`, `src/infrastructure/`, or `src/presentation/` MUST exist

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.
