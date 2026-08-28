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
