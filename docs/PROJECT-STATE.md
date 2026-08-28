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
