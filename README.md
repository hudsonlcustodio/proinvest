# ProInvest

Baseline de implementação `v0.1`.

Primeiro vertical slice: `Strategy → EQUITY_HOLDING → Operation → Position → Golden Tests`.

## Requisitos
- Node.js 24 LTS
- PostgreSQL 18
- npm

## Bootstrap
```bash
cp .env.example .env
npm install
npm test
npm run dev:api
```

O primeiro `npm install` gera `package-lock.json`. Valide e versione o lockfile; depois troque o CI para `npm ci`.

## API inicial
- `GET /health`
- `POST /v1/operations/preview`

## Invariantes
- Decimais financeiros trafegam como strings.
- `unknown != 0`.
- Cost basis não é market value.
- O backend é a fonte de verdade dos cálculos críticos.
- Integrações financeiras externas são read-only na Beta.

## V0.2

Inclui:
- PostgreSQL pool/transaction boundary
- Strategy repository + `GET /v1/strategies`
- `POST /v1/operations` para `EQUITY_HOLDING@1`
- seed de conta manual + EMBR3/OIBR3
- migration/seed scripts

### Banco local
```bash
export DATABASE_URL=postgresql://proinvest:proinvest@localhost:5432/proinvest
npm run db:migrate
npm run db:seed
npm run dev:api
```

> Os runners de migration/seed são bootstrap-only. Antes de produção, o projeto deve adotar tracking explícito de migrations e execução idempotente.
