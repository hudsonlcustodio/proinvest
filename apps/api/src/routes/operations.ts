import { Router } from "express";
import { calculateEquityHolding } from "../../../../packages/domain/src/equity-holding.js";
import { calculateEquityPair } from "../../../../packages/domain/src/equity-pair.js";
import { calculateFuturesRoundTrip } from "../../../../packages/domain/src/futures-round-trip.js";
import { calculateCryptoSpot } from "../../../../packages/domain/src/crypto-spot.js";
import { calculateCryptoDerivative } from "../../../../packages/domain/src/crypto-derivative.js";
import { calculateDefiLp } from "../../../../packages/domain/src/defi-lp.js";
import { createEquityHolding, createEquityPair, createFuturesRoundTrip, createCryptoSpot, createCryptoDerivative, createDefiLp, createDefiLpSnapshot, getDefiLpMetrics, getDefiLpSnapshotHistory, getOperation, getPosition } from "../services/operation-service.js";
import { pool } from "../db/pool.js";
import { findFuturesInstrument } from "../repositories/operation-repository.js";

export const operationsRouter = Router();

operationsRouter.post("/preview", async (req, res) => {
  try {
    const body = req.body;
    if(body?.template?.type==="CRYPTO_SPOT"&&body?.template?.version===1){if(body.side!=="BUY")return res.status(422).json({type:"validation_error",status:422,code:"UNSUPPORTED_SIDE"});return res.json({valid:true,metrics:calculateCryptoSpot({quantity:body.quantity,unitPrice:body.unitPrice,currency:body.currency}),warnings:[]});}
    if(body?.template?.type==="CRYPTO_DERIVATIVE"&&body?.template?.version===1){if(body.side!=="BUY"&&body.side!=="SELL")return res.status(422).json({type:"validation_error",status:422,code:"INVALID_SIDE"});return res.json({valid:true,metrics:calculateCryptoDerivative({investedCapital:body.investedCapital,leverage:body.leverage,entryPrice:body.entryPrice,exitPrice:body.exitPrice,side:body.side,currency:body.currency}),warnings:[]});}
    if(body?.template?.type==="DEFI_LP"&&body?.template?.version===1)return res.json({valid:true,metrics:calculateDefiLp({investedAmount:body.investedAmount,currentPositionValue:body.currentPositionValue,unclaimedFees:body.unclaimedFees,currency:body.currency,investedCurrency:body.investedCurrency,currentPositionValueCurrency:body.currentPositionValueCurrency,unclaimedFeesCurrency:body.unclaimedFeesCurrency}),warnings:[]});
    if (body?.template?.type === "FUTURES_ROUND_TRIP" && body?.template?.version === 1) { const instrument=await findFuturesInstrument(pool,body.instrumentId); if(!instrument||!instrument.contract_size||!instrument.quotation_basis) return res.status(422).json({type:"validation_error",status:422,code:"FUTURES_METADATA_MISSING"}); return res.json({valid:true,metrics:calculateFuturesRoundTrip({...body,instrument:{contractSize:instrument.contract_size,quotationBasis:instrument.quotation_basis,settlementCurrency:instrument.settlement_currency}}),warnings:[]}); }
    if (body?.template?.type === "EQUITY_PAIR" && body?.template?.version === 1) return res.json({valid:true,metrics:calculateEquityPair(body.legs),warnings:[]});
    if (body?.template?.type !== "EQUITY_HOLDING" || body?.template?.version !== 1) {
      return res.status(422).json({type:"validation_error",status:422,code:"UNSUPPORTED_TEMPLATE"});
    }
    if (!Array.isArray(body.legs) || body.legs.length !== 1 || !body.legs[0]) {
      return res.status(422).json({type:"validation_error",status:422,code:"INVALID_LEGS"});
    }
    const leg = body.legs[0];
    if (leg.side !== "BUY") return res.status(422).json({type:"validation_error",status:422,code:"UNSUPPORTED_OPERATION_SIDE"});
    return res.json({
      valid:true,
      metrics:calculateEquityHolding({
        quantity:leg.quantity, entryPrice:leg.entryPrice, currency:leg.currency
      }),
      warnings:[]
    });
  } catch (error) {
    return res.status(422).json({
      type:"validation_error",status:422,code:"INVALID_FINANCIAL_INPUT",
      detail:error instanceof Error ? error.message : "Invalid input"
    });
  }
});

operationsRouter.post("/", async (req, res, next) => {
  try {
    const key = req.header("Idempotency-Key");
    if (!key) {
      return res.status(400).json({
        type:"validation_error",status:400,code:"IDEMPOTENCY_KEY_REQUIRED"
      });
    }

    const body=req.body;
    if(body?.template?.type==="CRYPTO_SPOT"&&body?.template?.version===1){if(body.side!=="BUY")return res.status(422).json({type:"validation_error",status:422,code:"UNSUPPORTED_SIDE"});const result=await createCryptoSpot({strategyId:body.strategyId,accountId:body.accountId,instrumentId:body.instrumentId,side:"BUY",quantity:body.quantity,unitPrice:body.unitPrice,currency:body.currency,openedAt:body.openedAt},key);return res.status(result.statusCode).json(result.body);}
    if(body?.template?.type==="CRYPTO_DERIVATIVE"&&body?.template?.version===1){if(body.side!=="BUY"&&body.side!=="SELL")return res.status(422).json({type:"validation_error",status:422,code:"INVALID_SIDE"});const result=await createCryptoDerivative({strategyId:body.strategyId,accountId:body.accountId,instrumentId:body.instrumentId,side:body.side,investedCapital:body.investedCapital,leverage:body.leverage,entryPrice:body.entryPrice,exitPrice:body.exitPrice,currency:body.currency,openedAt:body.openedAt,closedAt:body.closedAt??body.openedAt},key);return res.status(result.statusCode).json(result.body);}
    if(body?.template?.type==="DEFI_LP"&&body?.template?.version===1){if(!Array.isArray(body.componentInstrumentIds)||body.componentInstrumentIds.length!==2)return res.status(422).json({type:"validation_error",status:422,code:"INVALID_LP_COMPONENTS"});const result=await createDefiLp({strategyId:body.strategyId,accountId:body.accountId,componentInstrumentIds:body.componentInstrumentIds,investedAmount:body.investedAmount,currency:body.currency,openedAt:body.openedAt},key);return res.status(result.statusCode).json(result.body);}
    if(body?.template?.type === "FUTURES_ROUND_TRIP" && body?.template?.version === 1) { const result=await createFuturesRoundTrip({strategyId:body.strategyId,accountId:body.accountId,instrumentId:body.instrumentId,openingSide:body.openingSide,contracts:body.contracts,entryPrice:body.entryPrice,exitPrice:body.exitPrice,currency:body.currency,openedAt:body.openedAt,closedAt:body.closedAt ?? body.openedAt},key); return res.status(result.statusCode).json(result.body); }
    if(body?.template?.type === "EQUITY_PAIR" && body?.template?.version === 1) {
      try { calculateEquityPair(body.legs); } catch (error) { return res.status(422).json({type:"validation_error",status:422,code:error instanceof Error ? error.message : "INVALID_PAIR"}); }
      const result = await createEquityPair({strategyId:body.strategyId,accountId:body.accountId,openedAt:body.openedAt,legs:body.legs},key);
      return res.status(result.statusCode).json(result.body);
    }
    if(body?.template?.type!=="EQUITY_HOLDING" || body?.template?.version!==1)
      return res.status(422).json({type:"validation_error",status:422,code:"UNSUPPORTED_TEMPLATE"});
    if(!Array.isArray(body.legs) || body.legs.length!==1 || !body.legs[0])
      return res.status(422).json({type:"validation_error",status:422,code:"INVALID_LEGS"});

    const leg=body.legs[0];
    if (leg.side !== "BUY") return res.status(422).json({type:"validation_error",status:422,code:"UNSUPPORTED_OPERATION_SIDE"});
    const result=await createEquityHolding({
      strategyId:body.strategyId, accountId:body.accountId,
      instrumentId:leg.instrumentId, openedAt:body.openedAt,
      side:leg.side, quantity:leg.quantity,
      entryPrice:leg.entryPrice, currency:leg.currency
    }, key);

    return res.status(result.statusCode).json(result.body);
  } catch(error) {
    if(error instanceof Error) {
      const statusByCode: Record<string, number> = {
        STRATEGY_NOT_FOUND_OR_INACTIVE:422,
        STRATEGY_TEMPLATE_MISMATCH:422,
        INVALID_INSTRUMENT:422,
        INVALID_SIDE:422,
        INVALID_LP_COMPONENTS:422,
        INVALID_LP_OPERATION:422,
        IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST:409,
        IDEMPOTENCY_REQUEST_IN_PROGRESS:409
      };
      const status=statusByCode[error.message];
      if(status) return res.status(status).json({
        type:"validation_error",status,code:error.message
      });
    }
    next(error);
  }
});

operationsRouter.get("/position/:accountId/:instrumentId", async (req,res,next)=>{
  try {
    const position = await getPosition(req.params.accountId, req.params.instrumentId);
    if (!position) return res.status(404).json({type:"not_found",status:404,code:"POSITION_NOT_FOUND"});
    return res.json(position);
  } catch (error) { next(error); }
});

operationsRouter.post("/:id/snapshots", async (req,res,next)=>{try{const key=req.header("Idempotency-Key");if(!key)return res.status(400).json({type:"validation_error",status:400,code:"IDEMPOTENCY_KEY_REQUIRED"});const result=await createDefiLpSnapshot(req.params.id,{currentPositionValue:req.body.currentPositionValue,unclaimedFees:req.body.unclaimedFees,currency:req.body.currency,observedAt:req.body.observedAt??new Date().toISOString()},key);return res.status(result.statusCode).json(result.body);}catch(error){if(error instanceof Error&&error.message==="INVALID_LP_OPERATION")return res.status(422).json({type:"validation_error",status:422,code:error.message});next(error);}});

operationsRouter.get("/:id/snapshots", async (req,res,next)=>{try{return res.json({items:await getDefiLpSnapshotHistory(req.params.id)});}catch(error){next(error);}});
operationsRouter.get("/:id/metrics", async (req,res,next)=>{try{const metrics=await getDefiLpMetrics(req.params.id);if(!metrics)return res.status(404).json({type:"not_found",status:404,code:"LP_SNAPSHOT_NOT_FOUND"});return res.json(metrics);}catch(error){next(error);}});

operationsRouter.get("/:id", async (req,res,next)=>{
  try {
    const operation=await getOperation(req.params.id);
    if(!operation) return res.status(404).json({
      type:"not_found",status:404,code:"OPERATION_NOT_FOUND"
    });
    return res.json(operation);
  } catch(error) {
    next(error);
  }
});
