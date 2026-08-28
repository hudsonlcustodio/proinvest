import { Decimal } from "decimal.js";
import type { MoneyMetric } from "./metric-result.js";

const PreciseDecimal = Decimal.clone({ precision: 80 });
type RatioMetric = { status: "AVAILABLE"; value: string } | { status: "INCOMPLETE"; value: null; reason: string };
export interface DefiLpInput {
  investedAmount: string;
  currentPositionValue: string;
  unclaimedFees?: string | undefined;
  currency: string;
  investedCurrency?: string;
  currentPositionValueCurrency?: string;
  unclaimedFeesCurrency?: string;
}
export interface DefiLpMetrics {
  positionValueDelta: MoneyMetric;
  economicValue: MoneyMetric;
  totalPnl: MoneyMetric;
  totalReturn: RatioMetric;
  apr: RatioMetric;
  apy: RatioMetric;
  impermanentLoss: RatioMetric;
}

function decimal(value: string, field: string): Decimal.Instance {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${field}: REQUIRED_DECIMAL_STRING`);
  const result = new PreciseDecimal(value);
  if (!result.isFinite()) throw new Error(`${field}: INVALID_DECIMAL`);
  return result;
}

export function calculateDefiLp(input: DefiLpInput): DefiLpMetrics {
  if (!input.currency?.trim()) throw new Error("currency: REQUIRED");
  const currency = input.currency.toUpperCase();
  for (const [field, value] of [["investedAmount", input.investedCurrency], ["currentPositionValue", input.currentPositionValueCurrency], ["unclaimedFees", input.unclaimedFeesCurrency]] as const) {
    if (value && value.toUpperCase() !== currency) throw new Error("CURRENCY_MISMATCH");
  }
  const invested = decimal(input.investedAmount, "investedAmount");
  const current = decimal(input.currentPositionValue, "currentPositionValue");
  if (invested.lte(0)) throw new Error("investedAmount: MUST_BE_POSITIVE");
  if (current.lt(0)) throw new Error("currentPositionValue: MUST_BE_NON_NEGATIVE");
  if (input.unclaimedFees === undefined || input.unclaimedFees === null || input.unclaimedFees.trim() === "") {
    return {
      positionValueDelta: { status: "AVAILABLE", value: current.minus(invested).toString(), currency },
      economicValue: { status: "INCOMPLETE", value: null, reason: "MISSING_UNCLAIMED_FEES" },
      totalPnl: { status: "INCOMPLETE", value: null, reason: "MISSING_UNCLAIMED_FEES" },
      totalReturn: { status: "INCOMPLETE", value: null, reason: "MISSING_UNCLAIMED_FEES" },
      apr: { status: "INCOMPLETE", value: null, reason: "MISSING_RECONCILED_PERIOD" },
      apy: { status: "INCOMPLETE", value: null, reason: "MISSING_RECONCILED_PERIOD" },
      impermanentLoss: { status: "INCOMPLETE", value: null, reason: "MISSING_COMPONENT_QUANTITIES" }
    };
  }
  const fees = decimal(input.unclaimedFees, "unclaimedFees");
  if (fees.lt(0)) throw new Error("unclaimedFees: MUST_BE_NON_NEGATIVE");
  const economicValue = current.plus(fees);
  const totalPnl = economicValue.minus(invested);
  return {
    positionValueDelta: { status: "AVAILABLE", value: current.minus(invested).toString(), currency },
    economicValue: { status: "AVAILABLE", value: economicValue.toString(), currency },
    totalPnl: { status: "AVAILABLE", value: totalPnl.toString(), currency },
    totalReturn: { status: "AVAILABLE", value: totalPnl.div(invested).toString() },
    apr: { status: "INCOMPLETE", value: null, reason: "MISSING_RECONCILED_PERIOD" },
    apy: { status: "INCOMPLETE", value: null, reason: "MISSING_RECONCILED_PERIOD" },
    impermanentLoss: { status: "INCOMPLETE", value: null, reason: "MISSING_COMPONENT_QUANTITIES" }
  };
}
