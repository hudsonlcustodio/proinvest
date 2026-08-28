import { Router } from "express";
import { calculateEquityHolding } from "../../../../packages/domain/src/equity-holding.js";
import { createEquityHolding, getOperation, getPosition } from "../services/operation-service.js";

export const operationsRouter = Router();

operationsRouter.post("/preview", (req, res) => {
  try {
    const body = req.body;
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
