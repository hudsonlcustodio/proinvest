import { Router } from "express";
import { pool } from "../db/pool.js";
import { listStrategies, listAccounts, listInstruments } from "../repositories/strategy-repository.js";

export const strategiesRouter = Router();

strategiesRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ items: await listStrategies(pool) });
  } catch (error) {
    next(error);
  }
});

strategiesRouter.get("/accounts", async (_req, res, next) => {
  try { res.json({ items: await listAccounts(pool) }); } catch (error) { next(error); }
});

strategiesRouter.get("/instruments", async (_req, res, next) => {
  try { res.json({ items: await listInstruments(pool) }); } catch (error) { next(error); }
});
