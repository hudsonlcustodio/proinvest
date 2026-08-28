import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import pg from "pg";
import { calculateEquityHolding } from "../../packages/domain/src/equity-holding.js";

const url = process.env.TEST_DATABASE_URL;
const maybeTest = url ? test : test.skip;

maybeTest("PostgreSQL preserves exact financial decimal strings", async () => {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const result = await client.query<{ q:string; p:string }>(
      `SELECT $1::numeric::text AS q, $2::numeric::text AS p`,
      ["0.00031", "63000.38"]
    );
    assert.equal(result.rows[0]?.q, "0.00031");
    assert.equal(result.rows[0]?.p, "63000.38");

    const metric=calculateEquityHolding({
      quantity:result.rows[0]!.q,
      entryPrice:result.rows[0]!.p,
      currency:"USD"
    });
    assert.equal(metric.grossAmount.status,"AVAILABLE");
    if(metric.grossAmount.status==="AVAILABLE") assert.equal(metric.grossAmount.value,"19.53");
  } finally {
    await client.end();
  }
});

maybeTest("E2E Strategy Catalog to Position reload", async () => {
  const { createApp } = await import("../../apps/api/src/app.js");
  const server = createApp().listen(0);
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}`;
    const strategies = await fetch(`${base}/v1/strategies`).then((r) => r.json()) as {items:{id:string;templateType:string}[]};
    const strategy = strategies.items.find((item) => item.templateType === "EQUITY_HOLDING");
    assert.ok(strategy);
    const accounts = await fetch(`${base}/v1/strategies/accounts`).then((r) => r.json()) as {items:{id:string}[]};
    const instruments = await fetch(`${base}/v1/strategies/instruments`).then((r) => r.json()) as {items:{id:string;symbol:string}[]};
    const account = accounts.items[0];
    const instrument = instruments.items.find((item) => item.symbol === "EMBR3");
    assert.ok(account && instrument);
    const payload = { strategyId: strategy.id, accountId: account.id, template: {type:"EQUITY_HOLDING",version:1}, openedAt:"2026-01-01T10:00:00.000Z", legs:[{instrumentId:instrument.id,side:"BUY",quantity:"150",entryPrice:"38.23",currency:"BRL"}] };
    const preview = await fetch(`${base}/v1/operations/preview`, {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)}).then((r) => r.json()) as {metrics:{grossAmount:{value:string}}};
    assert.equal(preview.metrics.grossAmount.value, "5734.50");
    const savedResponse = await fetch(`${base}/v1/operations`, {method:"POST",headers:{"content-type":"application/json","Idempotency-Key":"00000000-0000-4000-8000-000000000099"},body:JSON.stringify(payload)});
    assert.equal(savedResponse.status, 201);
    const saved = await savedResponse.json() as {id:string;metrics:{costBasis:{value:string}}};
    assert.equal(saved.metrics.costBasis.value, "5734.50");
    const position = await fetch(`${base}/v1/operations/position/${account.id}/${instrument.id}`).then((r) => r.json()) as {quantity:string;costBasis:{value:string};marketValue:{status:string}};
    assert.equal(position.quantity, "150.000000000000000000");
    assert.equal(position.costBasis.value, "5734.500000000000000000000000000000000000");
    assert.equal(position.marketValue.status, "INCOMPLETE");
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});

maybeTest("E2E EQUITY_PAIR preview save reload and idempotency", async () => {
  const { createApp } = await import("../../apps/api/src/app.js");
  const { insertEquityPair } = await import("../../apps/api/src/repositories/operation-repository.js");
  const { withTransaction } = await import("../../apps/api/src/db/transaction.js");
  const client = new pg.Client({ connectionString: url }); await client.connect();
  const server = createApp().listen(0);
  try {
    const address = server.address(); assert.ok(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}`;
    const [strategies,accounts,instruments] = await Promise.all(["/v1/strategies","/v1/strategies/accounts","/v1/strategies/instruments"].map((path) => fetch(base+path).then((r) => r.json())));
    const strategy = (strategies as {items:{id:string;code:string}[]}).items.find((x) => x.code === "STR-003");
    const account = (accounts as {items:{id:string}[]}).items[0];
    const items = (instruments as {items:{id:string;symbol:string}[]}).items;
    const ptbr4 = items.find((x) => x.symbol === "PTBR4"); const smig3 = items.find((x) => x.symbol === "SMIG3");
    assert.ok(strategy && account && ptbr4 && smig3);
    const payload = {strategyId:strategy.id,accountId:account.id,template:{type:"EQUITY_PAIR",version:1},openedAt:"2026-06-01T10:00:00.000Z",legs:[{instrumentId:ptbr4.id,side:"BUY",quantity:"166",entryPrice:"18.32",currency:"BRL"},{instrumentId:smig3.id,side:"SELL",quantity:"330",entryPrice:"7.35",currency:"BRL"}]};
    const preview = await fetch(base+"/v1/operations/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)}).then((r) => r.json()) as {metrics:{grossExposure:{value:string};netExposure:{value:string}}};
    assert.equal(preview.metrics.grossExposure.value,"5466.62"); assert.equal(preview.metrics.netExposure.value,"615.62");
    const headers = {"content-type":"application/json","Idempotency-Key":"00000000-0000-4000-8000-000000000098"};
    const first = await fetch(base+"/v1/operations",{method:"POST",headers,body:JSON.stringify(payload)}); assert.equal(first.status,201);
    const saved = await first.json() as {id:string}; const retry = await fetch(base+"/v1/operations",{method:"POST",headers,body:JSON.stringify(payload)}).then((r) => r.json()) as {id:string}; assert.equal(retry.id,saved.id);
    const reloaded = await fetch(base+"/v1/operations/"+saved.id).then((r) => r.json()) as {templateType:string;legs:{side:string}[]};
    assert.equal(reloaded.templateType,"EQUITY_PAIR"); assert.equal(reloaded.legs.length,2); assert.deepEqual(reloaded.legs.map((x) => x.side),["BUY","SELL"]);
    const count = await client.query<{operations:string;legs:string}>(`SELECT (SELECT count(*)::text FROM operations WHERE id = $1) operations, (SELECT count(*)::text FROM operation_legs WHERE operation_id = $1) legs`,[saved.id]);
    assert.equal(count.rows[0]?.operations,"1"); assert.equal(count.rows[0]?.legs,"2");
    await assert.rejects(() => withTransaction((tx) => insertEquityPair(tx,{strategyId:strategy.id,accountId:account.id,openedAt:"2026-06-02T10:00:00.000Z",sourceType:"MANUAL",legs:[{instrumentId:ptbr4.id,side:"BUY",quantity:"1",entryPrice:"1",currency:"BRL"},{instrumentId:"20000000-0000-4000-8000-000000009999",side:"SELL",quantity:"1",entryPrice:"1",currency:"BRL"}]})));
    const rollback = await client.query<{count:string}>(`SELECT count(*)::text AS count FROM operations WHERE opened_at = '2026-06-02T10:00:00.000Z'`);
    assert.equal(rollback.rows[0]?.count,"0");
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); await client.end(); }
});

maybeTest("E2E Futures PostgreSQL catalog preview save reload and idempotency", async () => {
  const { createApp } = await import("../../apps/api/src/app.js");
  const server = createApp().listen(0); const db = new pg.Client({ connectionString: url }); await db.connect();
  try {
    const address = server.address(); assert.ok(address && typeof address !== "string"); const base=`http://127.0.0.1:${address.port}`;
    const [strategies,accounts,instruments] = await Promise.all(["/v1/strategies","/v1/strategies/accounts","/v1/strategies/instruments"].map((path)=>fetch(base+path).then((r)=>r.json())));
    const strategy=(strategies as {items:{id:string;code:string;templateType:string;templateVersion:number}[]}).items.find((x)=>x.code==="STR-004");
    const account=(accounts as {items:{id:string}[]}).items[0]; const instrument=(instruments as {items:{id:string;symbol:string;productCode:string|null;contractSize:string|null;contractSizeCurrency:string|null;quotationBasis:string|null;quotationCurrency:string|null;settlementCurrency:string|null;minimumPriceIncrement:string|null;standardLot:string|null}[]}).items.find((x)=>x.symbol==="WDOL26");
    assert.ok(strategy&&account&&instrument); assert.equal(strategy.templateType,"FUTURES_ROUND_TRIP"); assert.equal(strategy.templateVersion,1); assert.deepEqual({productCode:instrument.productCode,contractSize:instrument.contractSize,contractSizeCurrency:instrument.contractSizeCurrency,quotationBasis:instrument.quotationBasis,quotationCurrency:instrument.quotationCurrency,settlementCurrency:instrument.settlementCurrency,minimumPriceIncrement:instrument.minimumPriceIncrement,standardLot:instrument.standardLot},{productCode:"WDO",contractSize:"10000.000000000000000000",contractSizeCurrency:"USD",quotationBasis:"1000.000000000000000000",quotationCurrency:"USD",settlementCurrency:"BRL",minimumPriceIncrement:"0.500000000000000000",standardLot:"1.000000000000000000"});
    const payload={strategyId:strategy.id,accountId:account.id,instrumentId:instrument.id,openingSide:"SELL",contracts:"10",entryPrice:"5336",exitPrice:"5330",currency:"BRL",openedAt:"2026-05-15T10:00:00.000Z",closedAt:"2026-05-15T11:00:00.000Z",template:{type:"FUTURES_ROUND_TRIP",version:1}};
    const preview=await fetch(base+"/v1/operations/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)}).then((r)=>r.json()) as {metrics:{quotationFactor:string;priceMove:string;grossPnl:{status:string;value:string;currency:string};netPnl:{status:string;value:null;reason:string}}};
    assert.equal(preview.metrics.quotationFactor,"10"); assert.equal(preview.metrics.priceMove,"6"); assert.deepEqual(preview.metrics.grossPnl,{status:"AVAILABLE",value:"600.00",currency:"BRL"}); assert.deepEqual(preview.metrics.netPnl,{status:"INCOMPLETE",value:null,reason:"MISSING_TRADING_COSTS"});
    const key=crypto.randomUUID(); const headers={"content-type":"application/json","Idempotency-Key":key}; const first=await fetch(base+"/v1/operations",{method:"POST",headers,body:JSON.stringify(payload)}); assert.equal(first.status,201); const saved=await first.json() as {id:string}; const retry=await fetch(base+"/v1/operations",{method:"POST",headers,body:JSON.stringify(payload)}).then((r)=>r.json()) as {id:string}; assert.equal(retry.id,saved.id);
    const conflict=await fetch(base+"/v1/operations",{method:"POST",headers,body:JSON.stringify({...payload,entryPrice:"5335"})}); assert.equal(conflict.status,409);
    const reloaded=await fetch(base+"/v1/operations/"+saved.id).then((r)=>r.json()) as {status:string;templateType:string;closedAt:string;legs:{instrumentId:string;symbol:string;side:string;quantity:string;entryPrice:string;exitPrice:string;currency:string}[]}; assert.equal(reloaded.status,"CLOSED"); assert.equal(reloaded.templateType,"FUTURES_ROUND_TRIP"); assert.equal(reloaded.legs.length,1); assert.deepEqual(reloaded.legs[0],{instrumentId:instrument.id,symbol:"WDOL26",side:"SELL",quantity:"10.000000000000000000",entryPrice:"5336.000000000000000000",exitPrice:"5330.000000000000000000",currency:"BRL"}); assert.ok(reloaded.closedAt);
    const counts=await db.query<{operations:string;legs:string}>(`SELECT (SELECT count(*)::text FROM operations WHERE id=$1) operations,(SELECT count(*)::text FROM operation_legs WHERE operation_id=$1) legs`,[saved.id]); assert.equal(counts.rows[0]?.operations,"1"); assert.equal(counts.rows[0]?.legs,"1");
  } finally { await new Promise<void>((resolve)=>server.close(()=>resolve())); await db.end(); }
});
