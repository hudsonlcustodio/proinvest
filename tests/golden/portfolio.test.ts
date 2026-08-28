import test from "node:test";
import assert from "node:assert/strict";
import { aggregateMoney,classifyCurrentPosition } from "../../packages/domain/src/portfolio.js";

test("TEST-POS classification policy",()=>{
 assert.equal(classifyCurrentPosition({templateType:"EQUITY_HOLDING",templateVersion:1,status:"OPEN"}),"EQUITY_HOLDING");
 assert.equal(classifyCurrentPosition({templateType:"CRYPTO_SPOT",templateVersion:1,status:"OPEN"}),"SPOT_HOLDING");
 assert.equal(classifyCurrentPosition({templateType:"EQUITY_PAIR",templateVersion:1,status:"OPEN"}),"PAIR_EXPOSURE");
 assert.equal(classifyCurrentPosition({templateType:"DEFI_LP",templateVersion:1,status:"OPEN"}),"DEFI_LP");
 assert.equal(classifyCurrentPosition({templateType:"FUTURES_ROUND_TRIP",templateVersion:1,status:"CLOSED"}),"NONE_CURRENT_POSITION");
 assert.equal(classifyCurrentPosition({templateType:"CRYPTO_DERIVATIVE",templateVersion:1,status:"CLOSED"}),"NONE_CURRENT_POSITION");
 assert.equal(classifyCurrentPosition({templateType:"UNKNOWN",templateVersion:1,status:"OPEN"}),"NONE_CURRENT_POSITION");
});
test("TEST-POS-009 partial completeness preserves known subtotal, zero and coverage",()=>{
 const metric=aggregateMoney([{status:"AVAILABLE",value:"100.10",currency:"USD"},{status:"AVAILABLE",value:"0",currency:"USD"},{status:"AVAILABLE",value:"328.02",currency:"USD"},{status:"MISSING",currency:"USD"},{status:"MISSING",currency:"USD"}],"USD","MISSING_CURRENT_VALUATION");
 assert.deepEqual(metric,{status:"INCOMPLETE",knownValue:"428.12",currency:"USD",reason:"MISSING_CURRENT_VALUATION",coverage:{totalComponents:5,availableComponents:3,missingComponents:2}});
 assert.throws(()=>aggregateMoney([{status:"AVAILABLE",value:"1",currency:"BRL"}],"USD","MISSING"),/CURRENCY_MISMATCH/);
});
