# Gates

## Foundation
Requires repository structure, build, migrations, tests, CI and no committed secrets.

## Equity Holding
Requires strategy reference, preview, exact decimal calculation, persistence contract, EMBR3/OIBR3 golden PASS and precision preserved after reload/edit.

## V0.4 Evidence
- Strategy catalog, accounts and instruments are loaded through API/DB.
- Preview and save expose `costBasis`; market value and P&L remain `INCOMPLETE` without valuation.
- Position is reconstructed from persisted operations; no position table/source was introduced.
- Buy-only holding flow is exposed; trade/withdraw/transfer are not enabled.
- GitHub Actions provides PostgreSQL-backed E2E evidence for EMBR3 and reload/position.

## Multi-leg
Requires `EQUITY_PAIR@1`, two-leg atomic persistence, complete reload, idempotency, currency safety, Long & Short golden evidence and a green PostgreSQL-backed pipeline.

GAP-002: PTBR4 and SMIG3 remain unvalidated externally and are used only as user-provided acceptance fixtures.

## Futures
Requires instrument-sourced contract metadata, exact round-trip P&L, closed persistence/reload, idempotency, regression goldens and PostgreSQL-backed E2E. B3 provenance is documented; WDOL26 execution is not externally claimed.

## Crypto Spot
Requires `CRYPTO_SPOT@1`, exact fractional precision beyond two decimals, BUY-only validation, BTC reference data, persistence/reload, idempotency and PostgreSQL-backed HTTP E2E.

[GAP] `63000.38` is interpreted as USD/BTC unit price from the supplied fixture; no external price validation is claimed.

## Crypto Derivative
Requires `CRYPTO_DERIVATIVE@1`, explicit invested capital and leverage, exact Decimal sign semantics for BUY/SELL, closed operation persistence/reload, idempotency, PostgreSQL HTTP E2E and isolation from spot positions.

[DECISÃO] V0.8 uses `investedCapital × leverage × underlying return` as the economic contract supplied for this slice.

[GAP] Liquidation, maintenance margin, funding, exchange-specific rules and contract mechanics remain outside V0.8.

## DeFi LP
Requires `DEFI_LP@1`, separate WBTC/SOL component identity, distinct entry and valuation inputs, append-only snapshots, exact Decimal metrics, unknown-vs-zero semantics, spot isolation, idempotency and PostgreSQL HTTP E2E.

[DECISÃO] `economicValue = currentPositionValue + unclaimedFees` and `totalPnl = economicValue - investedAmount`; unclaimed fees are not claimed cash flow.

[GAP] The supplied 36-day period is not reconciled with the 2026-07-28 entry date, so no annualization is calculated. Missing component quantities prevent reliable impermanent-loss calculation. Protocol, chain, pool address and fee tier were not supplied.

## Portfolio Specification

Specification source: `docs/PRD-PORTFOLIO-V1.md`.

- PORT-SPEC-001: PASS — current portfolio and historical results are separate.
- PORT-SPEC-002: PASS — totals are bucketed by currency; implicit FX is forbidden.
- PORT-SPEC-003: PASS — valuation and P&L concepts are distinct.
- PORT-SPEC-004: PASS — unknown and zero remain distinct.
- PORT-SPEC-005: PASS — spot, derivative, LP, pair and futures isolation is explicit.
- PORT-SPEC-006: PASS — DeFi economic value counts known fees exactly once.
- PORT-SPEC-007: PASS — partial completeness retains known subtotal and coverage.
- PORT-SPEC-008: PASS — provenance requirements are defined.
- PORT-SPEC-009: PASS — GOLDEN-001..007 are the acceptance dataset.
- PORT-SPEC-010: PASS — candidate read-only API contract is proposed.
- PORT-SPEC-011: PASS — measurable RNFs are defined.
- PORT-SPEC-012: PASS — security constraints and non-goals are explicit.

[DECISÃO] `GATE-PORTFOLIO-SPEC = PASS`. This gate approves specification only. `GATE-PORTFOLIO-IMPLEMENT` and Portfolio delivery remain `NOT STARTED`.

## Portfolio Architecture

Architecture source: `docs/ARCHITECTURE-PORTFOLIO-V1.md` and ADR-011..014.

- PORT-ARCH-001: PASS — classify-before-aggregate is formalized.
- PORT-ARCH-002: PASS — Strategy-aware PositionKey is approved.
- PORT-ARCH-003: PASS — holding, pair and LP aggregation are separated.
- PORT-ARCH-004: PASS — current positions and historical results are separate models.
- PORT-ARCH-005: PASS — AggregateMoneyMetric and coverage are approved.
- PORT-ARCH-006: PASS — currency buckets forbid implicit FX.
- PORT-ARCH-007: PASS — valuation read boundary and policy extensions are defined.
- PORT-ARCH-008: PASS — minimal provenance references are defined.
- PORT-ARCH-009: PASS — summary/positions/historical-results API decomposition is selected.
- PORT-ARCH-010: PASS — TEST-POS-001..012 are defined.
- PORT-ARCH-011: PASS — on-read aggregation and review triggers are explicit.
- PORT-ARCH-012: PASS — read-only security and denied capabilities are explicit.

[DECISÃO] `GATE-PORTFOLIO-ARCH = PASS`. This gate approves architecture and contracts only. Portfolio implementation and delivery remain `NOT STARTED`.

## Portfolio Implementation

Evidence: GitHub Actions run `33220406046`, 28 passed, 0 failed, 0 skipped, including the dedicated Portfolio HTTP/PostgreSQL E2E.

- PORT-IMP-001: PASS — classification policy implemented.
- PORT-IMP-002: PASS — PositionKey includes Strategy.
- PORT-IMP-003: PASS — equity pairs are excluded from holdings.
- PORT-IMP-004: PASS — operation-scoped pair exposure implemented.
- PORT-IMP-005: PASS — DeFi LP current position uses latest snapshot.
- PORT-IMP-006: PASS — closed futures/derivatives are historical only.
- PORT-IMP-007: PASS — AggregateMoneyMetric and coverage implemented.
- PORT-IMP-008: PASS — missing values are never converted to zero.
- PORT-IMP-009: PASS — per-currency buckets implemented.
- PORT-IMP-010: PASS — cross-currency global is incomplete without FX.
- PORT-IMP-011: PASS — valuation boundary exists with no cost-basis fallback.
- PORT-IMP-012: PASS — operation/snapshot provenance is preserved.
- PORT-IMP-013: PASS — `GET /v1/portfolio` implemented.
- PORT-IMP-014: PASS — `GET /v1/portfolio/positions` implemented.
- PORT-IMP-015: PASS — `GET /v1/portfolio/historical-results` implemented.
- PORT-IMP-016: PASS — TEST-POS-001..012 are green.
- PORT-IMP-017: PASS — PostgreSQL Portfolio E2E is green.
- PORT-IMP-018: PASS — GOLDEN-001..007 remain green.
- PORT-IMP-019: PASS — security review and audit are green.
- PORT-IMP-020: PASS — complete GitHub Actions pipeline is green with zero skipped tests.

[DECISÃO] `GATE-PORTFOLIO-IMPLEMENT = PASS`. This approves the read-only API/core; Portfolio dashboard remains not started.

## V1.0 Product Complete

- PROD-V1-001: PASS — GOLDEN-001..007 and Portfolio core remain in the full regression command.
- PROD-V1-002: PASS — Portfolio UI consumes the three approved read endpoints.
- PROD-V1-003: PASS — shared navigation integrates Portfolio and every operation flow.
- PROD-V1-004: PASS — current positions and historical results are visually and semantically separate.
- PROD-V1-005: PASS — incomplete metrics expose known subtotal, reason and coverage.
- PROD-V1-006: PASS — currency buckets remain separate and global total explains missing base currency/FX.
- PROD-V1-007: PASS — responsive layout, landmarks, skip link, focus states, reduced-motion handling, loading, empty and error states establish the UX/accessibility baseline.
- PROD-V1-008: PASS — `npm test` is the complete unit/integration/web regression entry point.
- PROD-V1-009: PASS — `docs/RUNBOOK-V1.md` covers setup, verification, failures and rollback.
- PROD-V1-010: PASS — CI has read-only permissions, PostgreSQL 18, idempotent migration check, full tests, audit, concurrency control and timeout.
- PROD-V1-011: PASS — security regression verifies CSP, anti-framing, no-sniff and browser capability restrictions; Portfolio remains read-only.

[DECISÃO] `GATE-V1.0-PRODUCT-COMPLETE = PASS`. `GATE-PROD PUBLIC` is explicitly outside this gate and remains `NOT STARTED`.

## UX Design V1.1

- UX-001: PASS — canonical `DESIGN.md`.
- UX-002: PASS — one React/Vite/Tailwind foundation.
- UX-003: PASS — provenance, notices and license review recorded.
- UX-004: PASS — premium typed Portfolio implemented.
- UX-005: PASS — six vertical slices migrated into one shell.
- UX-006: PASS — API remains the financial source of truth.
- UX-007: PASS — known subtotal, reason and coverage remain explicit.
- UX-008: PASS — BRL/USD isolation and unavailable global total are explicit.
- UX-009: PASS — desktop/mobile browser QA completed.
- UX-010: PASS — WCAG 2.2 AA baseline implemented.
- UX-011: PASS — restrained motion and reduced-motion fallback.
- UX-012: PASS — four-pass visual/browser smoke completed.
- UX-013: PASS — no fake data or chart.
- UX-014: PASS — CSP/security headers, escaped React rendering and zero secrets.
- UX-015: PASS — GOLDEN-001..007 green locally.
- UX-016: PENDING CI — PostgreSQL Portfolio E2E requires CI service.
- UX-017: PASS — 5 frontend tests green.
- UX-018: PENDING CI — zero-skipped complete pipeline.

`GATE-UX-DESIGN-V1` remains `IN VALIDATION` until UX-016 and UX-018 are evidenced by CI.
