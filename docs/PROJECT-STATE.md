# PROJECT STATE — ProInvest

Phase: SPECIFICATION / V1.0 Portfolio & Analytics
Baseline: V0.9 (`6770a118fc8989fdb02374489acfa00b45a9b399`)
Architecture: modular monolith
System of record: PostgreSQL
External financial write: disabled
Current scope: PRD V1.0 — Portfolio & Analytics (no production implementation)
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
- PORTFOLIO-IMPLEMENT: NOT STARTED
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

`docs/PRD-PORTFOLIO-V1.md` defines Portfolio as a read-only on-read derived view, separates current positions from historical results, forbids implicit cross-currency totals, defines partial completeness and provenance, and establishes GOLDEN-001..007 acceptance requirements. No Portfolio production code, API, schema or UI has been implemented.
