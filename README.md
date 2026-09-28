# ProInvest

Portfolio, inteligência determinística e importação CSV somente leitura para beta privada, com domínio financeiro exato, API Express/PostgreSQL e SPA React.

## Requisitos
- Node.js 24 LTS
- PostgreSQL 18
- npm

## Bootstrap
```bash
cp .env.example .env
npm ci
npm run db:migrate
npm run db:seed
npm test
npm run test:web
npm run start:api
```

Use um PostgreSQL 18 descartável em `TEST_DATABASE_URL` ao executar testes: as suítes criam operações e conexões. Sem ele, os testes PostgreSQL são pulados e a V1.2 não atende o gate. Abra `http://localhost:3000/dashboard`. O procedimento completo, inclusive QA Chromium desktop/mobile, retenção e recuperação, está em [RUNBOOK-V1.2.md](docs/RUNBOOK-V1.2.md).

## API
- `GET /health`
- `GET /v1/dashboard`
- `GET /v1/portfolio`
- `GET /v1/connections`
- `GET /v1/connections/sync-runs`
- `GET /v1/connections/reconciliation`
- `POST /v1/operations/preview`

## Invariantes
- Decimais financeiros trafegam como strings.
- `unknown != 0`.
- Cost basis não é market value.
- O backend é a fonte de verdade dos cálculos críticos.
- Integrações financeiras externas são read-only na Beta.

O provider live permanece pendente de escolha explícita. Autenticação, autorização por conta, KMS, TLS, backup/restore e incidentes pertencem ao gate posterior de produção pública. Consulte [GATES.md](docs/GATES.md) para o status formal.
