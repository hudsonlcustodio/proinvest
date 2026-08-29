import express from "express";
import path from "node:path";
import { strategiesRouter } from "./routes/strategies.js";
import { operationsRouter } from "./routes/operations.js";
import { portfolioRouter } from "./routes/portfolio.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.set({
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()"
    });
    next();
  });
  app.use(express.json({ limit: "100kb" }));
  app.get("/", (_req, res) => res.redirect(302, "/portfolio"));
  app.use(express.static("apps/web-dist", { index: false, immutable: false }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "proinvest-api" });
  });

  app.use("/v1/strategies", strategiesRouter);
  app.use("/v1/operations", operationsRouter);
  app.use("/v1/portfolio", portfolioRouter);

  app.get(["/portfolio", "/operations/{*route}"], (_req, res) => {
    res.sendFile(path.resolve("apps/web-dist/index.html"));
  });

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
