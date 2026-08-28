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
