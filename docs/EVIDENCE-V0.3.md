# Evidence V0.3

## Implemented
- migration tracking via `schema_migrations`
- SHA-256 migration drift detection
- migration rerun behavior
- transactional seed runner
- request idempotency persistence
- operation reload endpoint
- PostgreSQL integration test
- CI PostgreSQL service

## Evidence pending
These files are implementation artifacts, not proof of runtime success.
The following must execute green in GitHub CI before `GATE-FOUNDATION` becomes PASS:

1. dependency install
2. TypeScript build
3. first migration run
4. second migration run (idempotency)
5. seeds
6. golden tests
7. PostgreSQL integration test
8. npm audit threshold

No PASS is claimed before CI evidence exists.
# V0.4 Evidence

- `npm ci`, build, migrations (including second run), seeds, tests and audit passed in GitHub Actions run `33172926227` for V0.3; the V0.4 run is pending after this change.
- Local golden cases: EMBR3 `150 × 38.23 = 5734.50` and OIBR3 `335 × 1.28 = 428.80` pass.
- Local E2E is skipped without `TEST_DATABASE_URL`; no local PostgreSQL evidence is claimed.
- No secrets or generated artifacts are included in the change.

## V0.5 Multi-leg

- Domain golden fixture covers Long & Short: long `3041.12`, short `2425.50`, gross `5466.62`, net `615.62` BRL.
- HTTP/database E2E covers catalog resolution, preview, atomic save, idempotent retry, two-leg reload and PostgreSQL decimal representation.
- `GAP-002`: PTBR4 and SMIG3 are not externally validated; they remain user-provided acceptance fixtures.

## V0.6 Futures

- WDO product metadata provenance: B3, verified 2026-08-28; source URL is documentation only.
- GOLDEN-004: WDOL26 SELL 10 contracts, 5336 → 5330, factor 10, price move 6, gross P&L 600.00 BRL.
- Net P&L remains `INCOMPLETE` with `MISSING_TRADING_COSTS`.
- Synthetic contract metadata test changes factor to 5 and gross P&L to 300.00 without calculator changes.

## V0.7 Crypto Spot

- GOLDEN-005 preserves `0.00031 × 63000.38 = 19.5301178 USD` without two-decimal rounding.
- Market value and unrealized P&L remain `INCOMPLETE` without current valuation.
- PostgreSQL/HTTP E2E covers catalog, preview, create, reload, precision, retry and conflict.
- [GAP-DOC] This cumulative evidence file retains its historical V0.3 filename; normalization is deferred.

## V0.8 Crypto Derivative

- `CRYPTO_DERIVATIVE@1` records closed BUY/SELL operations with explicit invested capital, leverage and entry/exit prices.
- The supplied short fixture preserves `100.00 × 50 × ((69358.32 - 59862.15) / 69358.32) = 684.57324225846300775451308509 USD`.
- Net P&L remains `INCOMPLETE` with `MISSING_TRADING_COSTS`; derivatives do not contribute to spot position quantity.
- [GAP] Exchange-specific liquidation, maintenance margin, funding and contract mechanics are not modeled.

## V0.9 DeFi LP

- GOLDEN-007 preserves WBTC/SOL LP values `450.31`, `428.12` and `36.22 USD` separately.
- Derived values are `positionValueDelta -22.19`, `economicValue 464.34`, `totalPnl 14.03` and `totalReturn 14.03 / 450.31`.
- Snapshots are append-only; APR/APY and impermanent loss remain unavailable without reconciled period and component quantities.

## V1.0 Portfolio Core

- Explicit classification dispatches holdings, pair exposure, DeFi LP positions and closed historical results.
- Position identity includes Strategy, account, kind and instrument for holdings.
- Portfolio is derived on read; no Portfolio persistence/projection was introduced.
- Aggregate metrics preserve known subtotal and coverage without treating missing valuation as zero.
- PostgreSQL/HTTP acceptance implements TEST-POS-001..012 and cross-currency isolation.
- GitHub Actions run `33220406046` passed dependency install, build, migration + rerun, seeds, 28 tests with 0 failures and 0 skips, dedicated Portfolio HTTP/PostgreSQL E2E and audit with 0 vulnerabilities.
