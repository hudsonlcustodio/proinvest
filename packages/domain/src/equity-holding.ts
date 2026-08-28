import { Decimal } from "decimal.js";
import type { MoneyMetric } from "./metric-result.js";

export interface EquityHoldingInput { quantity:string; entryPrice:string; currency:string }
export interface EquityHoldingMetrics { grossAmount:MoneyMetric; marketValue:MoneyMetric; unrealizedPnl:MoneyMetric }

function decimal(value:string, field:string):Decimal {
 if (typeof value !== "string" || value.trim() === "") throw new Error(`${field}: REQUIRED_DECIMAL_STRING`);
 const parsed=new Decimal(value);
 if (!parsed.isFinite()) throw new Error(`${field}: INVALID_DECIMAL`);
 return parsed;
}

export function calculateEquityHolding(input:EquityHoldingInput):EquityHoldingMetrics {
 const q=decimal(input.quantity,"quantity");
 const p=decimal(input.entryPrice,"entryPrice");
 if(q.lte(0)) throw new Error("quantity: MUST_BE_POSITIVE");
 if(p.lt(0)) throw new Error("entryPrice: MUST_BE_NON_NEGATIVE");
 if(!input.currency?.trim()) throw new Error("currency: REQUIRED");
 return {
  grossAmount:{status:"AVAILABLE",value:q.mul(p).toFixed(2),currency:input.currency.toUpperCase()},
  marketValue:{status:"INCOMPLETE",value:null,reason:"MISSING_CURRENT_VALUATION"},
  unrealizedPnl:{status:"INCOMPLETE",value:null,reason:"MISSING_CURRENT_VALUATION"}
 };
}
