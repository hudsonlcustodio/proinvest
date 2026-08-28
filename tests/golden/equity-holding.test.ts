import test from "node:test";
import assert from "node:assert/strict";
import { calculateEquityHolding } from "../../packages/domain/src/equity-holding.js";

test("GOLDEN-001 EMBR3",()=>{
 const r=calculateEquityHolding({quantity:"150",entryPrice:"38.23",currency:"BRL"});
 assert.deepEqual(r.grossAmount,{status:"AVAILABLE",value:"5734.50",currency:"BRL"});
 assert.equal(r.marketValue.status,"INCOMPLETE");
});

test("GOLDEN-002 OIBR3",()=>{
 const r=calculateEquityHolding({quantity:"335",entryPrice:"1.28",currency:"BRL"});
 assert.deepEqual(r.grossAmount,{status:"AVAILABLE",value:"428.80",currency:"BRL"});
});

test("unknown valuation is not zero",()=>{
 const r=calculateEquityHolding({quantity:"1",entryPrice:"10",currency:"BRL"});
 assert.deepEqual(r.marketValue,{status:"INCOMPLETE",value:null,reason:"MISSING_CURRENT_VALUATION"});
});
