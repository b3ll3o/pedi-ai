# Delta for Pagamento Domain

## ADDED Requirements

### Requirement: MetodoPagamento Ownership
The `pagamento` context SHALL be the sole owner of the `MetodoPagamento` value object.

#### Scenario: MetodoPagamento Is Owned by Pagamento
- GIVEN other contexts (e.g., `pedido`) need to reference payment methods
- WHEN they import `MetodoPagamento`
- THEN they SHALL import from `@/domain/pagamento/value-objects/MetodoPagamento`
- AND the `pagamento` context SHALL be considered the authoritative source

### Requirement: PagamentoConfirmadoEvent Ownership
The `pagamento` context SHALL be the sole owner of the `PagamentoConfirmadoEvent`.

#### Scenario: PagamentoConfirmadoEvent Belongs to Pagamento
- GIVEN the `pagamento` context confirms a payment
- WHEN the payment is successfully processed
- THEN the system SHALL emit `PagamentoConfirmadoEvent` from `src/domain/pagamento/events/`
- AND other contexts (e.g., `pedido`) SHALL consume this event

#### Scenario: PagamentoConfirmadoEvent Contains Pagamento Aggregate
- GIVEN a `PagamentoConfirmadoEvent` is created
- WHEN the event is constructed
- THEN it SHALL contain the `Pagamento` aggregate as payload
- AND it SHALL include `occurredOn` timestamp and `eventType`

---

## MODIFIED Requirements

### Requirement: PagamentoConfirmadoEvent Definition
- **PREVIOUS**: The spec was ambiguous about which context owns `PagamentoConfirmadoEvent`
- **UPDATED**: The `pagamento` context is the owner. The event contains the `Pagamento` entity, not `Pedido`.

#### Scenario: Event Contains Pagamento Not Pedido
- GIVEN `PagamentoConfirmadoEvent` is defined in `src/domain/pagamento/events/`
- WHEN the event payload is inspected
- THEN it SHALL contain `pagamento: Pagamento` as the primary entity
- AND it SHALL NOT contain `pedido: Pedido` directly (that association is implicit via `pagamento.pedidoId`)

---

## REMOVED Requirements

None.
