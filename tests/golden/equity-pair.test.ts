import test from "node:test";
import assert from "node:assert/strict";
import { calculateEquityPair, type EquityPairLeg } from "../../packages/domain/src/equity-pair.js";

const legs: EquityPairLeg[] = [{side:"BUY",quantity:"166",entryPrice:"18.32",currency:"BRL"},{side:"SELL",quantity:"330",entryPrice:"7.35",currency:"BRL"}];
test("GOLDEN-003 Long & Short", () => {
  const result = calculateEquityPair(legs);
  assert.equal(result.longExposure.value,"3041.12"); assert.equal(result.shortExposure.value,"2425.50");
  assert.equal(result.grossExposure.value,"5466.62"); assert.equal(result.netExposure.value,"615.62");
  assert.equal(result.unrealizedPnl.status,"INCOMPLETE");
});
test("equity pair rejects currency mismatch and duplicate sides", () => {
  assert.throws(() => calculateEquityPair([{side:"BUY",quantity:"1",entryPrice:"1",currency:"BRL"},{side:"BUY",quantity:"1",entryPrice:"1",currency:"BRL"}]), /MISSING_SELL_LEG|MISSING_BUY_LEG/);
  assert.throws(() => calculateEquityPair([{...legs[0]!,currency:"USD"},legs[1]!]), /CURRENCY_MISMATCH/);
  assert.throws(() => calculateEquityPair([{...legs[0]!,quantity:"0"},legs[1]!]), /INVALID_QUANTITY/);
  assert.throws(() => calculateEquityPair([{...legs[0]!,entryPrice:"-1"},legs[1]!]), /INVALID_ENTRY_PRICE/);
  const negative = calculateEquityPair([{...legs[0]!,quantity:"1",entryPrice:"1"},{...legs[1]!,quantity:"2",entryPrice:"2"}]);
  assert.equal(negative.netExposure.value,"-3.00");
});
