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

export interface ReferenceRecord { id: string; name: string; symbol?: string; currency?: string; productCode?: string|null; contractSize?: string|null; contractSizeCurrency?: string|null; quotationBasis?: string|null; quotationCurrency?: string|null; settlementCurrency?: string|null; minimumPriceIncrement?: string|null; standardLot?: string|null }

export async function listAccounts(db: Queryable): Promise<ReferenceRecord[]> {
  const result = await db.query<{id:string;name:string}>(`SELECT id, name FROM accounts WHERE status = 'ACTIVE' ORDER BY name`);
  return result.rows;
}

export async function listInstruments(db: Queryable): Promise<ReferenceRecord[]> {
  const result = await db.query<{id:string;symbol:string;name:string|null;currency:string;product_code:string|null;contract_size:string|null;contract_size_currency:string|null;quotation_basis:string|null;quotation_currency:string|null;settlement_currency:string|null;minimum_price_increment:string|null;standard_lot:string|null}>(`SELECT id, symbol, name, currency, product_code, contract_size::text, contract_size_currency, quotation_basis::text, quotation_currency, settlement_currency, minimum_price_increment::text, standard_lot::text FROM instruments WHERE status = 'ACTIVE' ORDER BY symbol`);
  return result.rows.map((row) => ({ id: row.id, name: row.name ?? row.symbol, symbol: row.symbol, currency: row.currency, productCode:row.product_code, contractSize:row.contract_size, contractSizeCurrency:row.contract_size_currency, quotationBasis:row.quotation_basis, quotationCurrency:row.quotation_currency, settlementCurrency:row.settlement_currency, minimumPriceIncrement:row.minimum_price_increment, standardLot:row.standard_lot }));
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
