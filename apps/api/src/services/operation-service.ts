import type { PoolClient } from "pg";
import { calculateEquityHolding } from "../../../../packages/domain/src/equity-holding.js";
import { calculateEquityPair } from "../../../../packages/domain/src/equity-pair.js";
import { findStrategyById } from "../repositories/strategy-repository.js";
import { insertEquityHolding, insertEquityPair, findOperationById, findPosition } from "../repositories/operation-repository.js";
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

export async function getOperation(operationId: string) {
  return withTransaction((client) => findOperationById(client, operationId));
}

export async function getPosition(accountId: string, instrumentId: string) {
  return withTransaction((client) => findPosition(client, accountId, instrumentId));
}
