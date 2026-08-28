# API V0.1

## GET /health
Liveness da API.

## GET /v1/strategies
Retorna estratégias ACTIVE.

## POST /v1/operations/preview
Calcula preview determinístico sem persistência.

## POST /v1/operations
Primeira operação persistente suportada: `EQUITY_HOLDING@1`.

### Regras
- Uma leg.
- Strategy deve existir, estar ACTIVE e resolver `EQUITY_HOLDING@1`.
- quantity e entryPrice são strings decimais.
- Operation + leg são gravadas na mesma transação.
- costBasis é derivado no backend.
