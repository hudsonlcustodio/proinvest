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
