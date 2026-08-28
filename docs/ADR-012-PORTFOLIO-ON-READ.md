# ADR-012 — Portfolio on-read aggregation

## Context

The workload is beta/low-volume, PostgreSQL is the system of record, and no measured latency or scale evidence requires a projection.

## Decision

Derive Portfolio on read inside the modular monolith from operations, legs and applicable valuations/snapshots. Introduce no materialized Portfolio, event-sourcing infrastructure, mandatory cache or microservice.

## Consequences

The model is simple, correct and rebuild-free. Query cost must be observed. Any future projection is disposable and cannot become source of truth.

## Alternatives

Materialized views, CQRS projections, Redis and a separate Portfolio service were rejected as premature complexity without workload evidence.

## Review trigger

Review when p95 consistently exceeds its SLO, rows scanned or DB cost grows materially, the dataset leaves beta scale, or point-in-time history becomes required.
