import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { withTransaction } from "../db/transaction.js";
import { connectorRegistry } from "./connector-registry.js";
import { CredentialSecretStore } from "./credential-secret-store.js";
import {
  createConnection, listConnections, findConnection, upsertSecret, revokeSecret,
  createSyncRun, completeSyncRun, failSyncRun, listSyncRuns, insertStaging,
  listStaging, findStaging, resolveStaging, markStaging
} from "../repositories/connections-repository.js";
import { createEquityHoldingInTransaction } from "./operation-service.js";
import { validateImportRow } from "./import-validation.js";

const allowed = ["external_id", "strategy_code", "account_name", "symbol", "side", "quantity", "entry_price", "currency", "opened_at"] as const;
type SourceRow = Record<string, string>;
type ReferenceIds = { strategyId: string | null; instrumentId: string | null; accountId: string | null };

function safeRow(row: SourceRow): SourceRow {
  const result: SourceRow = {};
  for (const key of allowed) {
    const value = row[key] ?? "";
    const max = key === "symbol" ? 80 : key === "strategy_code" ? 50 : key === "account_name" ? 160 : key === "currency" ? 12 : 255;
    if (value.length > max) throw new Error("INVALID_FIELD_LENGTH");
    result[key] = value;
  }
  return result;
}

function fingerprintUuid(hex: string) {
  const chars = hex.slice(0, 32).split("");
  chars[12] = "5";
  chars[16] = ((Number.parseInt(chars[16]!, 16) & 3) | 8).toString(16);
  const value = chars.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

async function resolveReferences(db: PoolClient, row: SourceRow): Promise<{ ids: ReferenceIds; issues: string[] }> {
  const issues: string[] = [];
  const strategies = await db.query<{ id: string; template_type: string; template_version: number }>(
    `SELECT id,template_type,template_version FROM strategies WHERE code=$1 AND status='ACTIVE'`, [row.strategy_code || null]);
  const instruments = await db.query<{ id: string; currency: string; asset_class: string }>(
    `SELECT id,currency,asset_class FROM instruments WHERE symbol=$1 AND status='ACTIVE'`, [row.symbol || null]);
  const accounts = await db.query<{ id: string }>(
    `SELECT id FROM accounts WHERE name=$1 AND status='ACTIVE'`, [row.account_name || null]);
  const strategy = strategies.rows[0];
  const compatible = instruments.rows.filter(x => x.asset_class === "EQUITY" && x.currency.toUpperCase() === row.currency?.toUpperCase());
  if (!strategy || strategy.template_type !== "EQUITY_HOLDING" || strategy.template_version !== 1) issues.push("STRATEGY_RECONCILIATION_REQUIRED");
  if (compatible.length !== 1) issues.push("INSTRUMENT_RECONCILIATION_REQUIRED");
  if (accounts.rows.length !== 1) issues.push("ACCOUNT_RECONCILIATION_REQUIRED");
  return {
    ids: { strategyId: issues.includes("STRATEGY_RECONCILIATION_REQUIRED") ? null : strategy!.id,
      instrumentId: compatible.length === 1 ? compatible[0]!.id : null,
      accountId: accounts.rows.length === 1 ? accounts.rows[0]!.id : null },
    issues
  };
}

async function assertSelectedReferences(db: PoolClient, normalized: Record<string, string | null>, input: { strategyId: string; instrumentId: string; accountId: string }) {
  const s = await db.query<{ template_type: string; template_version: number }>(`SELECT template_type,template_version FROM strategies WHERE id=$1 AND status='ACTIVE' FOR SHARE`, [input.strategyId]);
  const i = await db.query<{ symbol: string; currency: string; asset_class: string }>(`SELECT symbol,currency,asset_class FROM instruments WHERE id=$1 AND status='ACTIVE' FOR SHARE`, [input.instrumentId]);
  const a = await db.query(`SELECT 1 FROM accounts WHERE id=$1 AND status='ACTIVE' FOR SHARE`, [input.accountId]);
  if (s.rows[0]?.template_type !== "EQUITY_HOLDING" || s.rows[0]?.template_version !== 1 ||
    i.rows[0]?.asset_class !== "EQUITY" || i.rows[0]?.symbol !== normalized.symbol ||
    i.rows[0]?.currency.toUpperCase() !== normalized.currency || !a.rowCount)
    throw new Error("INVALID_RECONCILIATION_REFERENCE");
}

export const providers = () => connectorRegistry.list();
export const connections = () => withTransaction(listConnections);
export async function addConnection(input: { providerKey: string; displayName: string }) {
  if (!input || typeof input.providerKey !== "string" || typeof input.displayName !== "string" || !input.displayName.trim() || input.displayName.length > 160)
    throw new Error("INVALID_CONNECTION_REQUEST");
  const connector = connectorRegistry.get(input.providerKey);
  if (!connector || !connector.provider.available) throw new Error("PROVIDER_NOT_AVAILABLE");
  const id = await withTransaction(db => createConnection(db, { providerKey: connector.provider.key, displayName: input.displayName.trim(), capabilities: connector.provider.capabilities }));
  return { id, providerKey: connector.provider.key, readOnly: true };
}
export async function testConnection(id: string) {
  return withTransaction(async db => {
    const connection = await findConnection(db, id);
    if (!connection || connection.status !== "ACTIVE") throw new Error("CONNECTION_NOT_FOUND");
    const connector = connectorRegistry.get(connection.provider_key);
    if (!connector) throw new Error("PROVIDER_NOT_AVAILABLE");
    return connector.testConnection();
  });
}
export async function storeCredential(id: string, secret: string) {
  const encrypted = CredentialSecretStore.fromEnvironment().encrypt(secret);
  await withTransaction(async db => { if (!await findConnection(db, id)) throw new Error("CONNECTION_NOT_FOUND"); await upsertSecret(db, id, encrypted); });
  return { stored: true };
}
export async function destroyCredential(id: string) { return { revoked: await withTransaction(db => revokeSecret(db, id)) }; }

export async function importCsv(id: string, input: { filename: string; content: string }) {
  if (!input || typeof input.filename !== "string" || typeof input.content !== "string") throw new Error("INVALID_IMPORT_REQUEST");
  const connection = await withTransaction(db => findConnection(db, id));
  if (!connection || connection.status !== "ACTIVE") throw new Error("CONNECTION_NOT_FOUND");
  const connector = connectorRegistry.get(connection.provider_key);
  if (!connector) throw new Error("PROVIDER_NOT_AVAILABLE");
  const runId = await withTransaction(db => createSyncRun(db, id));
  try {
    const rows = await connector.fetchRecords(input);
    const counters = await withTransaction(async db => {
      const counts = { ready: 0, pending: 0, duplicate: 0, rejected: 0 };
      for (const raw of rows) {
        const sanitized = safeRow(raw);
        const issues = validateImportRow(sanitized);
        const normalized = { externalId: sanitized.external_id || null, strategyCode: sanitized.strategy_code || null,
          accountName: sanitized.account_name || null, symbol: sanitized.symbol || null, side: sanitized.side || null,
          quantity: sanitized.quantity || null, entryPrice: sanitized.entry_price || null,
          currency: sanitized.currency?.toUpperCase() || null, openedAt: sanitized.opened_at || null };
        const fingerprint = createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
        const references = issues.length ? { ids: { strategyId: null, instrumentId: null, accountId: null }, issues: [] } : await resolveReferences(db, sanitized);
        issues.push(...references.issues);
        const status = issues.some(x => !x.endsWith("_RECONCILIATION_REQUIRED")) ? "REJECTED" : issues.length ? "PENDING" : "READY";
        const inserted = await insertStaging(db, { connectionId: id, syncRunId: runId, externalId: sanitized.external_id || null,
          fingerprint, sanitized, normalized, issues, strategyId: references.ids.strategyId,
          instrumentId: references.ids.instrumentId, accountId: references.ids.accountId, status });
        counts[inserted === "DUPLICATE" ? "duplicate" : status.toLowerCase() as "ready" | "pending" | "rejected"]++;
      }
      await completeSyncRun(db, runId, { fetched: rows.length, imported: 0, ...counts });
      await db.query(`UPDATE connections SET last_sync_at=NOW(),updated_at=NOW() WHERE id=$1`, [id]);
      return counts;
    });
    console.info("connection_sync", { runId, status: "COMPLETED", fetched: rows.length, ...counters });
    return { syncRunId: runId, fetched: rows.length, ...counters };
  } catch (error) {
    const code = error instanceof Error && error.message === "EXTERNAL_ID_CONFLICT" ? "EXTERNAL_ID_CONFLICT" : "IMPORT_FAILED";
    await withTransaction(db => failSyncRun(db, runId, code));
    console.warn("connection_sync", { runId, status: "FAILED", errorCode: code });
    throw error;
  }
}
export const syncRuns = () => withTransaction(listSyncRuns);
export const staging = () => withTransaction(listStaging);

export async function reconcile(id: string, input: { strategyId: string; instrumentId: string; accountId: string }) {
  if (!input || ![input.strategyId, input.instrumentId, input.accountId].every(x => typeof x === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x)))
    throw new Error("INVALID_RECONCILIATION_REFERENCE");
  return withTransaction(async db => {
    const item = await findStaging(db, id);
    if (!item || item.status !== "PENDING") throw new Error("STAGING_NOT_ACTIONABLE");
    if (validateImportRow(item.sanitized_source).length) throw new Error("INVALID_STAGING_RECORD");
    await assertSelectedReferences(db, item.normalized, input);
    const resolved = await resolveStaging(db, id, input);
    console.info("connection_reconciliation", { stagingId: id, status: "READY", resolved });
    return { resolved };
  });
}

export async function promote(id: string) {
  return withTransaction(async db => {
    const item = await findStaging(db, id);
    if (!item || item.status !== "READY" || !item.strategy_id || !item.instrument_id || !item.account_id)
      throw new Error("STAGING_NOT_READY");
    if (validateImportRow(item.sanitized_source).length) throw new Error("INVALID_STAGING_RECORD");
    await assertSelectedReferences(db, item.normalized, { strategyId: item.strategy_id, instrumentId: item.instrument_id, accountId: item.account_id });
    const n = item.normalized;
    const scopedFingerprint = createHash("sha256").update(`${item.connection_id}:${item.fingerprint}`).digest("hex");
    const result = await createEquityHoldingInTransaction(db, {
      strategyId: item.strategy_id, accountId: item.account_id, instrumentId: item.instrument_id,
      openedAt: n.openedAt, side: n.side, quantity: n.quantity, entryPrice: n.entryPrice, currency: n.currency
    }, fingerprintUuid(scopedFingerprint), { sourceType: "FILE_IMPORT", sourceId: item.connection_id, externalId: item.external_id ?? undefined });
    const operationId = (result.body as { id: string }).id;
    await markStaging(db, id, "IMPORTED", "READY", operationId);
    console.info("connection_reconciliation", { stagingId: id, status: "IMPORTED", operationId });
    return { operationId, status: "IMPORTED" };
  });
}
export async function reject(id: string) {
  return withTransaction(async db => {
    const item = await findStaging(db, id);
    if (!item || !["PENDING", "READY"].includes(item.status)) throw new Error("STAGING_NOT_ACTIONABLE");
    await markStaging(db, id, "REJECTED", item.status);
    console.info("connection_reconciliation", { stagingId: id, status: "REJECTED" });
    return { status: "REJECTED" };
  });
}
