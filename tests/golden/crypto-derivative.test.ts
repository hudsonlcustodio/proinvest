import test from "node:test";
import assert from "node:assert/strict";
import { Decimal } from "decimal.js";
import { calculateCryptoDerivative } from "../../packages/domain/src/crypto-derivative.js";

const PreciseDecimal = Decimal.clone({ precision: 80 });

const base = { investedCapital: "100.00", leverage: "50", entryPrice: "69358.32", exitPrice: "59862.15", currency: "USD" };

test("GOLDEN-006 BTC Leveraged Short", () => {
  const result = calculateCryptoDerivative({ ...base, side: "SELL" });
  assert.equal(result.effectiveNotional.value, "5000");
  assert.equal(result.priceMove, "9496.17");
  assert.ok(new PreciseDecimal(result.underlyingReturn).eq(new PreciseDecimal("9496.17").div("69358.32")));
  assert.ok(new PreciseDecimal(result.leveragedReturn).eq(new PreciseDecimal(result.underlyingReturn).mul("50")));
  const expectedGross = new PreciseDecimal("100").mul(new PreciseDecimal("9496.17").div("69358.32")).mul("50");
  assert.ok(new PreciseDecimal(result.grossPnl.value!).eq(expectedGross));
  assert.notEqual(result.grossPnl.value, "684.57");
  assert.deepEqual(result.netPnl, { status: "INCOMPLETE", value: null, reason: "MISSING_TRADING_COSTS" });
});

test("Crypto derivative preserves BUY and SELL sign semantics", () => {
  assert.ok(calculateCryptoDerivative({ ...base, exitPrice: "70000", side: "BUY" }).grossPnl.value! > "0");
  assert.ok(calculateCryptoDerivative({ ...base, exitPrice: "60000", side: "BUY" }).grossPnl.value! < "0");
  assert.ok(calculateCryptoDerivative({ ...base, exitPrice: "60000", side: "SELL" }).grossPnl.value! > "0");
  assert.ok(calculateCryptoDerivative({ ...base, exitPrice: "70000", side: "SELL" }).grossPnl.value! < "0");
  assert.equal(calculateCryptoDerivative({ ...base, exitPrice: base.entryPrice, side: "SELL" }).grossPnl.value!, "0");
});

test("Crypto derivative leverage is a multiplier, not a hard-coded value", () => {
  const one = calculateCryptoDerivative({ ...base, leverage: "1", side: "SELL" });
  const ten = calculateCryptoDerivative({ ...base, leverage: "10", side: "SELL" });
  const fifty = calculateCryptoDerivative({ ...base, leverage: "50", side: "SELL" });
  assert.equal(one.effectiveNotional.value, "100");
  assert.equal(ten.effectiveNotional.value, "1000");
  assert.equal(fifty.effectiveNotional.value, "5000");
  assert.equal(new PreciseDecimal(ten.grossPnl.value!).div(one.grossPnl.value!).toString(), "10");
  assert.equal(new PreciseDecimal(fifty.grossPnl.value!).div(one.grossPnl.value!).toString(), "50");
});

test("Crypto derivative validates inputs and keeps net P&L unknown", () => {
  assert.throws(() => calculateCryptoDerivative({ ...base, investedCapital: "0", side: "BUY" }), /MUST_BE_POSITIVE/);
  assert.throws(() => calculateCryptoDerivative({ ...base, leverage: "-1", side: "BUY" }), /MUST_BE_POSITIVE/);
  assert.throws(() => calculateCryptoDerivative({ ...base, entryPrice: "0", side: "BUY" }), /MUST_BE_POSITIVE/);
  assert.throws(() => calculateCryptoDerivative({ ...base, exitPrice: "-1", side: "BUY" }), /MUST_BE_NON_NEGATIVE/);
  assert.throws(() => calculateCryptoDerivative({ ...base, currency: "", side: "BUY" }), /REQUIRED/);
  assert.throws(() => calculateCryptoDerivative({ ...base, side: "HOLD" as "BUY" }), /INVALID/);
  assert.ok(new PreciseDecimal(calculateCryptoDerivative({ ...base, entryPrice: "100.00000001", exitPrice: "100.00000002", side: "BUY" }).priceMove).eq("0.00000001"));
});
