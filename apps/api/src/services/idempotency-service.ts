import crypto from "node:crypto";
import type { PoolClient } from "pg";

export function requestHash(body: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(body))
    .digest("hex");
}

export async function reserveIdempotencyKey(
  client: PoolClient,
  key: string,
  scope: string,
  hash: string
): Promise<
  | { state: "RESERVED" }
  | { state: "REPLAY"; status: number; body: unknown }
> {
  const inserted = await client.query(
    `INSERT INTO idempotency_keys(key, scope, request_hash)
     VALUES ($1::uuid, $2, $3)
     ON CONFLICT (key) DO NOTHING
     RETURNING key`,
    [key, scope, hash]
  );

  if (inserted.rowCount === 1) return { state: "RESERVED" };

  const existing = await client.query<{
    scope: string;
    request_hash: string;
    response_status: number | null;
    response_body: unknown;
  }>(
    `SELECT scope, request_hash, response_status, response_body
     FROM idempotency_keys WHERE key = $1::uuid FOR UPDATE`,
    [key]
  );

  const row = existing.rows[0];
  if (!row) throw new Error("IDEMPOTENCY_STATE_CORRUPT");
  if (row.scope !== scope || row.request_hash !== hash) {
    throw new Error("IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST");
  }
  if (row.response_status === null) {
    throw new Error("IDEMPOTENCY_REQUEST_IN_PROGRESS");
  }
  return { state: "REPLAY", status: row.response_status, body: row.response_body };
}

export async function completeIdempotencyKey(
  client: PoolClient,
  key: string,
  status: number,
  body: unknown,
  resourceId: string
): Promise<void> {
  await client.query(
    `UPDATE idempotency_keys
     SET response_status = $2,
         response_body = $3::jsonb,
         resource_id = $4::uuid,
         completed_at = NOW()
     WHERE key = $1::uuid`,
    [key, status, JSON.stringify(body), resourceId]
  );
}
