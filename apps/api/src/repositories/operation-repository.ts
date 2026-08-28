import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

export interface CreateEquityHoldingRecord {
  strategyId: string;
  accountId: string;
  instrumentId: string;
  openedAt: string;
  side: "BUY" | "SELL";
  quantity: string;
  entryPrice: string;
  currency: string;
  sourceType: "MANUAL";
}

export interface CreateEquityPairRecord { strategyId:string; accountId:string; openedAt:string; legs:Array<{instrumentId:string;side:"BUY"|"SELL";quantity:string;entryPrice:string;currency:string}>; sourceType:"MANUAL" }

export async function insertEquityPair(db: PoolClient, input: CreateEquityPairRecord): Promise<string> {
  const operationId = randomUUID();
  await db.query(`INSERT INTO operations (id,strategy_id,account_id,template_type,template_version,operation_type,status,opened_at,source_type) VALUES ($1,$2,$3,'EQUITY_PAIR',1,'PAIR','OPEN',$4,$5)`, [operationId,input.strategyId,input.accountId,input.openedAt,input.sourceType]);
  for (const leg of input.legs) await db.query(`INSERT INTO operation_legs (id,operation_id,instrument_id,side,quantity,entry_price,currency) VALUES ($1,$2,$3,$4,$5::numeric,$6::numeric,$7)`, [randomUUID(),operationId,leg.instrumentId,leg.side,leg.quantity,leg.entryPrice,leg.currency.toUpperCase()]);
  return operationId;
}

export async function insertEquityHolding(
  db: PoolClient,
  input: CreateEquityHoldingRecord
): Promise<string> {
  const operationId = randomUUID();
  const legId = randomUUID();

  await db.query(`
    INSERT INTO operations (
      id, strategy_id, account_id, template_type, template_version,
      operation_type, status, opened_at, source_type
    ) VALUES ($1, $2, $3, 'EQUITY_HOLDING', 1, 'HOLDING', 'OPEN', $4, $5)
  `, [
    operationId,
    input.strategyId,
    input.accountId,
    input.openedAt,
    input.sourceType
  ]);

  await db.query(`
    INSERT INTO operation_legs (
      id, operation_id, instrument_id, side, quantity, entry_price, currency
    ) VALUES ($1, $2, $3, $4, $5::numeric, $6::numeric, $7)
  `, [
    legId,
    operationId,
    input.instrumentId,
    input.side,
    input.quantity,
    input.entryPrice,
    input.currency.toUpperCase()
  ]);

  return operationId;
}


export async function findOperationById(
  db: PoolClient,
  operationId: string
) {
  const result = await db.query<{
    id: string;
    status: string;
    strategy_id: string;
    strategy_name: string;
    template_type: string;
    template_version: number;
    instrument_id: string;
    symbol: string;
    side: "BUY" | "SELL";
    quantity: string;
    entry_price: string;
    currency: string;
    opened_at: Date;
  }>(`
    SELECT
      o.id, o.status, o.strategy_id, s.name AS strategy_name, o.template_type, o.template_version,
      l.instrument_id, i.symbol, l.side,
      l.quantity::text, l.entry_price::text, l.currency, o.opened_at
    FROM operations o
    JOIN strategies s ON s.id = o.strategy_id
    JOIN operation_legs l ON l.operation_id = o.id
    JOIN instruments i ON i.id = l.instrument_id
    WHERE o.id = $1
  `, [operationId]);

  if (!result.rows[0]) return null;
  const first = result.rows[0];
  return { id:first.id, status:first.status, strategyId:first.strategy_id, strategyName:first.strategy_name, templateType:first.template_type, templateVersion:first.template_version, openedAt:first.opened_at, legs:result.rows.map((row) => ({ instrumentId:row.instrument_id, symbol:row.symbol, side:row.side, quantity:row.quantity, entryPrice:row.entry_price, currency:row.currency })) };
}

export async function findPosition(db: PoolClient, accountId: string, instrumentId: string) {
  const result = await db.query<{quantity:string;cost_basis:string;currency:string|null}>(`
    SELECT COALESCE(SUM(CASE WHEN l.side = 'BUY' THEN l.quantity ELSE -l.quantity END), 0)::text AS quantity,
           COALESCE(SUM(CASE WHEN l.side = 'BUY' THEN l.quantity * l.entry_price ELSE -l.quantity * l.entry_price END), 0)::text AS cost_basis,
           MAX(l.currency) AS currency
    FROM operations o JOIN operation_legs l ON l.operation_id = o.id
    WHERE o.account_id = $1 AND l.instrument_id = $2 AND o.status = 'OPEN'
  `, [accountId, instrumentId]);
  const row = result.rows[0];
  if (!row || row.currency === null) return null;
  return { accountId, instrumentId, quantity: row.quantity,
    costBasis: { status: "AVAILABLE" as const, value: row.cost_basis, currency: row.currency },
    marketValue: { status: "INCOMPLETE" as const, value: null, reason: "MISSING_CURRENT_VALUATION" },
    unrealizedPnl: { status: "INCOMPLETE" as const, value: null, reason: "MISSING_CURRENT_VALUATION" } };
}
