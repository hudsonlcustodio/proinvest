import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import pg from "pg";
import { Decimal } from "decimal.js";

const url = process.env.TEST_DATABASE_URL;
const maybeTest = url ? test : test.skip;
const D = Decimal.clone({ precision: 80 });

maybeTest("E2E DeFi LP PostgreSQL snapshots, reload and spot isolation", async () => {
  const { createApp } = await import("../../apps/api/src/app.js");
  const server = createApp().listen(0);
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}`;
    const [strategies, accounts, instruments] = await Promise.all(["/v1/strategies", "/v1/strategies/accounts", "/v1/strategies/instruments"].map((path) => fetch(base + path).then((response) => response.json())));
    const strategy = (strategies as {items:{id:string;code:string;templateType:string}[]}).items.find((item) => item.code === "STR-007");
    const wrongStrategy = (strategies as {items:{id:string;code:string}[]}).items.find((item) => item.code === "STR-005");
    const account = (accounts as {items:{id:string}[]}).items[0];
    const refs = (instruments as {items:{id:string;symbol:string}[]}).items;
    const wbtc = refs.find((item) => item.symbol === "WBTC");
    const sol = refs.find((item) => item.symbol === "SOL");
    const btc = refs.find((item) => item.symbol === "BTC");
    assert.ok(strategy && wrongStrategy && account && wbtc && sol && btc);
    assert.equal(strategy.templateType, "DEFI_LP");

    const payload = { strategyId: strategy.id, accountId: account.id, componentInstrumentIds: [wbtc.id, sol.id], investedAmount: "450.31", currency: "USD", openedAt: "2026-07-28T10:00:00.000Z", template: { type: "DEFI_LP", version: 1 } };
    const preview = await fetch(base + "/v1/operations/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, currentPositionValue: "428.12", unclaimedFees: "36.22" }) }).then((response) => response.json()) as {metrics:{positionValueDelta:{value:string};economicValue:{value:string};totalPnl:{value:string};totalReturn:{value:string};apr:{status:string};apy:{status:string};impermanentLoss:{status:string}}};
    assert.equal(preview.metrics.positionValueDelta.value, "-22.19");
    assert.equal(preview.metrics.economicValue.value, "464.34");
    assert.equal(preview.metrics.totalPnl.value, "14.03");
    assert.ok(new D(preview.metrics.totalReturn.value).eq(new D("14.03").div("450.31")));
    assert.equal(preview.metrics.apr.status, "INCOMPLETE");
    assert.equal(preview.metrics.apy.status, "INCOMPLETE");
    assert.equal(preview.metrics.impermanentLoss.status, "INCOMPLETE");

    const key = crypto.randomUUID();
    const headers = { "content-type": "application/json", "Idempotency-Key": key };
    const first = await fetch(base + "/v1/operations", { method: "POST", headers, body: JSON.stringify(payload) });
    assert.equal(first.status, 201);
    const saved = await first.json() as {id:string};
    const retry = await fetch(base + "/v1/operations", { method: "POST", headers, body: JSON.stringify(payload) }).then((response) => response.json()) as {id:string};
    assert.equal(retry.id, saved.id);
    const conflict = await fetch(base + "/v1/operations", { method: "POST", headers, body: JSON.stringify({ ...payload, investedAmount: "451.31" }) });
    assert.equal(conflict.status, 409);
    const mismatch = await fetch(base + "/v1/operations", { method: "POST", headers: { ...headers, "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ ...payload, strategyId: wrongStrategy.id }) });
    assert.equal(mismatch.status, 422);
    const badInstrument = await fetch(base + "/v1/operations", { method: "POST", headers: { ...headers, "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ ...payload, componentInstrumentIds: [btc.id, sol.id] }) });
    assert.equal(badInstrument.status, 422);

    const snapshotPayload = { currentPositionValue: "428.12", unclaimedFees: "36.22", currency: "USD", observedAt: "2026-08-28T12:00:00.000Z" };
    const snapshotKey = crypto.randomUUID();
    const snapshotHeaders = { "content-type": "application/json", "Idempotency-Key": snapshotKey };
    const snapshot = await fetch(`${base}/v1/operations/${saved.id}/snapshots`, { method: "POST", headers: snapshotHeaders, body: JSON.stringify(snapshotPayload) });
    assert.equal(snapshot.status, 201);
    const snapshotBody = await snapshot.json() as {id:string};
    const snapshotRetry = await fetch(`${base}/v1/operations/${saved.id}/snapshots`, { method: "POST", headers: snapshotHeaders, body: JSON.stringify(snapshotPayload) }).then((response) => response.json()) as {id:string};
    assert.equal(snapshotRetry.id, snapshotBody.id);
    const snapshotB = await fetch(`${base}/v1/operations/${saved.id}/snapshots`, { method: "POST", headers: { ...snapshotHeaders, "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ ...snapshotPayload, currentPositionValue: "430.00", observedAt: "2026-08-29T12:00:00.000Z" }) });
    assert.equal(snapshotB.status, 201);
    const history = await fetch(`${base}/v1/operations/${saved.id}/snapshots`).then((response) => response.json()) as {items:{current_position_value:string}[]};
    assert.ok(new D(history.items[0]!.current_position_value).eq("428.12"));
    assert.ok(new D(history.items[1]!.current_position_value).eq("430.00"));
    const metrics = await fetch(`${base}/v1/operations/${saved.id}/metrics`).then((response) => response.json()) as {metrics:{economicValue:{value:string};totalPnl:{value:string};totalReturn:{value:string}}};
    assert.equal(metrics.metrics.economicValue.value, "466.22");
    assert.equal(metrics.metrics.totalPnl.value, "15.91");
    assert.ok(new D(metrics.metrics.totalReturn.value).eq(new D("15.91").div("450.31")));

    const reload = await fetch(base + "/v1/operations/" + saved.id).then((response) => response.json()) as {status:string;templateType:string;investedAmount:string;metadata:{pairIdentity:string;poolIdentityStatus:string};legs:{symbol:string;quantity:string|null;entryPrice:string|null}[]};
    assert.equal(reload.status, "OPEN");
    assert.equal(reload.templateType, "DEFI_LP");
    assert.ok(new D(reload.investedAmount).eq("450.31"));
    assert.equal(reload.metadata.pairIdentity, "WBTC/SOL");
    assert.equal(reload.metadata.poolIdentityStatus, "INCOMPLETE");
    assert.deepEqual(reload.legs.map((leg) => leg.symbol).sort(), ["SOL", "WBTC"]);
    assert.ok(reload.legs.every((leg) => leg.quantity === null && leg.entryPrice === null));
    const position = await fetch(`${base}/v1/operations/position/${account.id}/${wbtc.id}`);
    assert.equal(position.status, 404);
    const rows = await db.query<{operations:string;legs:string;snapshots:string}>(`SELECT (SELECT count(*)::text FROM operations WHERE id=$1) operations,(SELECT count(*)::text FROM operation_legs WHERE operation_id=$1) legs,(SELECT count(*)::text FROM defi_lp_snapshots WHERE operation_id=$1) snapshots`, [saved.id]);
    assert.deepEqual(rows.rows[0], { operations: "1", legs: "2", snapshots: "2" });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.end();
  }
});
