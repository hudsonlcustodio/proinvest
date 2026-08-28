import test from "node:test";
import assert from "node:assert/strict";
import { calculateCryptoSpot } from "../../packages/domain/src/crypto-spot.js";

test("GOLDEN-005 BTC Spot Holding", () => {
  const result = calculateCryptoSpot({ quantity: "0.00031", unitPrice: "63000.38", currency: "USD" });
  assert.deepEqual(result.grossAmount, { status: "AVAILABLE", value: "19.5301178", currency: "USD" });
  assert.deepEqual(result.marketValue, { status: "INCOMPLETE", value: null, reason: "MISSING_CURRENT_VALUATION" });
  assert.deepEqual(result.unrealizedPnl, { status: "INCOMPLETE", value: null, reason: "MISSING_CURRENT_VALUATION" });
});

test("Crypto Spot preserves fractional precision", () => {
  const result = calculateCryptoSpot({ quantity: "0.00000001", unitPrice: "12345.67890123", currency: "USD" });
  assert.equal(result.grossAmount.value, "0.0001234567890123");
});

test("Crypto Spot validates financial inputs without conflating zero and unknown", () => {
  assert.throws(() => calculateCryptoSpot({ quantity: "0", unitPrice: "1", currency: "USD" }), /MUST_BE_POSITIVE/);
  assert.throws(() => calculateCryptoSpot({ quantity: "-1", unitPrice: "1", currency: "USD" }), /MUST_BE_POSITIVE/);
  assert.throws(() => calculateCryptoSpot({ quantity: "1", unitPrice: "-0.01", currency: "USD" }), /MUST_BE_NON_NEGATIVE/);
  assert.throws(() => calculateCryptoSpot({ quantity: "1", unitPrice: "1", currency: "" }), /REQUIRED/);

  const zeroPrice = calculateCryptoSpot({ quantity: "0.00031", unitPrice: "0", currency: "USD" });
  assert.equal(zeroPrice.grossAmount.value, "0");
  assert.equal(zeroPrice.marketValue.status, "INCOMPLETE");
});
