import { Decimal } from "decimal.js";
import type { AggregateMoneyMetric, Coverage } from "../../contracts/src/portfolio.js";

export type CurrentPositionClassification="EQUITY_HOLDING"|"SPOT_HOLDING"|"PAIR_EXPOSURE"|"DEFI_LP"|"NONE_CURRENT_POSITION";
export function classifyCurrentPosition(input:{templateType:string;templateVersion:number;status:string}):CurrentPositionClassification{
 if(input.templateVersion!==1)return"NONE_CURRENT_POSITION";
 if(input.status==="OPEN"){
  if(input.templateType==="EQUITY_HOLDING")return"EQUITY_HOLDING";
  if(input.templateType==="CRYPTO_SPOT")return"SPOT_HOLDING";
  if(input.templateType==="EQUITY_PAIR")return"PAIR_EXPOSURE";
  if(input.templateType==="DEFI_LP")return"DEFI_LP";
 }
 return"NONE_CURRENT_POSITION";
}
export function coverage(totalComponents:number,availableComponents:number):Coverage{
 if(!Number.isInteger(totalComponents)||!Number.isInteger(availableComponents)||totalComponents<0||availableComponents<0||availableComponents>totalComponents)throw new Error("INVALID_COVERAGE");
 return{totalComponents,availableComponents,missingComponents:totalComponents-availableComponents};
}
export function aggregateMoney(inputs:Array<{status:"AVAILABLE";value:string;currency:string}|{status:"MISSING";currency:string}>,currency:string,reason:string):AggregateMoneyMetric{
 const normalized=currency.toUpperCase();
 if(inputs.some((item)=>item.currency.toUpperCase()!==normalized))throw new Error("CURRENCY_MISMATCH");
 const available=inputs.filter((item):item is {status:"AVAILABLE";value:string;currency:string}=>item.status==="AVAILABLE");
 const sum=available.reduce((total,item)=>total.plus(new Decimal(item.value)),new Decimal(0)).toString();
 const resultCoverage=coverage(inputs.length,available.length);
 if(resultCoverage.missingComponents===0)return{status:"AVAILABLE",value:sum,currency:normalized,coverage:resultCoverage};
 return{status:"INCOMPLETE",knownValue:sum,currency:normalized,reason,coverage:resultCoverage};
}
