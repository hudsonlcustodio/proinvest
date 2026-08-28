import { Decimal } from "decimal.js";
import type { MoneyMetric } from "./metric-result.js";

export interface CryptoSpotInput { quantity: string; unitPrice: string; currency: string }
export interface CryptoSpotMetrics { grossAmount: MoneyMetric; marketValue: MoneyMetric; unrealizedPnl: MoneyMetric }

function decimal(value: string, field: string): Decimal {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${field}: REQUIRED_DECIMAL_STRING`);
  const result = new Decimal(value);
  if (!result.isFinite()) throw new Error(`${field}: INVALID_DECIMAL`);
  return result;
}

export function calculateCryptoSpot(input: CryptoSpotInput): CryptoSpotMetrics {
  if (!input.currency?.trim()) throw new Error("currency: REQUIRED");
  const quantity = decimal(input.quantity, "quantity");
  const unitPrice = decimal(input.unitPrice, "unitPrice");
  if (quantity.lte(0)) throw new Error("quantity: MUST_BE_POSITIVE");
  if (unitPrice.lt(0)) throw new Error("unitPrice: MUST_BE_NON_NEGATIVE");
  const currency = input.currency.toUpperCase();
  return {
    grossAmount: { status: "AVAILABLE", value: quantity.mul(unitPrice).toString(), currency },
    marketValue: { status: "INCOMPLETE", value: null, reason: "MISSING_CURRENT_VALUATION" },
    unrealizedPnl: { status: "INCOMPLETE", value: null, reason: "MISSING_CURRENT_VALUATION" }
  };
}
