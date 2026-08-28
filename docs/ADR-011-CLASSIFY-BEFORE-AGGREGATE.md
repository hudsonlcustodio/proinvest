# ADR-011 — Classify positions before aggregation

## Context

The legacy position query groups open legs by account/instrument and includes equity-pair legs. Existence of a leg does not imply holding semantics.

## Decision

Classify operation template/version/status in the domain/application boundary before dispatching to holding, pair or LP aggregation. SQL may prefilter only as an optimization consistent with the explicit policy.

## Consequences

Pair and LP component legs cannot leak into holdings. New templates require an explicit classification decision. The Portfolio module needs a richer operation read model than the legacy endpoint.

## Alternatives

Grouping all legs by ticker was rejected as economically incorrect. Encoding classification only in SQL was rejected because policy would be hidden and difficult to test independently.

## Review trigger

Review when a new template/status can contribute to current positions or when classification must become version/configuration driven.
