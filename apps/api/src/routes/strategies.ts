import { Router } from "express";
import { pool } from "../db/pool.js";
import { listStrategies } from "../repositories/strategy-repository.js";

export const strategiesRouter = Router();

strategiesRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ items: await listStrategies(pool) });
  } catch (error) {
    next(error);
  }
});
