# ADR-014 — Current Portfolio versus historical results

## Context

Open positions/exposures and closed realized or gross results answer different questions. Combining them produces ambiguous totals.

## Decision

Use separate current-position and historical-result query models and API collections. Closed futures and crypto derivatives never contribute to current positions; their gross and net metrics remain distinct.

## Consequences

Consumers cannot accidentally present closed result as current exposure. The API has separate paginated collections and the summary may aggregate each domain only under explicit labels.

## Alternatives

A single mixed activity/portfolio list and a single combined performance total were rejected as semantically ambiguous.

## Review trigger

Review when an explicitly approved total-return model can reconcile current unrealized and historical realized/net results with complete costs and valuation.
