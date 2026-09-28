import test from"node:test";import assert from"node:assert/strict";
import pg from"pg";import crypto from"node:crypto";
const db=process.env.TEST_DATABASE_URL;
test("TEST-DASH-001..012 Dashboard PostgreSQL composes canonical portfolio without fake history",{skip:!db},async()=>{process.env.DATABASE_URL=db!;const{createApp}=await import("../../apps/api/src/app.js");const server=createApp().listen(0);try{const address=server.address();assert.ok(address&&typeof address!=="string");const base=`http://127.0.0.1:${address.port}`;const response=await fetch(`${base}/v1/dashboard`);assert.equal(response.status,200);const body=await response.json()as any;assert.ok(Array.isArray(body.portfolio.currencyBuckets));assert.equal(body.portfolio.globalTotal.status,"INCOMPLETE");assert.ok(["MISSING_FX_RATE","BASE_CURRENCY_NOT_CONFIGURED"].includes(body.portfolio.globalTotal.reason));for(const allocation of body.allocations){assert.equal(typeof allocation.knownValue,"string");assert.equal(allocation.coverage.availableComponents+allocation.coverage.missingComponents,allocation.coverage.totalComponents);assert.ok(allocation.items.every((x:any)=>x.currency===allocation.currency))}assert.ok(body.insights.every((x:any)=>x.evidence&&x.provenance&&!/\b(BUY|SELL|COMPRE|VENDA)\b/i.test(`${x.title} ${x.summary}`)));const history=await(await fetch(`${base}/v1/dashboard/valuation-history`)).json()as any;assert.ok(history.series.every((x:any)=>x.points.length>=2?x.status==="AVAILABLE":x.status==="INSUFFICIENT_HISTORY"))}finally{await new Promise<void>(resolve=>server.close(()=>resolve()))}});
test("Dashboard filters summary consistently and counts only actual leverage above one",{skip:!db},async()=>{
  process.env.DATABASE_URL=db!;
  const{createApp}=await import("../../apps/api/src/app.js");
  const server=createApp().listen(0),client=new pg.Client({connectionString:db});
  await client.connect();
  try{
    const address=server.address();assert.ok(address&&typeof address!=="string");
    const accountId=crypto.randomUUID(),operationId=crypto.randomUUID(),legId=crypto.randomUUID();
    await client.query(`INSERT INTO accounts(id,name,type,base_currency,status) VALUES($1,$2,'MANUAL','USD','ACTIVE')`,[accountId,`Dashboard QA ${accountId}`]);
    await client.query(`INSERT INTO operations(id,strategy_id,account_id,template_type,template_version,operation_type,status,opened_at,closed_at,source_type) VALUES($1,'00000000-0000-4000-8000-000000000006',$2,'CRYPTO_DERIVATIVE',1,'DERIVATIVE','CLOSED','2026-08-29T12:00:00Z','2026-08-29T13:00:00Z','MANUAL')`,[operationId,accountId]);
    await client.query(`INSERT INTO operation_legs(id,operation_id,instrument_id,side,entry_price,exit_price,currency,leverage,notional,invested_capital) VALUES($1,$2,'20000000-0000-4000-8000-000000000006','BUY',100,110,'USD',1,100,100)`,[legId,operationId]);
    const endpoint=`http://127.0.0.1:${address.port}/v1/dashboard?accountId=${accountId}`;
    const initial=await(await fetch(endpoint)).json()as any;
    assert.equal(initial.health.leveragedExposureCount,0);
    assert.deepEqual(initial.portfolio.currencyBuckets.map((x:any)=>x.currency),["USD"]);
    assert.ok(initial.lastMeaningfulDataUpdate);
    const empty=await(await fetch(endpoint+"&currency=BRL")).json()as any;
    assert.deepEqual(empty.portfolio.currencyBuckets,[]);
    assert.deepEqual(empty.allocations,[]);
    const kind=await(await fetch(endpoint+"&kind=EQUITY_HOLDING")).json()as any;
    assert.deepEqual(kind.portfolio.currencyBuckets,[]);
    await client.query(`UPDATE operation_legs SET leverage=2,notional=200 WHERE id=$1`,[legId]);
    const leveraged=await(await fetch(endpoint)).json()as any;
    assert.equal(leveraged.health.leveragedExposureCount,1);
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await client.end()}
});
