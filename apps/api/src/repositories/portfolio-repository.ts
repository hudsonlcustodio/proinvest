import type { PoolClient } from "pg";

export interface PortfolioRow {
 operation_id:string;strategy_id:string;account_id:string;template_type:string;template_version:number;status:string;closed_at:Date|null;
 invested_amount:string|null;operation_metadata:Record<string,unknown>;leg_id:string;instrument_id:string;symbol:string;side:"BUY"|"SELL";
 quantity:string|null;entry_price:string|null;exit_price:string|null;currency:string;contract_size:string|null;quotation_basis:string|null;settlement_currency:string|null;
 invested_capital:string|null;leverage:string|null;snapshot_id:string|null;current_position_value:string|null;unclaimed_fees:string|null;snapshot_currency:string|null;snapshot_observed_at:Date|null;
}
export async function listPortfolioRows(db:Pick<PoolClient,"query">):Promise<PortfolioRow[]>{
 const result=await db.query<PortfolioRow>(`
 SELECT o.id operation_id,o.strategy_id,o.account_id,o.template_type,o.template_version,o.status,o.closed_at,
  o.invested_amount::text,o.metadata operation_metadata,l.id leg_id,l.instrument_id,i.symbol,l.side,l.quantity::text,
  l.entry_price::text,l.exit_price::text,l.currency,i.contract_size::text,i.quotation_basis::text,i.settlement_currency,
  l.invested_capital::text,l.leverage::text,s.id snapshot_id,s.current_position_value::text,s.unclaimed_fees::text,
  s.currency snapshot_currency,s.observed_at snapshot_observed_at
 FROM operations o JOIN operation_legs l ON l.operation_id=o.id JOIN instruments i ON i.id=l.instrument_id
 LEFT JOIN LATERAL (SELECT d.id,d.current_position_value,d.unclaimed_fees,d.currency,d.observed_at FROM defi_lp_snapshots d WHERE d.operation_id=o.id ORDER BY d.observed_at DESC,d.recorded_at DESC,d.id DESC LIMIT 1) s ON TRUE
 WHERE (o.status='OPEN' AND o.template_type IN ('EQUITY_HOLDING','CRYPTO_SPOT','EQUITY_PAIR','DEFI_LP'))
    OR (o.status='CLOSED' AND o.template_type IN ('FUTURES_ROUND_TRIP','CRYPTO_DERIVATIVE'))
 ORDER BY o.id,l.id`);
 return result.rows;
}
