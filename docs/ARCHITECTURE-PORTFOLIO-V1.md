# Architecture V1.0 — Portfolio & Analytics

Status: APPROVED ARCHITECTURE
Baseline: PRD V1.0 on `main` at `b39e6283b5a5f57777b99bafe8c926a18d15ce0e`
Scope: implementable domain/data/API contracts; no production implementation

## 1. Council synthesis

The council evaluated economic correctness, compatibility, simplicity, data model, API, security, performance and reversibility.

- Economic classification must precede aggregation; SQL filtering is an optimization, not the sole business policy.
- Existing `MoneyMetric` remains unchanged. Portfolio aggregation uses a separate `AggregateMoneyMetric`, preventing breaking changes and invalid partial states in existing calculators.
- Pair exposure remains operation-scoped in V1. It is not decomposed into holdings and is not combined across pair operations.
- Three read endpoints are selected: summary, current positions and historical results. This keeps summary small and lets both collections evolve and paginate independently.
- Aggregation remains on-read in the modular monolith. No projection, CQRS infrastructure, cache or service split is justified by the beta workload.
- Base currency, staleness thresholds and competing valuation-source priority remain pending because they do not block currency buckets or missing-valuation behavior.

## 2. Verified current-position drift

The legacy endpoint is `GET /v1/operations/position/:accountId/:instrumentId`.

- **Route:** `apps/api/src/routes/operations.ts` calls `getPosition(accountId, instrumentId)` and returns its inferred object directly.
- **Service:** `apps/api/src/services/operation-service.ts` is a transaction wrapper around `findPosition`; it performs no economic classification.
- **Repository/query:** `apps/api/src/repositories/operation-repository.ts` groups by account/instrument and sums signed quantity and cost. Its filter is `status = 'OPEN'` and `template_type IN ('EQUITY_HOLDING','EQUITY_PAIR','CRYPTO_SPOT')`.
- **Response DTO:** inferred inline shape contains account, instrument, quantity, cost basis, market value and unrealized P&L. It has no `strategyId`, `positionKind`, source operations or pair semantics.
- **Tests:** equity and crypto spot exercise the endpoint; derivative isolation verifies closed derivatives do not alter spot; LP verifies no component position. No test prevents pair legs from appearing as holdings or separates the same account/instrument across Strategies.

Semantic loss occurs in the repository predicate and grouping key: `EQUITY_PAIR` legs are treated as signed holdings, Strategy is discarded, and the route/DTO cannot communicate the distinction. The legacy endpoint may remain temporarily for compatibility, but the Portfolio module must not reuse this aggregation.

## 3. Boundary and flow

Portfolio remains a module inside the modular monolith:

```text
Operation read model
  -> PositionClassificationPolicy
  -> specialized aggregator
     -> HoldingAggregator
     -> PairExposureAggregator
     -> DefiLpAggregator
  -> PositionQueryService

Closed operation read model
  -> HistoricalResultsQueryService

Position/result + ValuationReadPort
  -> ValuationAggregator
  -> PortfolioQueryService
  -> currency buckets / summary
```

These names describe responsibilities; implementation may use cohesive functions/modules instead of classes.

Repositories return operation/template/status/leg data needed for classification. Domain/application policy owns economic meaning. SQL may prefilter candidate templates and statuses only if tests prove equivalence to the explicit policy.

## 4. Position classification policy

Candidate signature:

```ts
type CurrentPositionClassification =
  | "EQUITY_HOLDING"
  | "SPOT_HOLDING"
  | "PAIR_EXPOSURE"
  | "DEFI_LP"
  | "NONE_CURRENT_POSITION";

function classifyCurrentPosition(input: {
  templateType: string;
  templateVersion: number;
  status: string;
}): CurrentPositionClassification;
```

Policy table:

| Template/status | Classification |
|---|---|
| `EQUITY_HOLDING@1 / OPEN` | `EQUITY_HOLDING` |
| `CRYPTO_SPOT@1 / OPEN` | `SPOT_HOLDING` |
| `EQUITY_PAIR@1 / OPEN` | `PAIR_EXPOSURE` |
| `DEFI_LP@1 / OPEN` | `DEFI_LP` |
| `FUTURES_ROUND_TRIP@1 / CLOSED` | `NONE_CURRENT_POSITION` |
| `CRYPTO_DERIVATIVE@1 / CLOSED` | `NONE_CURRENT_POSITION` |
| Unknown template/version/status | `NONE_CURRENT_POSITION` plus safe diagnostic counter |

No `OperationLeg` becomes a Position merely by existing.

## 5. Position identity and specialized aggregation

### 5.1 HoldingAggregator

Accepts classified `EQUITY_HOLDING` and `SPOT_HOLDING` only.

```ts
type PositionKey = {
  strategyId: string;
  accountId: string;
  positionKind: "EQUITY_HOLDING" | "SPOT_HOLDING";
  instrumentId: string;
};
```

Quantity and basis aggregate only within this complete key and one currency. `EQUITY_PAIR`, `DEFI_LP`, futures and derivatives are rejected by type/policy. Same instrument/account under different Strategies produces separate positions.

### 5.2 PairExposureAggregator

Each open pair operation produces one `PAIR_EXPOSURE`; simplest implementable identity is `sourceOperationId`. It preserves Strategy, account and both ordered economic legs with BUY/SELL side. It exposes long, short, gross and net exposure metrics and never imposes holding quantity/average-cost semantics.

Cross-operation pair netting is not approved for V1 because pair intent and lifecycle boundaries would be lost.

### 5.3 DefiLpAggregator

Each open `DEFI_LP` operation produces one position keyed by operation ID. It combines the entry operation with the deterministically selected latest snapshot and preserves:

- component instrument references as structural identity;
- invested amount;
- current position value;
- unclaimed fees;
- economic value, total P&L and total return;
- snapshot ID and `observedAt`.

LP component legs never enter HoldingAggregator. No snapshot is converted into an Operation.

## 6. Historical results

Historical results are a separate query model for closed `FUTURES_ROUND_TRIP@1` and `CRYPTO_DERIVATIVE@1`. Gross P&L may be available while net P&L remains `INCOMPLETE/MISSING_TRADING_COSTS`. A closed result never contributes to current position or exposure.

## 7. Portfolio DTO contracts

Candidate TypeScript-level contracts:

```ts
type MetricStatus =
  | "AVAILABLE"
  | "INCOMPLETE"
  | "STALE"
  | "UNRECONCILED"
  | "NOT_APPLICABLE";

type Coverage = {
  totalComponents: number;
  availableComponents: number;
  missingComponents: number;
};

type AggregateMoneyMetric =
  | {
      status: "AVAILABLE";
      value: string;
      currency: string;
      coverage: Coverage;
    }
  | {
      status: "INCOMPLETE" | "STALE" | "UNRECONCILED";
      knownValue: string;
      currency: string;
      reason: string;
      coverage: Coverage;
    }
  | {
      status: "NOT_APPLICABLE";
      value: null;
      reason: string;
      coverage: Coverage;
    };

type ProvenanceRef = {
  operationIds: string[];
  valuationIds: string[];
  snapshotIds: string[];
};

type HoldingPosition = {
  kind: "EQUITY_HOLDING" | "SPOT_HOLDING";
  strategyId: string;
  accountId: string;
  instrumentId: string;
  quantity: string;
  currency: string;
  costBasis: MoneyMetric;
  marketValue: MoneyMetric;
  unrealizedPnl: MoneyMetric;
  provenance: ProvenanceRef;
};

type PairExposure = {
  kind: "PAIR_EXPOSURE";
  strategyId: string;
  accountId: string;
  sourceOperationId: string;
  legs: Array<{
    instrumentId: string;
    side: "BUY" | "SELL";
    quantity: string;
    entryPrice: string;
    currency: string;
  }>;
  grossExposure: MoneyMetric;
  netExposure: MoneyMetric;
  provenance: ProvenanceRef;
};

type DefiLpPosition = {
  kind: "DEFI_LP";
  strategyId: string;
  accountId: string;
  sourceOperationId: string;
  componentInstrumentIds: string[];
  currency: string;
  investedAmount: MoneyMetric;
  currentPositionValue: MoneyMetric;
  unclaimedFees: MoneyMetric;
  economicValue: MoneyMetric;
  totalPnl: MoneyMetric;
  totalReturn: { status: MetricStatus; value: string | null; reason?: string };
  snapshotAsOf: string | null;
  provenance: ProvenanceRef;
};

type HistoricalResult = {
  operationId: string;
  strategyId: string;
  accountId: string;
  instrumentId: string;
  template: { type: "FUTURES_ROUND_TRIP" | "CRYPTO_DERIVATIVE"; version: 1 };
  closedAt: string;
  currency: string;
  grossPnl: MoneyMetric;
  netPnl: MoneyMetric;
  provenance: ProvenanceRef;
};

type PortfolioSummary = {
  asOf: string;
  currentPositionsCount: number;
  incompleteMetricsCount: number;
  currencyBuckets: Array<{
    currency: string;
    knownCostBasis: AggregateMoneyMetric;
    knownMarketValue: AggregateMoneyMetric;
    historicalGrossPnl: AggregateMoneyMetric;
    historicalNetPnl: AggregateMoneyMetric;
  }>;
  globalBaseCurrencyTotal:
    | { status: "AVAILABLE"; value: string; currency: string }
    | { status: "INCOMPLETE"; value: null; reason: "MISSING_FX_RATE" | "BASE_CURRENCY_NOT_CONFIGURED" };
};
```

`MoneyMetric` remains the existing component metric. `AggregateMoneyMetric` is composition-specific, backward compatible and encodes known subtotal plus coverage without weakening calculators.

## 8. Aggregate invariants

- `AVAILABLE` means every required component is available and coverage is complete.
- `INCOMPLETE` means at least one required component is absent.
- `knownValue` sums available components only.
- Missing components are never coerced to zero.
- A known zero participates normally and counts as available.
- Currency mismatch prevents aggregation and produces separate buckets or a safe domain error; it never silently converts.
- `totalComponents = availableComponents + missingComponents`.
- `AVAILABLE` requires `missingComponents = 0`.
- Provenance references cover every component included in `value` or `knownValue`.

### 8.1 Partial metric decision

Option A, changing `MoneyMetric`, would spread aggregate-only concepts into all existing calculators and risk breaking response contracts. Option B, `AggregateMoneyMetric`, preserves compatibility, gives clearer semantics, has localized migration cost and makes invalid partial states harder to construct. **Option B is approved.**

## 9. Currency buckets and FX extension

Portfolio groups monetary metrics by normalized currency. BRL and USD remain separate. With multiple currencies and no explicit FX, global total is `INCOMPLETE/MISSING_FX_RATE`. No current exchange rate is implied.

Base currency remains pending. A future `FxRateReadPort` may operate after positions and per-currency aggregation, so Position contracts do not require rewriting.

## 10. Valuation boundary

```ts
type ValuationObservation = {
  id: string;
  subject: { kind: "INSTRUMENT" | "POSITION"; id: string };
  source: string;
  asOf: string;
  recordedAt: string;
  value: string;
  currency: string;
};

interface ValuationReadPort {
  findApplicable(input: {
    subject: ValuationObservation["subject"];
    asOf: string;
  }): Promise<ValuationObservation | null>;
}
```

Equity and crypto spot may consume instrument valuations. DeFi consumes its latest applicable LP snapshot through an adapter implementing equivalent read semantics. Absence returns `INCOMPLETE/MISSING_CURRENT_VALUATION`; cost basis is never fallback.

Multiple-source priority (`DEC-P-006`) remains pending: latest does not imply highest quality. Until a policy is approved, a query must use an explicitly selected source or return `UNRECONCILED` when competing observations cannot be deterministically resolved.

A `StalenessPolicy` extension receives source, asset class and `asOf`. It may produce `AVAILABLE` or `STALE` only after versioned thresholds are approved; no default TTL exists.

## 11. API decision

Alternatives considered:

- **A — one endpoint with summary, positions and results:** simple first call, but couples payload growth, pagination and independently evolving models.
- **B — summary plus two collections:** three clear read endpoints, independent filters/pagination, smaller payloads and direct test boundaries.
- **C — summary plus positions, embedding historical results:** fewer endpoints but asymmetric and still couples historical pagination to summary.

**Option B is approved:**

- `GET /v1/portfolio` — compact summary and currency buckets.
- `GET /v1/portfolio/positions` — discriminated current-position collection.
- `GET /v1/portfolio/historical-results` — closed-result collection.

Collection endpoints accept optional `strategyId`, `accountId`, `currency`, cursor and bounded limit; positions additionally accept `kind`. Responses are read-only. The legacy operation-position route is not the Portfolio API and should be deprecated only through a separately approved compatibility plan.

## 12. Provenance

Public provenance exposes only stable source IDs: operation IDs and applicable valuation/snapshot IDs. It does not expose SQL details, internal table names or a full audit graph. Authorization for provenance is identical to its parent Portfolio resource.

## 13. Architecture acceptance tests

- **TEST-POS-001:** open EMBR3 `EQUITY_HOLDING` becomes a holding.
- **TEST-POS-002:** open BTC `CRYPTO_SPOT` becomes a spot holding.
- **TEST-POS-003:** `EQUITY_PAIR` never appears in holdings.
- **TEST-POS-004:** `EQUITY_PAIR` appears once as `PAIR_EXPOSURE` with BUY and SELL legs.
- **TEST-POS-005:** closed BTC derivative does not alter BTC spot quantity.
- **TEST-POS-006:** WBTC/SOL LP creates no WBTC/SOL holdings.
- **TEST-POS-007:** same account/instrument under different Strategies yields distinct positions.
- **TEST-POS-008:** closed futures create no current position.
- **TEST-POS-009:** three available plus two missing valuations yields the three-component `knownValue`, `INCOMPLETE`, coverage 3/5 and no zero coercion.
- **TEST-POS-010:** BRL and USD without FX yield separate buckets and global `INCOMPLETE/MISSING_FX_RATE`.
- **TEST-POS-011:** LP snapshot economic value includes fees exactly once.
- **TEST-POS-012:** available closed gross P&L plus incomplete net P&L never relabels gross as net.

## 14. Performance and review triggers

Aggregation remains on-read. Reconsider a disposable projection only when measured p95 consistently exceeds the approved SLO, scanned rows/query cost grows materially, workload leaves beta scale, or point-in-time history requires it. Event sourcing, CQRS infrastructure, Redis, materialized Portfolio and microservices are not approved.

## 15. Observability

Safe candidate attributes:

- `portfolio.query.type`
- `portfolio.positions.count`
- `portfolio.currency_buckets.count`
- `portfolio.incomplete_metrics.count`
- `portfolio.query.duration_ms`

Do not log complete financial payloads, decimal values, secrets or unrestricted provenance arrays.

## 16. Security

Portfolio remains read-only with least-privilege reads. Explicitly denied capabilities are `CREATE_ORDER`, `CANCEL_ORDER`, `WITHDRAW`, `TRANSFER`, `MOVE_FUNDS`, `SIGN` and remote `SET_LEVERAGE`. No external financial SDK belongs in the Portfolio module.

## 17. Gate mapping

- `PORT-ARCH-001`: classify-before-aggregate formalized.
- `PORT-ARCH-002`: PositionKey approved.
- `PORT-ARCH-003`: holding, pair and LP aggregators separated.
- `PORT-ARCH-004`: current and historical query models separated.
- `PORT-ARCH-005`: `AggregateMoneyMetric` and invariants approved.
- `PORT-ARCH-006`: currency buckets and no implicit FX defined.
- `PORT-ARCH-007`: valuation read boundary and policy extensions defined.
- `PORT-ARCH-008`: provenance DTO defined.
- `PORT-ARCH-009`: three-endpoint API contract selected.
- `PORT-ARCH-010`: TEST-POS-001..012 defined.
- `PORT-ARCH-011`: on-read model and review triggers defined.
- `PORT-ARCH-012`: read-only security and denied capabilities explicit.

All architecture criteria are specified. `GATE-PORTFOLIO-ARCH = PASS` approves architecture only; implementation and delivery remain not started.

## 18. Decision status

Resolved:

- `DEC-P-003`: use separate `AggregateMoneyMetric` with `knownValue` and `Coverage`.
- `DEC-P-004`: use summary, positions and historical-results endpoints.
- `DEC-P-005`: pair exposure remains operation-scoped in V1.

Pending:

- `DEC-P-001`: portfolio base currency; BRL remains candidate.
- `DEC-P-002`: versioned staleness thresholds by source/asset class.
- `DEC-P-006`: competing valuation-source priority and reconciliation.
