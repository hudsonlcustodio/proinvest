import test from "node:test";
import assert from "node:assert/strict";
import { Decimal } from "decimal.js";
import { calculateDefiLp } from "../../packages/domain/src/defi-lp.js";

const PreciseDecimal = Decimal.clone({ precision: 80 });
const golden = { investedAmount: "450.31", currentPositionValue: "428.12", unclaimedFees: "36.22", currency: "USD" };

test("GOLDEN-007 WBTC/SOL LP", () => {
  const result = calculateDefiLp(golden);
  assert.equal(result.positionValueDelta.value, "-22.19");
  assert.equal(result.economicValue.value, "464.34");
  assert.equal(result.totalPnl.value, "14.03");
  assert.ok(new PreciseDecimal(result.totalReturn.value!).eq(new PreciseDecimal("14.03").div("450.31")));
  assert.notEqual(result.economicValue.value, "428.12");
  assert.notEqual(result.economicValue.value, "500.56");
  assert.equal(result.apr.status, "INCOMPLETE");
  assert.equal(result.apy.status, "INCOMPLETE");
  assert.equal(result.impermanentLoss.status, "INCOMPLETE");
});

test("DeFi LP preserves known zero fees and unknown fees", () => {
  const zero = calculateDefiLp({ ...golden, unclaimedFees: "0" });
  assert.equal(zero.economicValue.value, "428.12");
  const unknown = calculateDefiLp({ ...golden, unclaimedFees: undefined });
  assert.equal(unknown.economicValue.status, "INCOMPLETE");
  assert.equal(unknown.economicValue.reason, "MISSING_UNCLAIMED_FEES");
  assert.notEqual(unknown.economicValue.value, "0");
});

test("DeFi LP validates values and currency provenance", () => {
  assert.throws(() => calculateDefiLp({ ...golden, investedAmount: "0" }), /MUST_BE_POSITIVE/);
  assert.throws(() => calculateDefiLp({ ...golden, currentPositionValue: "-1" }), /MUST_BE_NON_NEGATIVE/);
  assert.throws(() => calculateDefiLp({ ...golden, unclaimedFees: "-1" }), /MUST_BE_NON_NEGATIVE/);
  assert.throws(() => calculateDefiLp({ ...golden, currency: "" }), /REQUIRED/);
  assert.throws(() => calculateDefiLp({ ...golden, unclaimedFeesCurrency: "BRL" }), /CURRENCY_MISMATCH/);
  const higher = calculateDefiLp({ ...golden, currentPositionValue: "500.00" });
  assert.equal(higher.totalPnl.value, "85.91");
});
