import express from "express";
import { strategiesRouter } from "./routes/strategies.js";
import { operationsRouter } from "./routes/operations.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "proinvest-api" });
  });

  app.use("/v1/strategies", strategiesRouter);
  app.use("/v1/operations", operationsRouter);

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("request_failed", {
      name: error instanceof Error ? error.name : "UnknownError"
    });
    res.status(500).json({
      type: "internal_error",
      status: 500,
      code: "INTERNAL_ERROR"
    });
  });

  return app;
}
