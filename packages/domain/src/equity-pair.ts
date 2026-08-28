import { Decimal } from "decimal.js";
import type { MoneyMetric } from "./metric-result.js";

export interface EquityPairLeg { side: "BUY" | "SELL"; quantity: string; entryPrice: string; currency: string }
export interface EquityPairMetrics { longExposure: MoneyMetric; shortExposure: MoneyMetric; grossExposure: MoneyMetric; netExposure: MoneyMetric; unrealizedPnl: MoneyMetric }

function decimal(value: string, field: string): Decimal {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${field}: REQUIRED_DECIMAL_STRING`);
  const result = new Decimal(value);
  if (!result.isFinite()) throw new Error(`${field}: INVALID_DECIMAL`);
  return result;
}

export function calculateEquityPair(legs: EquityPairLeg[]): EquityPairMetrics {
  if (!Array.isArray(legs) || legs.length !== 2) throw new Error("INVALID_LEG_COUNT");
  const buy = legs.filter((leg) => leg.side === "BUY");
  const sell = legs.filter((leg) => leg.side === "SELL");
  if (buy.length !== 1) throw new Error("MISSING_BUY_LEG");
  if (sell.length !== 1) throw new Error("MISSING_SELL_LEG");
  const buyLeg = buy[0]!; const sellLeg = sell[0]!;
  if (buyLeg.currency.trim().toUpperCase() !== sellLeg.currency.trim().toUpperCase()) throw new Error("CURRENCY_MISMATCH");
  const longExposure = decimal(buyLeg.quantity, "quantity").mul(decimal(buyLeg.entryPrice, "entryPrice"));
  const shortExposure = decimal(sellLeg.quantity, "quantity").mul(decimal(sellLeg.entryPrice, "entryPrice"));
  const currency = buyLeg.currency.toUpperCase();
  return {
    longExposure: {status:"AVAILABLE", value:longExposure.toFixed(2), currency},
    shortExposure: {status:"AVAILABLE", value:shortExposure.toFixed(2), currency},
    grossExposure: {status:"AVAILABLE", value:longExposure.plus(shortExposure).toFixed(2), currency},
    netExposure: {status:"AVAILABLE", value:longExposure.minus(shortExposure).toFixed(2), currency},
    unrealizedPnl: {status:"INCOMPLETE", value:null, reason:"MISSING_CURRENT_VALUATION"}
  };
}
