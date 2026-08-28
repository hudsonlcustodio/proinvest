export type MetricStatus = "AVAILABLE"|"INCOMPLETE"|"NOT_APPLICABLE"|"STALE"|"UNRECONCILED";
export type MoneyMetric =
 | {status:"AVAILABLE"; value:string; currency:string}
 | {status:Exclude<MetricStatus,"AVAILABLE">; value:null; reason:string};
