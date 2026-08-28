# PROJECT STATE — ProInvest

Phase: IMPLEMENTATION / Beta D14
Baseline: v0.1
Architecture: modular monolith
System of record: PostgreSQL
External financial write: disabled
Current slice: Strategy Catalog → EQUITY_HOLDING@1 → Preview → Save → Reload → Position
Golden cases: EMBR3, OIBR3

## Gates
- TRUTH: PASS
- PRODUCT: PASS
- SPEC: PASS V0.1
- ARCH: PASS V0.1
- REPO-AUDIT: PASS
- FOUNDATION: IMPLEMENTED / EVIDENCE PENDING
- IMPLEMENT: OPEN
- PROD: NOT STARTED

## Gaps
- Confirmar "Renda Fixa" + EMBR3.
- Confirmar PTBR4 e SMIG3.
- Confirmar semântica de fees LP.
- Obter quantity/notional do BTC alavancado.

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
