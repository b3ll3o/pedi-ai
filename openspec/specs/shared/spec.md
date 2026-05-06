# Spec for Shared Domain

## ADDED Requirements

### Requirement: Dinheiro Value Object
The shared domain MUST provide a reusable `Dinheiro` value object for representing monetary values across all bounded contexts.

#### Scenario: Dinheiro Represents Monetary Value
- GIVEN the need to represent a monetary amount
- WHEN a `Dinheiro` value object is created
- THEN it MUST store `valor` (integer in centavos) and `moeda` (currency code)
- AND it MUST be immutable after creation

#### Scenario: Dinheiro Arithmetic Operations
- GIVEN two `Dinheiro` instances with the same currency
- WHEN `somar()` is called with another `Dinheiro`
- THEN the system SHALL return a new `Dinheiro` with the sum of values
- AND the original instances SHALL remain unchanged

#### Scenario: Dinheiro Cannot Add Different Currencies
- GIVEN two `Dinheiro` instances with different currencies
- WHEN `somar()` is called
- THEN the system SHALL throw an error indicating currency mismatch

#### Scenario: Dinheiro Multiplication
- GIVEN a `Dinheiro` instance and a numeric factor
- WHEN `multiplicar(fator)` is called
- THEN the system SHALL return a new `Dinheiro` with the multiplied value
- AND the result SHALL be rounded to the nearest integer

#### Scenario: Dinheiro Creation Helpers
- GIVEN a numeric value in centavos
- WHEN `Dinheiro.criar(valorEmCentavos)` is called
- THEN the system SHALL return a `Dinheiro` instance with that value

#### Scenario: Dinheiro Creation from Reais
- GIVEN a numeric value in reais (e.g., 19.90)
- WHEN `Dinheiro.criarDeReais(valorEmReais)` is called
- THEN the system SHALL convert to centavos internally (1990)
- AND return a `Dinheiro` instance

#### Scenario: Predefined Constants
- GIVEN the domain needs a zero monetary value
- WHEN `Dinheiro.ZERO` is accessed
- THEN the system SHALL return a `Dinheiro` with valor=0 and moeda='BRL'
- AND `Dinheiro.BRL` SHALL equal 'BRL'

### Requirement: Shared Value Objects Index
The shared domain MUST export all value objects for consumption by other domains.

#### Scenario: Value Objects Are Re-exported
- GIVEN other domains need to import shared value objects
- WHEN imports are made from `@/domain/shared/value-objects`
- THEN `Dinheiro` SHALL be available for import

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.
