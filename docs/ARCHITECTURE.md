# Architecture V0.1

Monólito modular com boundaries: Strategies, Instruments, Operations, Portfolio, Valuation e Reconciliation.

External Source → Adapter/Normalizer → Operations → Portfolio → Valuation.

## Proibido
- Domain → UI
- Domain → API externa
- Portfolio → SDK de exchange
- Frontend → Database
- Adapter externo → UI

## Regras
PostgreSQL é system of record. UI pode prever cálculos, mas backend é fonte de verdade.
Operações multi-leg são aggregate roots transacionais. Valores financeiros exatos não usam IEEE-754 Number como representação canônica.
