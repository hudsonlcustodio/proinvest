export interface OperationPreviewRequest {
 strategyId:string; accountId:string;
 template:{type:"EQUITY_HOLDING";version:1}; openedAt:string;
 legs:Array<{instrumentId:string;side:"BUY"|"SELL";quantity:string;entryPrice:string;currency:string}>;
}
