import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Portfolio UI exposes separated current and historical sections with accessibility landmarks", async () => {
  const [html,source]=await Promise.all([readFile("apps/web-app/index.html","utf8"),readFile("apps/web-app/src/pages/PortfolioPage.tsx","utf8")]);
  assert.match(html,/lang="pt-BR"/);
  assert.match(source,/Posições atuais/);
  assert.match(source,/Resultados históricos/);
  assert.match(source,/role="alert"/);
  assert.match(source,/Sem FX implícito/);
});

test("application shell provides integrated navigation", async () => {
  const nav=await readFile("apps/web-app/src/components/AppShell.tsx","utf8");
  for(const target of ["/portfolio","/operations/equity-holding","/operations/long-short","/operations/futures","/operations/crypto-spot","/operations/crypto-derivative","/operations/defi-lp"]) assert.match(nav,new RegExp(target.replace(".","\\.")));
  assert.match(nav,/aria-current/);
  assert.match(nav,/Pular para o conteúdo/);
});

test("HTTP baseline disables framing, sniffing and sensitive browser capabilities", async () => {
  process.env.DATABASE_URL ??= "postgresql://unused:unused@127.0.0.1:5432/unused";
  const { createApp }=await import("../../apps/api/src/app.js");
  const server=createApp().listen(0);
  try{
    const address=server.address();assert.ok(address&&typeof address!=="string");
    const response=await fetch(`http://127.0.0.1:${address.port}/health`);
    assert.equal(response.headers.get("x-frame-options"),"DENY");
    assert.equal(response.headers.get("x-content-type-options"),"nosniff");
    assert.match(response.headers.get("content-security-policy")??"",/frame-ancestors 'none'/);
    assert.match(response.headers.get("permissions-policy")??"",/payment=\(\)/);
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
