import type { MoneyMetric } from "../../domain/src/metric-result.js";
export type { MoneyMetric } from "../../domain/src/metric-result.js";

export type PositionKind = "EQUITY_HOLDING" | "SPOT_HOLDING" | "PAIR_EXPOSURE" | "DEFI_LP";
export interface Coverage { totalComponents:number; availableComponents:number; missingComponents:number }
export type AggregateMoneyMetric =
 | {status:"AVAILABLE";value:string;currency:string;coverage:Coverage}
 | {status:"INCOMPLETE"|"STALE"|"UNRECONCILED";knownValue:string;currency:string;reason:string;coverage:Coverage}
 | {status:"NOT_APPLICABLE";value:null;reason:string;coverage:Coverage};
export interface ProvenanceRef { operationIds:string[]; valuationIds:string[]; snapshotIds:string[] }
export interface HoldingPosition {
 kind:"EQUITY_HOLDING"|"SPOT_HOLDING"; strategyId:string; accountId:string; instrumentId:string; symbol:string;
 quantity:string; currency:string; costBasis:MoneyMetric; marketValue:MoneyMetric; unrealizedPnl:MoneyMetric; provenance:ProvenanceRef;
}
export interface PairExposure {
 kind:"PAIR_EXPOSURE"; strategyId:string; accountId:string; sourceOperationId:string;
 legs:Array<{instrumentId:string;symbol:string;side:"BUY"|"SELL";quantity:string;entryPrice:string;currency:string}>;
 grossExposure:MoneyMetric; netExposure:MoneyMetric; provenance:ProvenanceRef;
}
export interface DefiLpPosition {
 kind:"DEFI_LP"; strategyId:string; accountId:string; sourceOperationId:string; pairIdentity:string;
 components:Array<{instrumentId:string;symbol:string}>; currency:string; investedAmount:MoneyMetric;
 currentPositionValue:MoneyMetric; unclaimedFees:MoneyMetric; economicValue:MoneyMetric; totalPnl:MoneyMetric;
 totalReturn:{status:"AVAILABLE";value:string}|{status:"INCOMPLETE";value:null;reason:string}; snapshotAsOf:string|null; provenance:ProvenanceRef;
}
export type CurrentPosition = HoldingPosition|PairExposure|DefiLpPosition;
export interface HistoricalResult {
 operationId:string; strategyId:string; accountId:string; instrumentId:string; symbol:string;
 template:{type:"FUTURES_ROUND_TRIP"|"CRYPTO_DERIVATIVE";version:1}; closedAt:string; currency:string;
 grossPnl:MoneyMetric; netPnl:MoneyMetric; provenance:ProvenanceRef;
}
export interface PortfolioSummary {
 asOf:string; currentPositionsCount:number; incompleteMetricsCount:number;
 currencyBuckets:Array<{currency:string;knownCostBasis:AggregateMoneyMetric;knownMarketValue:AggregateMoneyMetric;historicalGrossPnl:AggregateMoneyMetric;historicalNetPnl:AggregateMoneyMetric}>;
 globalTotal:{status:"AVAILABLE";value:string;currency:string}|{status:"INCOMPLETE";value:null;reason:"MISSING_FX_RATE"|"BASE_CURRENCY_NOT_CONFIGURED"};
}
export interface ValuationObservation { id:string;subject:{kind:"INSTRUMENT"|"POSITION";id:string};source:string;asOf:string;recordedAt:string;value:string;currency:string }
export interface ValuationReadPort { findApplicable(input:{subject:ValuationObservation["subject"];asOf:string}):Promise<ValuationObservation|null> }
