# ADR-013 — Partial aggregate metrics and coverage

## Context

Existing `MoneyMetric` represents component metrics but cannot preserve a known subtotal and coverage when some aggregate components are missing.

## Decision

Keep `MoneyMetric` backward compatible and introduce Portfolio-specific `AggregateMoneyMetric`. Partial variants carry `knownValue`, currency, reason and `Coverage`; available variants require complete coverage.

## Consequences

Known values remain visible without claiming completeness. Missing is never zero. Aggregate contracts add a new type but existing calculators and responses remain stable.

## Alternatives

Extending `MoneyMetric` globally was rejected due to migration impact and aggregate-only fields. Returning null for the entire aggregate was rejected because it discards known evidence.

## Review trigger

Review if multiple independent missing reasons require standardized reason counts or if nested aggregation needs richer weighted coverage.
