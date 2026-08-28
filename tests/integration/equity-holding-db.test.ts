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
