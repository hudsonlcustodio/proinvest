# PROJECT STATE — ProInvest

Wave A V1.2 is complete on `v1.2-portfolio-intelligence`: executable PRD, architecture, typed Dashboard/Analytics/Insights query model, deterministic rules and append-only valuation history. PostgreSQL 18 regression, responsive browser QA and Actions run `33270737913` are green. No provider, FX, valuation or history is fabricated.

Phase: V1.1 VISUAL SYSTEM COMPLETE
Baseline: Portfolio Architecture (`536bd48fcf032c7a379ba0868496b28d375a228f`)
Architecture: modular monolith
System of record: PostgreSQL
External financial write: disabled
Current scope: PRD V1.0 — Portfolio & Analytics (product complete; public production gate excluded)
Golden cases: GOLDEN-001..007

## Gates
- TRUTH: PASS
- PRODUCT: PASS
- SPEC: PASS V0.1
- ARCH: PASS V0.1
- REPO-AUDIT: PASS
- FOUNDATION: PASS
- EQUITY-HOLDING: PASS
- MULTI-LEG: PASS
- FUTURES: PASS
- CRYPTO-SPOT: PASS
- CRYPTO-DERIVATIVE: PASS
- DEFI-LP: PASS
- PORTFOLIO-SPEC: PASS
- PORTFOLIO-ARCH: PASS
- PORTFOLIO-IMPLEMENT: PASS
- V1.0-PRODUCT: PASS
- UX-DESIGN-V1: PASS
- PORTFOLIO-INTELLIGENCE: PASS
- PROD: NOT STARTED

## Gaps
- PTBR4 and SMIG3 remain user-provided fixtures without external ticker validation.
- Portfolio base currency, staleness policy, partial-completeness response shape and endpoint decomposition remain pending decisions.
- Equity/crypto spot current valuation storage/source is not implemented.
- Crypto derivative quantity is intentionally not inferred from invested capital and leverage.

## V0.2
Strategy read API and persistent EQUITY_HOLDING command implemented. Build, DB migration and integration evidence remain pending.

## V0.3
Migration tracking, idempotency, reload and PostgreSQL CI integration implemented. Runtime evidence remains pending.

## V0.4
Vertical slice implemented with DB-backed strategy/account/instrument catalog, functional web form, exact-decimal preview/save/reload and position reconstruction derived from operations. No trade/withdraw/transfer flows were added. End-to-end evidence is provided by GitHub Actions; local integration tests require PostgreSQL.

## V0.5
Multi-leg `EQUITY_PAIR@1` implemented for the Long & Short strategy with atomic two-leg persistence, idempotent creation, complete 1:N reload, exact exposure metrics and frontend extension. PTBR4/SMIG3 are acceptance fixtures only; external ticker validation remains open.

## V0.6
`FUTURES_ROUND_TRIP@1` implemented with DB-backed contract metadata, WDOL26 fixture, exact Decimal P&L, closed operation persistence/reload and Day Trade frontend flow. B3 provenance: product WDO, verified 2026-08-28, https://www.b3.com.br/en_us/products-and-services/trading/futures/mini-u-s-dollar-futures.htm. This provenance describes product characteristics, not execution of the supplied WDOL26 trade.

## V0.7
`CRYPTO_SPOT@1` implements a BUY-only BTC holding flow with arbitrary Decimal precision, canonical gross amount, operation-based persistence/position, idempotency and PostgreSQL HTTP E2E. The fixture value `63000.38` is treated as USD/BTC unit price supplied by the user and is not externally validated.

## V0.8
`CRYPTO_DERIVATIVE@1` records closed BUY/SELL crypto derivative operations using the supplied semantics: invested capital × leverage × underlying return. Inputs remain explicit in the operation leg; no quantity is invented or added to spot position. Exchange-specific liquidation, maintenance margin, funding and contract mechanics are not modeled.

## V0.9
`DEFI_LP@1` records an open WBTC/SOL LP entry and append-only valuation snapshots. `investedAmount`, `currentPositionValue` and `unclaimedFees` remain separate; economic value and total P&L are derived with Decimal. Pool protocol, chain, address, fee tier, APR/APY and impermanent loss remain incomplete because the supplied data does not identify them.

## V1.0 Portfolio & Analytics specification

`docs/PRD-PORTFOLIO-V1.md` defines Portfolio as a read-only on-read derived view, separates current positions from historical results, forbids implicit cross-currency totals, defines partial completeness and provenance, and establishes GOLDEN-001..007 acceptance requirements. Contracts, API and UI are implemented.

## V1.0 Portfolio & Analytics architecture

`docs/ARCHITECTURE-PORTFOLIO-V1.md` freezes classify-before-aggregate, specialized holding/pair/LP aggregation, Strategy-aware PositionKey, separate historical results, aggregate coverage, currency buckets, valuation boundary, provenance and the three-endpoint read API. ADR-011..014 are accepted and implemented.

## V1.0 Portfolio Core implementation

The read-only Portfolio core implements explicit classification, Strategy-aware holdings, operation-scoped pair/LP positions, closed historical results, partial aggregate coverage, per-currency buckets, provenance and the three approved HTTP endpoints. It remains on-read with no Portfolio table/cache and no dashboard. `DEC-P-001`, `DEC-P-002` and `DEC-P-006` remain pending and do not block the core.

## V1.0 Product complete

The Portfolio dashboard is the product entry point, with shared navigation to every operation flow, separate current/historical sections, partial-completeness language, currency buckets, responsive layout and keyboard/accessibility baseline. CI, security headers, web regression and `docs/RUNBOOK-V1.md` close the product gate. Public deployment remains explicitly outside this gate.

## V1.1 Visual system

ADR-015 selects a single React/Vite/Tailwind SPA. `DESIGN.md` freezes the dark-first private-banking/terminal contract. Portfolio and all six operation workflows are migrated to the canonical shell; legacy HTML is no longer served. Browser, frontend, licensing and security reviews are complete. Actions run `33255363156` passed with 31 server/domain/PostgreSQL tests, 5 frontend tests, 0 failed and 0 skipped. `GATE-UX-DESIGN-V1 = PASS`.
