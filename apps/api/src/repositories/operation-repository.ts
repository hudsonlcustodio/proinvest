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
    instrument_id: string;
    symbol: string;
    side: "BUY" | "SELL";
    quantity: string;
    entry_price: string;
    currency: string;
    opened_at: Date;
  }>(`
    SELECT
      o.id, o.status, o.strategy_id, s.name AS strategy_name,
      l.instrument_id, i.symbol, l.side,
      l.quantity::text, l.entry_price::text, l.currency, o.opened_at
    FROM operations o
    JOIN strategies s ON s.id = o.strategy_id
    JOIN operation_legs l ON l.operation_id = o.id
    JOIN instruments i ON i.id = l.instrument_id
    WHERE o.id = $1
  `, [operationId]);

  return result.rows[0] ?? null;
}
