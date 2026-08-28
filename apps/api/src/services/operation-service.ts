import type { PoolClient } from "pg";
import { calculateEquityHolding } from "../../../../packages/domain/src/equity-holding.js";
import { calculateEquityPair } from "../../../../packages/domain/src/equity-pair.js";
import { calculateFuturesRoundTrip } from "../../../../packages/domain/src/futures-round-trip.js";
import { calculateCryptoSpot } from "../../../../packages/domain/src/crypto-spot.js";
import { calculateCryptoDerivative } from "../../../../packages/domain/src/crypto-derivative.js";
import { findStrategyById } from "../repositories/strategy-repository.js";
import { insertEquityHolding, insertEquityPair, insertFuturesRoundTrip, insertCryptoSpot, insertCryptoDerivative, findFuturesInstrument, findOperationById, findPosition } from "../repositories/operation-repository.js";
import { withTransaction } from "../db/transaction.js";
import {
  requestHash,
  reserveIdempotencyKey,
  completeIdempotencyKey
} from "./idempotency-service.js";

export interface CreateEquityHoldingCommand {
  strategyId: string;
  accountId: string;
  instrumentId: string;
  openedAt: string;
  side: "BUY" | "SELL";
  quantity: string;
  entryPrice: string;
  currency: string;
}

export async function createEquityHolding(
  command: CreateEquityHoldingCommand,
  idempotencyKey: string
) {
  const metrics = calculateEquityHolding({
    quantity: command.quantity,
    entryPrice: command.entryPrice,
    currency: command.currency
  });

  return withTransaction(async (client: PoolClient) => {
    const reservation = await reserveIdempotencyKey(
      client,
      idempotencyKey,
      "POST:/v1/operations",
      requestHash(command)
    );

    if (reservation.state === "REPLAY") {
      return { statusCode: reservation.status, body: reservation.body };
    }

    const strategy = await findStrategyById(client, command.strategyId);
    if (!strategy || strategy.status !== "ACTIVE") throw new Error("STRATEGY_NOT_FOUND_OR_INACTIVE");
    if (strategy.templateType !== "EQUITY_HOLDING" || strategy.templateVersion !== 1) {
      throw new Error("STRATEGY_TEMPLATE_MISMATCH");
    }

    const operationId = await insertEquityHolding(client, {
      ...command,
      sourceType: "MANUAL"
    });

    const body = {
      id: operationId,
      status: "OPEN",
      strategy: { id: strategy.id, name: strategy.name },
      metrics: { costBasis: metrics.grossAmount }
    };

    await completeIdempotencyKey(client, idempotencyKey, 201, body, operationId);
    return { statusCode: 201, body };
  });
}

export async function createEquityPair(command: {strategyId:string;accountId:string;openedAt:string;legs:Array<{instrumentId:string;side:"BUY"|"SELL";quantity:string;entryPrice:string;currency:string}>}, idempotencyKey:string) {
  const metrics = calculateEquityPair(command.legs);
  return withTransaction(async (client) => {
    const reservation = await reserveIdempotencyKey(client,idempotencyKey,"POST:/v1/operations",requestHash(command));
    if (reservation.state === "REPLAY") return {statusCode:reservation.status,body:reservation.body};
    const strategy = await findStrategyById(client,command.strategyId);
    if (!strategy || strategy.status !== "ACTIVE") throw new Error("STRATEGY_NOT_FOUND_OR_INACTIVE");
    if (strategy.templateType !== "EQUITY_PAIR" || strategy.templateVersion !== 1) throw new Error("STRATEGY_TEMPLATE_MISMATCH");
    const operationId = await insertEquityPair(client,{...command,sourceType:"MANUAL"});
    const body = {id:operationId,status:"OPEN",strategy:{id:strategy.id,name:strategy.name},template:{type:"EQUITY_PAIR",version:1},metrics};
    await completeIdempotencyKey(client,idempotencyKey,201,body,operationId);
    return {statusCode:201,body};
  });
}

export async function createFuturesRoundTrip(command:{strategyId:string;accountId:string;instrumentId:string;openingSide:"BUY"|"SELL";contracts:string;entryPrice:string;exitPrice:string;currency:string;openedAt:string;closedAt:string}, key:string) { return withTransaction(async (client)=>{const reservation=await reserveIdempotencyKey(client,key,"POST:/v1/operations",requestHash(command));if(reservation.state==="REPLAY")return {statusCode:reservation.status,body:reservation.body};const strategy=await findStrategyById(client,command.strategyId);if(!strategy||strategy.status!=="ACTIVE")throw new Error("STRATEGY_NOT_FOUND_OR_INACTIVE");if(strategy.templateType!=="FUTURES_ROUND_TRIP"||strategy.templateVersion!==1)throw new Error("STRATEGY_TEMPLATE_MISMATCH");const instrument=await findFuturesInstrument(client,command.instrumentId);if(!instrument||!instrument.contract_size||!instrument.quotation_basis)throw new Error("FUTURES_METADATA_MISSING");const metrics=calculateFuturesRoundTrip({instrument:{contractSize:instrument.contract_size,quotationBasis:instrument.quotation_basis,settlementCurrency:instrument.settlement_currency},openingSide:command.openingSide,contracts:command.contracts,entryPrice:command.entryPrice,exitPrice:command.exitPrice,currency:command.currency});const id=await insertFuturesRoundTrip(client,{...command,sourceType:"MANUAL"});const body={id,status:"CLOSED",strategy:{id:strategy.id,name:strategy.name},template:{type:"FUTURES_ROUND_TRIP",version:1},metrics};await completeIdempotencyKey(client,key,201,body,id);return {statusCode:201,body};}); }

export async function createCryptoSpot(command:{strategyId:string;accountId:string;instrumentId:string;side:"BUY";quantity:string;unitPrice:string;currency:string;openedAt:string},key:string){const metrics=calculateCryptoSpot(command);return withTransaction(async(client)=>{const reservation=await reserveIdempotencyKey(client,key,"POST:/v1/operations",requestHash(command));if(reservation.state==="REPLAY")return{statusCode:reservation.status,body:reservation.body};const strategy=await findStrategyById(client,command.strategyId);if(!strategy||strategy.status!=="ACTIVE")throw new Error("STRATEGY_NOT_FOUND_OR_INACTIVE");if(strategy.templateType!=="CRYPTO_SPOT"||strategy.templateVersion!==1)throw new Error("STRATEGY_TEMPLATE_MISMATCH");const instrument=await client.query(`SELECT id FROM instruments WHERE id=$1 AND status='ACTIVE' AND asset_class='CRYPTO'`,[command.instrumentId]);if(instrument.rowCount!==1)throw new Error("INVALID_INSTRUMENT");const id=await insertCryptoSpot(client,{...command,sourceType:"MANUAL"});const body={id,status:"OPEN",strategy:{id:strategy.id,name:strategy.name},template:{type:"CRYPTO_SPOT",version:1},metrics};await completeIdempotencyKey(client,key,201,body,id);return{statusCode:201,body};});}

export async function createCryptoDerivative(command:{strategyId:string;accountId:string;instrumentId:string;side:"BUY"|"SELL";investedCapital:string;leverage:string;entryPrice:string;exitPrice:string;currency:string;openedAt:string;closedAt:string},key:string){const metrics=calculateCryptoDerivative(command);const effectiveNotional=metrics.effectiveNotional.status==="AVAILABLE"?metrics.effectiveNotional.value:undefined;if(!effectiveNotional)throw new Error("INVALID_EFFECTIVE_NOTIONAL");return withTransaction(async(client)=>{const reservation=await reserveIdempotencyKey(client,key,"POST:/v1/operations",requestHash(command));if(reservation.state==="REPLAY")return{statusCode:reservation.status,body:reservation.body};const strategy=await findStrategyById(client,command.strategyId);if(!strategy||strategy.status!=="ACTIVE")throw new Error("STRATEGY_NOT_FOUND_OR_INACTIVE");if(strategy.templateType!=="CRYPTO_DERIVATIVE"||strategy.templateVersion!==1)throw new Error("STRATEGY_TEMPLATE_MISMATCH");const instrument=await client.query(`SELECT id FROM instruments WHERE id=$1 AND status='ACTIVE' AND asset_class='CRYPTO'`,[command.instrumentId]);if(instrument.rowCount!==1)throw new Error("INVALID_INSTRUMENT");const id=await insertCryptoDerivative(client,{...command,effectiveNotional,sourceType:"MANUAL"});const body={id,status:"CLOSED",strategy:{id:strategy.id,name:strategy.name},template:{type:"CRYPTO_DERIVATIVE",version:1},metrics};await completeIdempotencyKey(client,key,201,body,id);return{statusCode:201,body};});}

export async function getOperation(operationId: string) {
  return withTransaction((client) => findOperationById(client, operationId));
}

export async function getPosition(accountId: string, instrumentId: string) {
  return withTransaction((client) => findPosition(client, accountId, instrumentId));
}
