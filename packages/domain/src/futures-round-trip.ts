import { Decimal } from "decimal.js";
import type { MoneyMetric } from "./metric-result.js";

export interface FuturesInstrumentMetadata { contractSize: string; quotationBasis: string; settlementCurrency: string }
export interface FuturesRoundTripInput { instrument: FuturesInstrumentMetadata; openingSide: "BUY"|"SELL"; contracts: string; entryPrice: string; exitPrice: string; currency: string }
export interface FuturesRoundTripMetrics { quotationFactor: string; priceMove: string; grossPnl: MoneyMetric; netPnl: MoneyMetric; status: "CLOSED" }

function d(value: string|undefined, field: string): Decimal { if (typeof value !== "string" || value.trim() === "") throw new Error(`MISSING_${field}`); const result = new Decimal(value); if (!result.isFinite()) throw new Error(`INVALID_${field}`); return result; }
export function calculateFuturesRoundTrip(input: FuturesRoundTripInput): FuturesRoundTripMetrics {
  if (input.openingSide !== "BUY" && input.openingSide !== "SELL") throw new Error("INVALID_OPENING_SIDE");
  if (!input.currency?.trim()) throw new Error("CURRENCY_REQUIRED");
  if (input.currency.toUpperCase() !== input.instrument.settlementCurrency.toUpperCase()) throw new Error("CURRENCY_MISMATCH");
  const contracts=d(input.contracts,"CONTRACTS"), entry=d(input.entryPrice,"ENTRY_PRICE"), exit=d(input.exitPrice,"EXIT_PRICE");
  const size=d(input.instrument.contractSize,"CONTRACT_SIZE"), basis=d(input.instrument.quotationBasis,"QUOTATION_BASIS");
  if (contracts.lte(0)) throw new Error("INVALID_CONTRACTS"); if (entry.lt(0)) throw new Error("INVALID_ENTRY_PRICE"); if (exit.lt(0)) throw new Error("INVALID_EXIT_PRICE"); if (size.lte(0)) throw new Error("INVALID_CONTRACT_SIZE"); if (basis.lte(0)) throw new Error("INVALID_QUOTATION_BASIS");
  const move=input.openingSide === "BUY" ? exit.minus(entry) : entry.minus(exit); const factor=size.div(basis); const gross=move.mul(contracts).mul(factor);
  return { quotationFactor:factor.toFixed(), priceMove:move.toFixed(), grossPnl:{status:"AVAILABLE",value:gross.toFixed(2),currency:input.currency.toUpperCase()}, netPnl:{status:"INCOMPLETE",value:null,reason:"MISSING_TRADING_COSTS"}, status:"CLOSED" };
}
