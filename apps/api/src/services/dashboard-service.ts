import { getPortfolioPositions, getPortfolioSummary } from "./portfolio-service.js";
import { buildAllocations, buildInsights } from "../../../../packages/domain/src/intelligence.js";
import type { DashboardSummary } from "../../../../packages/contracts/src/intelligence.js";
import { withTransaction } from "../db/transaction.js";
import { listStrategies } from "../repositories/strategy-repository.js";
export { buildAllocations, buildInsights } from "../../../../packages/domain/src/intelligence.js";
type Filters={strategyId?:string;accountId?:string;currency?:string;kind?:string};

async function getConnectionHealth(){return withTransaction(async db=>(await db.query<{active:number;pending:number;degraded:number;last_sync:Date|null}>(`SELECT (SELECT count(*)::int FROM connections WHERE status='ACTIVE') active,(SELECT count(*)::int FROM staging_records WHERE status IN('PENDING','READY')) pending,(SELECT count(*)::int FROM (SELECT DISTINCT ON (connection_id) connection_id,status FROM sync_runs ORDER BY connection_id,started_at DESC) latest WHERE status='FAILED') degraded,(SELECT max(last_sync_at) FROM connections WHERE status='ACTIVE') last_sync`)).rows[0]!)}

async function getLastMeaningfulUpdate(){return withTransaction(async db=>{const r=await db.query<{last_update:Date|null}>(`SELECT max(changed_at) last_update FROM (SELECT max(updated_at) changed_at FROM operations UNION ALL SELECT max(recorded_at) FROM defi_lp_snapshots UNION ALL SELECT max(recorded_at) FROM portfolio_valuation_snapshots) sources`);return r.rows[0]?.last_update?.toISOString()??null})}

async function getLeveragedExposureCount(filters:Filters){if(filters.kind)return 0;return withTransaction(async db=>{const r=await db.query<{count:number}>(`SELECT count(DISTINCT o.id)::int count FROM operations o JOIN operation_legs l ON l.operation_id=o.id WHERE o.status='CLOSED' AND o.template_type='CRYPTO_DERIVATIVE' AND l.leverage>1 AND ($1::uuid IS NULL OR o.strategy_id=$1) AND ($2::uuid IS NULL OR o.account_id=$2) AND ($3::text IS NULL OR upper(l.currency)=upper($3))`,[filters.strategyId??null,filters.accountId??null,filters.currency??null]);return r.rows[0]?.count??0})}

export async function getDashboard(filters:Filters={}):Promise<DashboardSummary>{
  const [portfolio,pos,strategies,dataHealth,lastMeaningfulDataUpdate,leveragedExposureCount]=await Promise.all([getPortfolioSummary(filters),getPortfolioPositions(filters),withTransaction(db=>listStrategies(db)),getConnectionHealth(),getLastMeaningfulUpdate(),getLeveragedExposureCount(filters)]);
  const positions=pos.items;
  const available=positions.filter(p=>(p.kind==="EQUITY_HOLDING"||p.kind==="SPOT_HOLDING")?p.marketValue.status==="AVAILABLE":p.kind==="DEFI_LP"?p.economicValue.status==="AVAILABLE":false).length;
  const strategyNames=new Map(strategies.map(x=>[x.id,x.name])),allocations=[...buildAllocations(positions,"STRATEGY"),...buildAllocations(positions,"POSITION_KIND")];
  for(const allocation of allocations)if(allocation.dimension==="STRATEGY")for(const item of allocation.items)item.label=strategyNames.get(item.key)??"Strategy sem nome";
  const base:DashboardSummary={asOf:portfolio.asOf,portfolio,activeStrategies:new Set(positions.map(p=>p.strategyId)).size,allocations,health:{valuationCoverage:{total:positions.length,available,missing:positions.length-available},missingValuationCount:positions.length-available,unreconciledCount:dataHealth.pending,degradedConnectionCount:dataHealth.degraded,leveragedExposureCount,multiCurrencyWithoutFx:portfolio.currencyBuckets.length>1,netPnlIncomplete:portfolio.currencyBuckets.some(x=>x.historicalNetPnl.status!=="AVAILABLE")},insights:[],positionsPreview:positions.slice(0,5),lastMeaningfulDataUpdate,pendingReconciliationCount:dataHealth.pending,connectionHealth:{active:dataHealth.active,degraded:dataHealth.degraded,lastSuccessfulSyncAt:dataHealth.last_sync?.toISOString()??null}};
  base.insights=buildInsights(base);return base;
}
