# PRD V1.2: Intelligence and Connections

## Problem and actors
Private-beta investors need one explainable view of known wealth and data quality without implicit FX, fabricated valuation, or trading advice. Primary actor: portfolio owner/operator. Secondary actor: future read-only data administrator.

## Objectives
- OBJ-INT-001: make Dashboard the macro home and Portfolio the drill-down.
- OBJ-INT-002: explain completeness, provenance and data health.
- OBJ-INT-003: ingest external/file records through staging and reconciliation only.
- OBJ-INT-004: make financial write capabilities impossible in connector contracts.

## Non-goals
Order execution, transfers, signing, leverage mutation, tax, forecasts, public deployment, microservices, LLM advice, invented FX/history/market data, and arbitrary REST connectors.

## Journeys
1. Dashboard -> review currency-safe snapshot -> inspect health -> Portfolio/Insights.
2. File Import -> staging preview -> resolve Strategy/instrument -> promote canonical operation -> Dashboard.
3. Connection -> verify read-only capability -> sync -> review reconciliation. Live provider remains pending explicit selection.

## Requirements
- RF-DASH-001..012: server-side filters; currency buckets; known allocation; explicit coverage; health; positions preview; no browser calculation; no GET side effects.
- RF-AN-001..007: strategy/type/currency allocation, coverage, historical gross P&L, specialized gross exposure, real snapshot history only.
- RF-INS-001..008: deterministic INFO/ATTENTION/ACTION_REQUIRED insights with evidence, provenance and review links; never BUY/SELL advice.
- RF-VAL-001..006: append-only observations/snapshots; NUMERIC values; first observation begins history; separate currencies; no silent source priority.
- RF-CONN-001..010: explicit registry, read-only capabilities, provider-owned URLs, sanitized failures, no live provider without approval.
- RF-IMP-001..010: CSV allowlist -> staging -> normalize -> validate -> deduplicate -> reconcile -> canonical; idempotent provenance.
- RF-REC-001..006: never guess Strategy; explicit resolution/rejection; safe bulk only.

## Data, security and privacy
PostgreSQL is system of record. Secrets never return to the client or enter URLs/logs/plaintext columns. External payloads are allowlisted and minimized. Default retention for sanitized staging is configurable; exact policy is DEC-PENDING-RETENTION-001. Private beta only; no public exposure without auth/KMS/TLS/backup/incident readiness.

## Non-functional requirements
- RNF-001 WCAG 2.2 AA baseline and textual chart fallback.
- RNF-002 decimal strings/NUMERIC only; unknown is not zero.
- RNF-003 candidate Dashboard p95 <500ms on CI reference data, reported as non-production evidence.
- RNF-004 bounded payloads/concurrency/retries; no permissive CORS.
- RNF-005 Node 24, PostgreSQL 18, migration rerun, 0 skipped gate tests and audit without high vulnerabilities.

## Observability, cost and rollout
Structured safe counters/timings cover dashboard queries, incomplete metrics, connection health, sync outcomes and reconciliation pending. Cost drivers: provider APIs, market data, egress, snapshot storage and observability; no provider cost is invented. Rollout: Wave A intelligence, Wave B connections core/file import, Wave C integration. GATE-PROD-PUBLIC remains out of scope.

## Risks and acceptance
- RSK-001 misleading partial allocation: mitigated by “known value” wording and coverage.
- RSK-002 secret disclosure: encrypted boundary and negative tests.
- RSK-003 duplicate canonical data: stable identity/fingerprint and unique constraints.
- RSK-004 advisory implication: deterministic descriptive copy, forbidden BUY/SELL test.

Acceptance is defined by TEST-DASH-001..012, TEST-INS-001..008, TEST-CONN-001..010 and TEST-IMP-001..010 from the mission contract plus the existing GOLDEN-001..007.
