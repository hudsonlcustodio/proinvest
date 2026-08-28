import test from "node:test";
import assert from "node:assert/strict";
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
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); await client.end(); }
});
