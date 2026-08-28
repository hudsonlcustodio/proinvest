import type { Pool, PoolClient } from "pg";

type Queryable = Pick<Pool, "query"> | Pick<PoolClient, "query">;

export interface StrategyRecord {
  id: string;
  code: string;
  name: string;
  category: string;
  providerName: string | null;
  templateType: string;
  templateVersion: number;
  status: "ACTIVE" | "ARCHIVED";
}

export interface ReferenceRecord { id: string; name: string; symbol?: string; currency?: string }

export async function listAccounts(db: Queryable): Promise<ReferenceRecord[]> {
  const result = await db.query<{id:string;name:string}>(`SELECT id, name FROM accounts WHERE status = 'ACTIVE' ORDER BY name`);
  return result.rows;
}

export async function listInstruments(db: Queryable): Promise<ReferenceRecord[]> {
  const result = await db.query<{id:string;symbol:string;name:string|null;currency:string}>(`SELECT id, symbol, name, currency FROM instruments WHERE status = 'ACTIVE' ORDER BY symbol`);
  return result.rows.map((row) => ({ id: row.id, name: row.name ?? row.symbol, symbol: row.symbol, currency: row.currency }));
}

export async function listStrategies(db: Queryable): Promise<StrategyRecord[]> {
  const result = await db.query<{
    id: string;
    code: string;
    name: string;
    category: string;
    provider_name: string | null;
    template_type: string;
    template_version: number;
    status: "ACTIVE" | "ARCHIVED";
  }>(`
    SELECT id, code, name, category, provider_name, template_type, template_version, status
    FROM strategies
    WHERE status = 'ACTIVE'
    ORDER BY code
  `);

  return result.rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    providerName: row.provider_name,
    templateType: row.template_type,
    templateVersion: row.template_version,
    status: row.status
  }));
}

export async function findStrategyById(
  db: Queryable,
  id: string
): Promise<StrategyRecord | null> {
  const result = await db.query<{
    id: string;
    code: string;
    name: string;
    category: string;
    provider_name: string | null;
    template_type: string;
    template_version: number;
    status: "ACTIVE" | "ARCHIVED";
  }>(`
    SELECT id, code, name, category, provider_name, template_type, template_version, status
    FROM strategies
    WHERE id = $1
  `, [id]);

  const row = result.rows[0];
  return row ? {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    providerName: row.provider_name,
    templateType: row.template_type,
    templateVersion: row.template_version,
    status: row.status
  } : null;
}
