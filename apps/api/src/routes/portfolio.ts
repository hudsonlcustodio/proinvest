import { Router } from "express";
import { getPortfolioSummary,getPortfolioPositions,getHistoricalResults } from "../services/portfolio-service.js";

export const portfolioRouter=Router();
function filters(query:Record<string,unknown>){const result:{strategyId?:string;accountId?:string;currency?:string;kind?:string}={};for(const key of["strategyId","accountId","currency","kind"]as const)if(typeof query[key]==="string")result[key]=query[key];return result;}
portfolioRouter.get("/",async(req,res,next)=>{try{return res.json(await getPortfolioSummary(filters(req.query)));}catch(error){next(error);}});
portfolioRouter.get("/positions",async(req,res,next)=>{try{return res.json(await getPortfolioPositions(filters(req.query)));}catch(error){next(error);}});
portfolioRouter.get("/historical-results",async(req,res,next)=>{try{return res.json(await getHistoricalResults(filters(req.query)));}catch(error){next(error);}});
