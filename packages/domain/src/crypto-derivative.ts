import { Decimal } from "decimal.js";
import type { MoneyMetric } from "./metric-result.js";

const PreciseDecimal = Decimal.clone({ precision: 80 });

export type CryptoDerivativeSide = "BUY" | "SELL";
export interface CryptoDerivativeInput {
  investedCapital: string;
  leverage: string;
  entryPrice: string;
  exitPrice: string;
  side: CryptoDerivativeSide;
  currency: string;
}
export interface CryptoDerivativeMetrics {
  effectiveNotional: MoneyMetric;
  priceMove: string;
  underlyingReturn: string;
  leveragedReturn: string;
  grossPnl: MoneyMetric;
  netPnl: MoneyMetric;
}

function decimal(value: string, field: string): Decimal.Instance {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${field}: REQUIRED_DECIMAL_STRING`);
  const result = new PreciseDecimal(value);
  if (!result.isFinite()) throw new Error(`${field}: INVALID_DECIMAL`);
  return result;
}

export function calculateCryptoDerivative(input: CryptoDerivativeInput): CryptoDerivativeMetrics {
  if (!input.currency?.trim()) throw new Error("currency: REQUIRED");
  if (input.side !== "BUY" && input.side !== "SELL") throw new Error("side: INVALID");
  const investedCapital = decimal(input.investedCapital, "investedCapital");
  const leverage = decimal(input.leverage, "leverage");
  const entryPrice = decimal(input.entryPrice, "entryPrice");
  const exitPrice = decimal(input.exitPrice, "exitPrice");
  if (investedCapital.lte(0)) throw new Error("investedCapital: MUST_BE_POSITIVE");
  if (leverage.lte(0)) throw new Error("leverage: MUST_BE_POSITIVE");
  if (entryPrice.lte(0)) throw new Error("entryPrice: MUST_BE_POSITIVE");
  if (exitPrice.lt(0)) throw new Error("exitPrice: MUST_BE_NON_NEGATIVE");
  const priceMove = input.side === "SELL" ? entryPrice.minus(exitPrice) : exitPrice.minus(entryPrice);
  const underlyingReturn = priceMove.div(entryPrice);
  const leveragedReturn = underlyingReturn.mul(leverage);
  const currency = input.currency.toUpperCase();
  return {
    effectiveNotional: { status: "AVAILABLE", value: investedCapital.mul(leverage).toString(), currency },
    priceMove: priceMove.toString(),
    underlyingReturn: underlyingReturn.toString(),
    leveragedReturn: leveragedReturn.toString(),
    grossPnl: { status: "AVAILABLE", value: investedCapital.mul(leveragedReturn).toString(), currency },
    netPnl: { status: "INCOMPLETE", value: null, reason: "MISSING_TRADING_COSTS" }
  };
}
