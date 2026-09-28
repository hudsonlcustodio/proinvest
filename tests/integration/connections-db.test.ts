import test from"node:test";import assert from"node:assert/strict";import pg from"pg";import crypto from"node:crypto";
import{execFileSync}from"node:child_process";
const url=process.env.TEST_DATABASE_URL,maybeTest=url?test:test.skip;
maybeTest("TEST-IMP-001..010 CSV stages reconciles promotes and deduplicates canonically",async()=>{process.env.DATABASE_URL=url!;process.env.CONNECTION_MASTER_KEY=Buffer.alloc(32,9).toString("base64");const{createApp}=await import("../../apps/api/src/app.js");const server=createApp().listen(0),db=new pg.Client({connectionString:url});await db.connect();try{const address=server.address();assert.ok(address&&typeof address!=="string");const base=`http://127.0.0.1:${address.port}`,call=async(path:string,method="GET",body?:unknown)=>{const init:RequestInit={method,headers:{"content-type":"application/json"}};if(body!==undefined)init.body=JSON.stringify(body);const r=await fetch(base+path,init);return{r,body:await r.json()}};const created=await call("/v1/connections","POST",{providerKey:"FILE_IMPORT",displayName:`CSV ${crypto.randomUUID()}`});assert.equal(created.r.status,200);assert.equal(created.body.readOnly,true);const id=created.body.id as string,accountId=crypto.randomUUID(),accountName=`Import QA ${id}`;await db.query(`INSERT INTO accounts(id,name,type,base_currency,status)VALUES($1,$2,'MANUAL','BRL','ACTIVE')`,[accountId,accountName]);const secret=await call(`/v1/connections/${id}/credential`,"POST",{secret:"do-not-return-me"});assert.deepEqual(secret.body,{stored:true});assert.doesNotMatch(JSON.stringify(secret.body),/do-not-return-me/);const stored=await db.query(`SELECT encode(ciphertext,'hex') ciphertext,revoked_at FROM connection_secrets WHERE connection_id=$1`,[id]);assert.equal(stored.rowCount,1);assert.doesNotMatch(stored.rows[0].ciphertext,/646f2d6e6f742d72657475726e2d6d65/);const csv=`external_id,strategy_code,account_name,symbol,side,quantity,entry_price,currency,opened_at\nimp-1,STR-001,${accountName},EMBR3,BUY,2,38.23,BRL,2026-08-29T12:00:00Z\nimp-2,UNKNOWN,${accountName},OIBR3,BUY,1,10,BRL,2026-08-29T13:00:00Z`;const first=await call(`/v1/connections/${id}/imports`,"POST",{filename:"portfolio.csv",content:csv});assert.equal(first.r.status,200);assert.deepEqual({ready:first.body.ready,pending:first.body.pending,duplicate:first.body.duplicate},{ready:1,pending:1,duplicate:0});let staged=(await call("/v1/connections/reconciliation")).body.items.filter((x:any)=>x.connectionId===id);const ready=staged.find((x:any)=>x.status==="READY"),pending=staged.find((x:any)=>x.status==="PENDING");assert.ok(ready&&pending);assert.ok(pending.issues.includes("STRATEGY_RECONCILIATION_REQUIRED"));const promoted=await call(`/v1/connections/reconciliation/${ready.id}/promote`,"POST");assert.equal(promoted.body.status,"IMPORTED");const operation=await db.query(`SELECT source_type,source_id,external_id FROM operations WHERE id=$1`,[promoted.body.operationId]);assert.deepEqual(operation.rows[0],{source_type:"FILE_IMPORT",source_id:id,external_id:"imp-1"});const retry=await call(`/v1/connections/${id}/imports`,"POST",{filename:"portfolio.csv",content:csv});assert.equal(retry.body.duplicate,2);const count=await db.query(`SELECT count(*)::int count FROM operations WHERE source_type='FILE_IMPORT' AND source_id=$1 AND external_id='imp-1'`,[id]);assert.equal(count.rows[0].count,1);const refs=await Promise.all([db.query(`SELECT id FROM strategies WHERE code='STR-002'`),db.query(`SELECT id FROM instruments WHERE symbol='OIBR3'`)]);const resolved=await call(`/v1/connections/reconciliation/${pending.id}`,"PATCH",{strategyId:refs[0].rows[0].id,instrumentId:refs[1].rows[0].id,accountId});assert.equal(resolved.body.resolved,true);const promotedPending=await call(`/v1/connections/reconciliation/${pending.id}/promote`,"POST");assert.equal(promotedPending.body.status,"IMPORTED");const revoked=await call(`/v1/connections/${id}/credential`,"DELETE");assert.equal(revoked.body.revoked,true);const revokedRow=await db.query(`SELECT revoked_at IS NOT NULL revoked FROM connection_secrets WHERE connection_id=$1`,[id]);assert.equal(revokedRow.rows[0].revoked,true);const runs=(await call("/v1/connections/sync-runs")).body.items.filter((x:any)=>x.connectionId===id);assert.equal(runs.length,2);assert.ok(runs.every((x:any)=>x.status==="COMPLETED"));assert.ok(runs.some((x:any)=>x.imported>=1))}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await db.end()}});

maybeTest("TEST-IMP negative validation, external identity and concurrent transitions",async()=>{
  process.env.DATABASE_URL=url!;
  const{createApp}=await import("../../apps/api/src/app.js");
  const server=createApp().listen(0),db=new pg.Client({connectionString:url});
  await db.connect();
  try{
    const address=server.address();assert.ok(address&&typeof address!=="string");
    const base=`http://127.0.0.1:${address.port}`;
    const call=async(path:string,method="GET",body?:unknown)=>{const init:RequestInit={method,headers:{"content-type":"application/json"}};if(body!==undefined)init.body=JSON.stringify(body);const r=await fetch(base+path,init);return{status:r.status,body:await r.json()}};
    const connection=(await call("/v1/connections","POST",{providerKey:"FILE_IMPORT",displayName:"Negative QA"})).body;
    const id=connection.id as string,accountId=crypto.randomUUID(),accountName=`Negative QA ${id}`;
    await db.query(`INSERT INTO accounts(id,name,type,base_currency,status)VALUES($1,$2,'MANUAL','BRL','ACTIVE')`,[accountId,accountName]);
    const header="external_id,strategy_code,account_name,symbol,side,quantity,entry_price,currency,opened_at\n";
    const upload=(row:string)=>call(`/v1/connections/${id}/imports`,"POST",{filename:"qa.csv",content:header+row});
    const invalid=await upload(`bad-1,STR-001,${accountName},EMBR3,BUY,,38.23,BRL,2026-08-29T12:00:00Z`);
    assert.equal(invalid.status,200);assert.equal(invalid.body.rejected,1);assert.equal(invalid.body.pending,0);
    const records=async()=>((await call("/v1/connections/reconciliation")).body.items as any[]).filter(x=>x.connectionId===id);
    const bad=(await records()).find(x=>x.externalId==="bad-1");assert.equal(bad.status,"REJECTED");
    const refs=await Promise.all([db.query(`SELECT id FROM strategies WHERE code='STR-001'`),db.query(`SELECT id FROM strategies WHERE code='STR-003'`),db.query(`SELECT id FROM instruments WHERE symbol='EMBR3'`),db.query(`SELECT id FROM instruments WHERE symbol='OIBR3'`)]);
    const goodRefs={strategyId:refs[0].rows[0].id,instrumentId:refs[2].rows[0].id,accountId};
    assert.equal((await call(`/v1/connections/reconciliation/${bad.id}`,"PATCH",goodRefs)).status,422);
    assert.equal((await call(`/v1/connections/reconciliation/${bad.id}/promote`,"POST")).status,422);
    const pending=await upload(`ref-1,UNKNOWN,${accountName},EMBR3,BUY,1,10,BRL,2026-08-29T12:00:00Z`);
    assert.equal(pending.body.pending,1);
    const ref=(await records()).find(x=>x.externalId==="ref-1");
    assert.equal((await call(`/v1/connections/reconciliation/${ref.id}`,"PATCH",{...goodRefs,instrumentId:refs[3].rows[0].id})).status,422);
    assert.equal((await call(`/v1/connections/reconciliation/${ref.id}`,"PATCH",{...goodRefs,strategyId:refs[1].rows[0].id})).status,422);
    assert.equal((await call(`/v1/connections/reconciliation/${ref.id}`,"PATCH",goodRefs)).status,200);
    const ready=await upload(`dup-1,STR-001,${accountName},EMBR3,BUY,2,38.23,BRL,2026-08-29T12:00:00Z`);
    assert.equal(ready.body.ready,1);
    const altered=await upload(`dup-1,STR-001,${accountName},EMBR3,BUY,3,38.23,BRL,2026-08-29T12:00:00Z`);
    assert.equal(altered.status,409);assert.equal(altered.body.code,"EXTERNAL_ID_CONFLICT");
    assert.equal((await records()).filter(x=>x.externalId==="dup-1").length,1);
    const race=await upload(`race-1,STR-001,${accountName},EMBR3,BUY,1,9,BRL,2026-08-29T12:00:00Z`);
    assert.equal(race.body.ready,1);
    const raceId=(await records()).find(x=>x.externalId==="race-1").id;
    const outcomes=await Promise.all([
      call(`/v1/connections/reconciliation/${raceId}/promote`,"POST"),
      call(`/v1/connections/reconciliation/${raceId}/reject`,"POST")
    ]);
    assert.deepEqual(outcomes.map(x=>x.status).sort(),[200,422]);
    const final=(await records()).find(x=>x.id===raceId);
    const canonical=await db.query(`SELECT count(*)::int count FROM operations WHERE source_type='FILE_IMPORT' AND source_id=$1 AND external_id='race-1'`,[id]);
    assert.equal(canonical.rows[0].count,final.status==="IMPORTED"?1:0);
    const runs=(await call("/v1/connections/sync-runs")).body.items.filter((x:any)=>x.connectionId===id);
    assert.equal(runs.find((x:any)=>x.id===invalid.body.syncRunId).rejected,1);
    for(const run of runs.filter((x:any)=>x.status==="COMPLETED"))assert.equal(run.fetched,run.ready+run.imported+run.duplicate+run.pending+run.rejected);
    assert.ok(runs.some((x:any)=>x.status==="FAILED"&&x.errorCode==="EXTERNAL_ID_CONFLICT"));
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await db.end()}
});
maybeTest("terminal staging retention preserves actionable records",async()=>{
  const client=new pg.Client({connectionString:url});await client.connect();
  try{
    const connectionId=crypto.randomUUID(),runId=crypto.randomUUID();
    await client.query(`INSERT INTO connections(id,provider_key,display_name) VALUES($1,'FILE_IMPORT','Retention QA')`,[connectionId]);
    await client.query(`INSERT INTO sync_runs(id,connection_id,status) VALUES($1,$2,'COMPLETED')`,[runId,connectionId]);
    const ids=[crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID()];
    for(const[index,status]of["REJECTED","PENDING","READY"].entries())
      await client.query(`INSERT INTO staging_records(id,connection_id,sync_run_id,fingerprint,status,sanitized_source,normalized,updated_at) VALUES($1,$2,$3,$4,$5,'{}'::jsonb,'{}'::jsonb,NOW()-INTERVAL '2 days')`,[ids[index],connectionId,runId,String(index).repeat(64),status]);
    execFileSync(process.execPath,["scripts/prune-staging.mjs"],{env:{...process.env,DATABASE_URL:url!,STAGING_RETENTION_DAYS:"1"}});
    const remaining=await client.query(`SELECT status FROM staging_records WHERE connection_id=$1 ORDER BY status`,[connectionId]);
    assert.deepEqual(remaining.rows.map(x=>x.status),["PENDING","READY"]);
  }finally{await client.end()}
});
