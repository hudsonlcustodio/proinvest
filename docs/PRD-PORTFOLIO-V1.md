# PRD V1.0 — Portfolio & Analytics

Status: APPROVED SPECIFICATION
Gate: GZ-C — evolução estrutural
Baseline: V0.9, `main` at `6770a118fc8989fdb02374489acfa00b45a9b399`
Scope: product, domain, data and API contract proposal; no production implementation

## 1. Product problem

ProInvest records and calculates isolated, versioned strategy operations. V1.0 must answer: **what is currently open, what known wealth and exposure exists, and what historical result is known, by Strategy and currency?** It must answer only to the extent supported by source data.

Portfolio V1 is a read-only derived view. It never invents valuation, costs, FX, quantities, reconciliation or completeness.

## 2. Objectives

- **OBJ-PORT-001:** consolidate current open positions without creating another source of truth.
- **OBJ-PORT-002:** separate current exposure from closed historical results.
- **OBJ-PORT-003:** group current and historical metrics by Strategy.
- **OBJ-PORT-004:** group positions by asset class.
- **OBJ-PORT-005:** expose valuation in currency buckets without implicit cross-currency sums.
- **OBJ-PORT-006:** expose incomplete, stale, unreconciled and not-applicable data explicitly.
- **OBJ-PORT-007:** preserve provenance from aggregate metrics to operations, legs, valuations and snapshots.
- **OBJ-PORT-008:** support a future dashboard while keeping backend derivation as the authority.

## 3. Non-goals

V1 excludes order execution, automatic rebalancing, recommendations, forecasts, tax calculation, external automatic FX, real-time market data, exchange/broker/wallet synchronization, DeFi APR/APY, impermanent loss, automatic benchmarks, a materialized portfolio ledger, multi-region deployment and microservices.

It also excludes order, trade, withdraw, transfer, signing and wallet-execution capabilities.

## 4. Actor and journeys

Primary actor: **Pablo, portfolio owner**.

- **J1:** open Portfolio and see current positions.
- **J2:** see closed historical results separately.
- **J3:** filter both views by Strategy.
- **J4:** identify positions without current valuation.
- **J5:** see totals separated by currency.
- **J6:** understand why a global total is unavailable.
- **J7:** inspect metric provenance.
- **J8:** navigate from a position to its composing Operations.

## 5. Aggregation model

`Operation != Position != Portfolio`.

- **Operation** is the immutable economic record and remains source of truth with its legs.
- **Position** is an on-read derived view over applicable open operations and latest applicable observations.
- **Portfolio** is an on-read derived view over current positions, valuations/snapshots and closed historical results.

No portfolio table or materialized ledger is approved for V1. A future cache/projection must be disposable, rebuildable and never authoritative.

### 5.1 Current versus historical

**Current Portfolio** answers “what is open now?” It contains open holdings/exposures and their current valuation state.

**Historical Results** answers “what has closed and what result is known?” It contains closed operations and keeps gross and net results distinct.

They are separate query domains. A combined number is forbidden unless its meaning, currency and completeness are explicit.

## 6. Template contribution contract

| Template | Lifecycle in approved fixture | Current position | Historical result | Portfolio semantics |
|---|---|---|---|---|
| `EQUITY_HOLDING@1` | OPEN | Yes | No | `EQUITY_HOLDING`; known quantity/cost basis; market value requires valuation. |
| `EQUITY_PAIR@1` | OPEN | Yes, as two-sided exposure | No while open | `PAIR_EXPOSURE`; preserve BUY/SELL side; never merge into ordinary spot holding. |
| `FUTURES_ROUND_TRIP@1` | CLOSED | No | Yes | Historical gross P&L; net P&L incomplete without costs. |
| `CRYPTO_SPOT@1` | OPEN | Yes | No | `SPOT_HOLDING`; known quantity/cost basis; valuation separate. |
| `CRYPTO_DERIVATIVE@1` | CLOSED | No | Yes | Historical gross P&L; no contribution to BTC spot quantity; net incomplete without costs. |
| `DEFI_LP@1` | OPEN | Yes | No | `DEFI_LP`; latest snapshot provides current observation; never creates component spot holdings. |

Only four V1 current `positionKind` values are approved: `EQUITY_HOLDING`, `SPOT_HOLDING`, `PAIR_EXPOSURE`, and `DEFI_LP`. Closed futures and derivative fixtures belong only to historical results, so no current kind is introduced for them.

## 7. Position identity

The conceptual identity is:

`strategyId + accountId + positionKind + economic component identity`

The economic component is:

- `instrumentId` for `EQUITY_HOLDING` and `SPOT_HOLDING`;
- operation/pair identity plus each leg's `instrumentId` and `side` for `PAIR_EXPOSURE`;
- LP operation identity plus its ordered/set component instrument references for `DEFI_LP`.

Currency is a mandatory aggregation dimension and consistency constraint, not a substitute for instrument identity. It may be included in an implementation key to prevent incompatible aggregation. Ticker alone is never identity. Strategy Provider and Account/Custody remain separate dimensions.

Trade-off: holding positions may combine compatible open operations sharing the identity; pair and LP positions retain operation identity because collapsing independent structures would destroy side, pair and snapshot semantics.

## 8. Currency policy

- Never sum BRL and USD without an explicit, provenance-bearing FX rate.
- Every monetary aggregate is returned in `totalsByCurrency` buckets.
- No hard-coded FX and no external FX lookup are approved for V1.
- `portfolioBaseCurrency` is required for a future global total but is not yet approved. Candidate: BRL.
- Without all required FX rates, `globalBaseCurrencyTotal.status = INCOMPLETE`, `value = null`, `reason = MISSING_FX_RATE`.
- Known per-currency totals remain available when the global total is incomplete.

## 9. Metric and valuation semantics

`MetricResult` uses the existing statuses `AVAILABLE`, `INCOMPLETE`, `STALE`, `UNRECONCILED`, and `NOT_APPLICABLE`. Every non-available metric carries a stable `reason`. Zero is an available value; it must never be treated as missing.

- **costBasis:** acquisition/invested basis derived from operations; never a market-value fallback.
- **marketValue:** current observable value excluding separately classified economic components.
- **economicValue:** current value plus explicitly defined components, such as known unclaimed LP fees.
- **grossPnl:** result before costs.
- **netPnl:** result after all applicable costs; incomplete when costs are missing.
- **unrealizedPnl:** current market/economic value minus the applicable basis; unavailable without current valuation.

An applicable valuation/observation carries `source`, `asOf`, `currency`, `value`, and instrument or position reference. If absent, `marketValue.status = INCOMPLETE` with `MISSING_CURRENT_VALUATION`.

### 9.1 Staleness

Staleness thresholds depend on asset class and source and must be configurable and versioned. No universal TTL is approved. Until a policy exists, age alone must not produce `STALE`; the metric remains classified by available evidence.

### 9.2 Partial completeness

Aggregates preserve known values without presenting them as complete totals. Candidate contract approved for implementation review:

```json
{
  "status": "INCOMPLETE",
  "knownValue": "1000.25",
  "currency": "BRL",
  "reason": "MISSING_CURRENT_VALUATION",
  "coverage": {
    "totalComponents": 5,
    "availableComponents": 3,
    "missingComponents": 2
  }
}
```

`knownValue` is a subtotal, never the asserted total. Coverage counts are mandatory for aggregate metrics. Component results retain their individual reasons; a future contract may add `reasonCounts` without changing this rule.

## 10. DeFi LP treatment

- The latest append-only snapshot is the current observation; snapshots are not Operations.
- `currentPositionValue` and `unclaimedFees` remain separate.
- When both are known in the same currency, `economicValue = currentPositionValue + unclaimedFees`.
- If fees are unknown, economic value and dependent P&L are incomplete; known current position value is still exposed.
- Fees are counted exactly once and are not claimed cash flow.
- LP components WBTC/SOL identify the pool exposure but do not create spot quantities.

## 11. Closed P&L

For `FUTURES_ROUND_TRIP@1` and `CRYPTO_DERIVATIVE@1`, approved fixtures contribute to `historicalGrossPnlByCurrency`. `historicalNetPnlByCurrency` is `INCOMPLETE/MISSING_TRADING_COSTS` until costs are available. Gross must never be labeled or reused as net.

## 12. Analytics V1

Approved metrics:

- current positions count;
- current positions by Strategy and asset class;
- current exposure by currency;
- known market value and known cost basis by currency, with coverage;
- historical gross P&L by currency;
- historical net P&L status by currency;
- valuation coverage;
- incomplete metrics count.

For each `STR-001` through `STR-007`, expose current exposure, known valuation, historical gross P&L and incompleteness as applicable. No rankings, annualized performance or invented performance metric are approved.

## 13. Acceptance dataset

Golden values remain unchanged.

| ID | Fixture / template | State | Current? | Historical? | Currency | Valuation | P&L | Contribution |
|---|---|---|---|---|---|---|---|---|
| GOLDEN-001 | EMBR3 `150 × 38.23 = 5734.50`, `EQUITY_HOLDING@1` | OPEN | Yes | No | BRL | Missing | Unrealized incomplete | Equity quantity and cost basis. |
| GOLDEN-002 | OIBR3 `335 × 1.28 = 428.80`, `EQUITY_HOLDING@1` | OPEN | Yes | No | BRL | Missing | Unrealized incomplete | Equity quantity and cost basis. |
| GOLDEN-003 | PTBR4 long `3041.12`, SMIG3 short `2425.50`, `EQUITY_PAIR@1` | OPEN | Yes, pair exposure | No | BRL | Missing | Unrealized incomplete | Long `3041.12`, short `2425.50`, gross `5466.62`, net exposure `615.62`; not spot holdings. |
| GOLDEN-004 | WDOL26, `FUTURES_ROUND_TRIP@1` | CLOSED | No | Yes | BRL | N/A | Gross `600.00`; net incomplete | Historical gross P&L only. |
| GOLDEN-005 | BTC `0.00031 × 63000.38 = 19.5301178`, `CRYPTO_SPOT@1` | OPEN | Yes | No | USD | Missing | Unrealized incomplete | BTC spot quantity and exact cost basis. |
| GOLDEN-006 | BTC short derivative, `CRYPTO_DERIVATIVE@1` | CLOSED | No | Yes | USD | N/A | Gross `684.57324225846300775451308509`; net incomplete | Historical gross P&L; no BTC spot quantity. |
| GOLDEN-007 | WBTC/SOL LP, `DEFI_LP@1` | OPEN | Yes, LP | No | USD | Snapshot available | Total P&L `14.03` | Current `428.12`, fees `36.22`, economic value `464.34`; no WBTC/SOL spot holdings. |

### 13.1 Mandatory cross-currency acceptance

Given a BRL current value and a USD current/economic value with no FX, Portfolio returns separate BRL and USD buckets and no global numeric total. Global status is `INCOMPLETE/MISSING_FX_RATE`.

### 13.2 Mandatory isolation acceptance

- BTC spot plus a closed BTC derivative leaves BTC spot quantity unchanged.
- WBTC/SOL LP creates no WBTC or SOL spot holdings.
- Closed futures create no current exposure.
- Open pair legs remain pair exposure and are not ordinary holdings.

## 14. Provenance

Every aggregate metric must retain references sufficient to trace it to composing `positionId`, operation IDs, leg IDs, valuation/snapshot IDs and historical operation IDs as applicable. The V1 UI need not render a full audit graph, but the backend contract must not discard these references.

## 15. Consistency and workload

V1 calculates on read against PostgreSQL. Beta/single-user or low volume is assumed; large scale is not proven. Measure operation count, position count, valuation snapshot count, query latency, DB CPU, rows scanned and response size.

Materialization may be reconsidered only when measured p95 exceeds the SLO, operation/snapshot volume or rows scanned makes recomputation costly, or point-in-time history becomes a requirement. Any projection remains rebuildable.

## 16. Candidate API contract

Prefer two read-only resources:

- `GET /v1/portfolio` — summary, currency buckets, Strategy analytics and completeness.
- `GET /v1/portfolio/positions` — current positions with optional `strategyId`, `accountId`, `positionKind`, `currency`, cursor and bounded `limit`.
- `GET /v1/portfolio/historical-results` remains a pending decomposition decision; historical results may instead be an explicit section of the first endpoint for the beta dataset.

The proposal does not freeze URLs until DEC-P-004 is resolved.

Responses include `asOf`, `currencyBuckets`, `globalBaseCurrencyTotal`, metric status/reason, coverage and provenance references. Cursor pagination is required only for detail collections; summaries are not paginated. Invalid filters return 400, unauthorized access 401/403, unavailable dependency 503, and unexpected failures 500 with a safe correlation ID. Financial payloads are not echoed in errors.

## 17. UX contract

The future Portfolio journey contains summary, currency buckets, current positions, historical results, incomplete-data warnings and Strategy filter. It supports loading, empty, partial data, stale, failure, permission, no-valuation and no-FX states. It must label known subtotals and explain incomplete global totals. This PRD does not approve a dashboard design.

## 18. Security

Portfolio is read-only and receives least-privilege database access. It cannot order, withdraw, transfer, sign or execute wallet actions. Logs contain correlation IDs, timings, counts and safe filter metadata, not complete financial payloads or secrets. Provenance access follows the same authorization scope as its portfolio.

## 19. Measurable non-functional requirements

- **RNF-PORT-001:** portfolio read p95 below 500 ms on the versioned beta reference dataset in CI/performance evidence.
- **RNF-PORT-002:** portfolio reads perform no writes to source-of-truth records.
- **RNF-PORT-003:** all financial values remain decimal strings through API/domain and exact NUMERIC in PostgreSQL; no IEEE-754 canonical arithmetic.
- **RNF-PORT-004:** no cross-currency sum without explicit FX and provenance.
- **RNF-PORT-005:** every non-available metric carries a stable reason; zero and unknown remain distinct.
- **RNF-PORT-006:** queries emit safe latency/trace evidence without full financial payloads.
- **RNF-PORT-007:** no external financial write capability exists.
- **RNF-PORT-008:** identical source records and `asOf` selection produce deterministic output.

## 20. Test strategy for implementation

- **Unit:** aggregation, identity, side semantics, completeness, zero-vs-unknown and decimal precision.
- **Integration/PostgreSQL:** on-read aggregation, status filtering, currency isolation, latest LP snapshot and provenance references.
- **Contract:** `MetricResult`, partial aggregate/coverage, currency buckets, global no-FX result and safe errors.
- **E2E:** GOLDEN-001 through GOLDEN-007 across current and historical views.
- **Negative:** BRL + USD without FX never yields a global number.
- **Isolation:** spot vs derivative vs LP vs pair vs closed futures.
- **Precision:** crypto values preserve all approved decimal places.
- **Append-only:** LP snapshots remain immutable and latest selection is deterministic.
- **Regression:** all prior gates and tests remain green, including PostgreSQL tests with zero skipped.

## 21. Gate specification

- **PORT-SPEC-001 PASS:** current and historical domains are separate.
- **PORT-SPEC-002 PASS:** per-currency policy and no implicit FX are explicit.
- **PORT-SPEC-003 PASS:** cost basis, market/economic value and P&L semantics are distinct.
- **PORT-SPEC-004 PASS:** zero, unknown and all metric statuses are preserved.
- **PORT-SPEC-005 PASS:** spot, derivative, LP, pair and futures isolation is explicit.
- **PORT-SPEC-006 PASS:** LP economic value counts known fees once.
- **PORT-SPEC-007 PASS:** partial completeness preserves known subtotal and coverage.
- **PORT-SPEC-008 PASS:** aggregate provenance requirements are explicit.
- **PORT-SPEC-009 PASS:** GOLDEN-001 through GOLDEN-007 form the acceptance dataset.
- **PORT-SPEC-010 PASS:** a minimal candidate API contract is defined without implementation.
- **PORT-SPEC-011 PASS:** measurable RNFs are defined.
- **PORT-SPEC-012 PASS:** security constraints and non-goals are explicit.

Therefore `GATE-PORTFOLIO-SPEC = PASS` for specification only. This does not imply an implementation or delivery gate.

## 22. Pending decisions

- **DEC-P-001 — portfolio base currency:** candidate BRL; **PENDING** explicit approval.
- **DEC-P-002 — staleness policy:** thresholds by asset class/source and versioning mechanism; **PENDING**.
- **DEC-P-003 — partial completeness shape:** proposed `knownValue + coverage`; **PENDING** contract review before implementation.
- **DEC-P-004 — endpoint decomposition:** two versus three endpoints and historical pagination; **PENDING** API review.
- **DEC-P-005 — pair aggregation boundary:** whether compatible pair operations can aggregate beyond operation identity; **PENDING**, default is preserve operation identity.
- **DEC-P-006 — valuation source model:** canonical source priority and reconciliation rules; **PENDING**.

## 23. Verified documentation/code drift

- `PROJECT-STATE.md` previously reported Beta D14/V0.1 and Foundation evidence pending despite the V0.9 canonical baseline and green delivery run.
- `API-V0.1.md` is cumulative but incomplete: it does not fully document every implemented template and route.
- The current position endpoint is operation-oriented and keyed only by account/instrument; its SQL includes `EQUITY_PAIR` with holdings. Portfolio V1 requires Strategy and position-kind identity and pair exposure isolation.
- Existing `MoneyMetric` already includes all required statuses, but only the `AVAILABLE` variant carries currency; aggregate partial completeness needs the proposed richer contract.
- DeFi has append-only snapshots, while ordinary equity/crypto spot current valuations are not yet represented.
- `EVIDENCE-V0.3.md` remains a cumulative evidence file under a historical filename, as intentionally deferred.

These are specification inputs and implementation backlog, not production changes in this PR.
