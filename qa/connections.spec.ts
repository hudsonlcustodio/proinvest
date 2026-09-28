import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("real browser: CSV to staging to canonical Portfolio and Dashboard", async ({ page, request }, testInfo) => {
  const suffix = randomUUID().slice(0, 8);
  const displayName = `QA ${testInfo.project.name} ${suffix}`;
  const externalId = `qa-${testInfo.project.name}-${suffix}`;
  const pendingExternalId = `${externalId}-pending`;
  const created = await request.post("/v1/connections", { data: { providerKey: "FILE_IMPORT", displayName } });
  expect(created.ok()).toBeTruthy();
  const connection = await created.json() as { id: string };

  await page.goto("/connections");
  await expect(page.getByRole("heading", { name: "Conexões", exact: true })).toBeVisible();
  const card = page.locator("article.connection-card").filter({ hasText: displayName });
  await expect(card).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("connections.png"), fullPage: true });

  const csv = `external_id,strategy_code,account_name,symbol,side,quantity,entry_price,currency,opened_at\n${externalId},STR-001,Conta Manual Beta,EMBR3,BUY,1,38.23,BRL,2026-08-29T12:00:00Z\n${pendingExternalId},UNKNOWN,Conta Manual Beta,EMBR3,BUY,1,38.23,BRL,2026-08-29T13:00:00Z`;
  await card.locator('input[type="file"]').setInputFiles({ name: "qa.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.getByRole("status")).toContainText("2 registro(s)");

  const stagedResponse = await request.get("/v1/connections/reconciliation");
  expect(stagedResponse.ok()).toBeTruthy();
  const staged = (await stagedResponse.json() as { items: Array<{ id: string; connectionId: string; status: string; externalId: string }> }).items
    .find(x => x.connectionId === connection.id && x.externalId === externalId);
  expect(staged?.status).toBe("READY");

  await page.goto("/reconciliation");
  await expect(page.getByRole("heading", { name: "Reconciliação" })).toBeVisible();
  const readyRow = page.locator("article.reconciliation-card").filter({ has: page.getByText(externalId, { exact: true }) });
  await expect(readyRow).toBeVisible();
  await readyRow.getByRole("button", { name: "Confirmar e importar" }).click();
  await expect(readyRow.locator(".status")).toHaveText("Importado");
  const pendingRow = page.locator("article.reconciliation-card").filter({ has: page.getByText(pendingExternalId, { exact: true }) });
  await expect(pendingRow.locator(".status")).toHaveText("Pendente");
  await pendingRow.getByLabel("Strategy").selectOption({ label: "Microcaps" });
  await pendingRow.getByLabel("Instrumento").selectOption({ label: "EMBR3 · BRL" });
  await pendingRow.getByLabel("Conta").selectOption({ label: "Conta Manual Beta" });
  await pendingRow.getByRole("button", { name: "Resolver" }).click();
  await expect(pendingRow.locator(".status")).toHaveText("Pronto");
  await pendingRow.getByRole("button", { name: "Confirmar e importar" }).click();
  await expect(pendingRow.locator(".status")).toHaveText("Importado");
  await page.screenshot({ path: testInfo.outputPath("reconciliation.png"), fullPage: true });

  const operation = await request.get(`/v1/connections/reconciliation`);
  const canonical = (await operation.json() as { items: Array<{ id: string; externalId: string; canonicalOperationId: string | null }> }).items
    .find(x => x.id === staged!.id);
  expect(canonical?.canonicalOperationId).toBeTruthy();

  await page.goto("/portfolio");
  await expect(page.getByRole("heading", { name: /Patrimônio com contexto/i })).toBeVisible();
  await expect(page.getByText("EMBR3").first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("portfolio.png"), fullPage: true });

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText(/conexões/).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("dashboard.png"), fullPage: true });

  await page.goto("/sync");
  await expect(page.getByRole("heading", { name: "Sync Center" })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("Dashboard reference-data p95 remains below 500 ms", async ({ request }, testInfo) => {
  for (let i = 0; i < 5; i++) expect((await request.get("/v1/dashboard")).ok()).toBeTruthy();
  const timings: number[] = [];
  for (let i = 0; i < 25; i++) {
    const started = performance.now();
    expect((await request.get("/v1/dashboard")).ok()).toBeTruthy();
    timings.push(performance.now() - started);
  }
  timings.sort((a, b) => a - b);
  const p95 = timings[Math.ceil(timings.length * 0.95) - 1]!;
  console.info("dashboard_p95_ms", { project: testInfo.project.name, p95: Math.round(p95), samples: timings.length });
  expect(p95).toBeLessThan(500);
});
