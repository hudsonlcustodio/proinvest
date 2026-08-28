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
