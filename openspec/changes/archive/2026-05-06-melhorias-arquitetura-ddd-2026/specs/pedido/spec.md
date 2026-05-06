# Delta for Pedido Domain

## ADDED Requirements

None.

---

## MODIFIED Requirements

### Requirement: Dinheiro Value Object
- **PREVIOUS**: The system SHALL contain `Dinheiro` value object in `src/domain/pedido/value-objects/`
- **UPDATED**: The system SHALL use `Dinheiro` from `src/domain/shared/value-objects/` instead

#### Scenario: Pedido Uses Shared Dinheiro
- GIVEN the `Pedido` aggregate needs to handle monetary values
- WHEN the domain code references `Dinheiro`
- THEN it SHALL import from `@/domain/shared/value-objects/Dinheiro`
- AND the local `src/domain/pedido/value-objects/Dinheiro.ts` file SHALL be removed

### Requirement: MetodoPagamento Value Object
- **PREVIOUS**: The system SHALL contain `MetodoPagamento` value object in `src/domain/pedido/value-objects/`
- **UPDATED**: The system SHALL use `MetodoPagamento` from `src/domain/pagamento/value-objects/` — `pagamento` is the owning context

#### Scenario: Pedido Uses Pagamento MetodoPagamento
- GIVEN the `Pedido` aggregate or related domain logic needs payment method
- WHEN the code references `MetodoPagamento`
- THEN it SHALL import from `@/domain/pagamento/value-objects/MetodoPagamento`
- AND the local `src/domain/pedido/value-objects/MetodoPagamento.ts` file SHALL be removed

### Requirement: PagamentoConfirmadoEvent Ownership
- **PREVIOUS**: Both `pedido` and `pagamento` contexts define `PagamentoConfirmadoEvent`
- **UPDATED**: `PagamentoConfirmadoEvent` belongs to the `pagamento` context only. The `pedido` context SHALL consume this event via cross-context communication.

#### Scenario: Pedido Receives Payment Confirmation
- GIVEN a payment has been confirmed in the `pagamento` context
- WHEN the `PagamentoConfirmadoEvent` is published
- THEN the `pedido` context SHALL receive and handle the event
- AND the `pedido` context SHALL NOT define its own `PagamentoConfirmadoEvent`
- AND the file `src/domain/pedido/events/PagamentoConfirmadoEvent.ts` SHALL be removed

#### Scenario: Pedido Consumes Pagamento Event
- GIVEN the `pedido` application layer needs to react to payment confirmation
- WHEN handling payment confirmation
- THEN it SHALL use the event from `src/domain/pagamento/events/PagamentoConfirmadoEvent`
- AND it SHALL NOT emit its own payment confirmation event

---

## REMOVED Requirements

### Requirement: Dinheiro Value Object Exists in Pedido
- REMOVED: `Dinheiro` value object SHALL NOT exist in `src/domain/pedido/value-objects/`. It has been moved to `src/domain/shared/value-objects/`.

### Requirement: MetodoPagamento Value Object Exists in Pedido
- REMOVED: `MetodoPagamento` value object SHALL NOT exist in `src/domain/pedido/value-objects/`. The `pagamento` context is the owner.

### Requirement: PagamentoConfirmadoEvent Exists in Pedido
- REMOVED: `PagamentoConfirmadoEvent` SHALL NOT be defined in `src/domain/pedido/events/`. The `pagamento` context owns this event.
