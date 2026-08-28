# API V0.1

## Portfolio V1 architecture contract — proposed, not implemented

The approved candidate decomposition is:

- `GET /v1/portfolio` — compact summary and currency buckets.
- `GET /v1/portfolio/positions` — discriminated current holdings, pair exposures and DeFi LP positions with filters/cursor pagination.
- `GET /v1/portfolio/historical-results` — closed futures and crypto-derivative results with filters/cursor pagination.

These endpoints are architecture contracts only. They are not implemented by this documentation change. Their DTOs, completeness rules, provenance and security boundaries are defined in `ARCHITECTURE-PORTFOLIO-V1.md`.

The existing `GET /v1/operations/position/:accountId/:instrumentId` is a legacy operation-position endpoint and is not the Portfolio V1 contract.

## GET /health
Liveness da API.

## GET /v1/strategies
Retorna estratégias ACTIVE.

## POST /v1/operations/preview
Calcula preview determinístico sem persistência.

## POST /v1/operations

`CRYPTO_DERIVATIVE@1` aceita `STR-006` com `BUY` ou `SELL` e os campos string `investedCapital`, `leverage`, `entryPrice`, `exitPrice` e `currency`. A resposta expõe `effectiveNotional`, `priceMove`, `underlyingReturn`, `leveragedReturn`, `grossPnl` e `netPnl`. A operação é persistida como `CLOSED`; `netPnl` permanece `INCOMPLETE` enquanto custos de trading não forem informados.

[DECISÃO] A semântica V0.8 é `investedCapital × leverage × underlying return`; não modela liquidation, maintenance margin, funding ou regras específicas de exchange.

`DEFI_LP@1` registra uma entrada aberta com `componentInstrumentIds` para o par e `investedAmount`. Valuation é append-only em `POST /v1/operations/:id/snapshots`, com `currentPositionValue`, `unclaimedFees`, `currency` e `observedAt`; métricas atuais são consultadas em `GET /v1/operations/:id/metrics` e o histórico em `GET /v1/operations/:id/snapshots`.
Primeira operação persistente suportada: `EQUITY_HOLDING@1`.

### Regras
- Uma leg.
- Strategy deve existir, estar ACTIVE e resolver `EQUITY_HOLDING@1`.
- quantity e entryPrice são strings decimais.
- Operation + leg são gravadas na mesma transação.
- costBasis é derivado no backend.
