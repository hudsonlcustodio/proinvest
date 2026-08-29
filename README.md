# ProInvest

Portfolio e registro manual de operações com domínio financeiro exato, API Express/PostgreSQL e SPA React dark-first.

Primeiro vertical slice: `Strategy → EQUITY_HOLDING → Operation → Position → Golden Tests`.

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
npm run build
npm run start:api
```

O primeiro `npm install` gera `package-lock.json`. Valide e versione o lockfile; depois troque o CI para `npm ci`.

Abra `http://localhost:3000/`; Portfolio é a entrada principal. Para desenvolvimento separado, execute `npm run dev:api` e `npm run dev:web` em terminais distintos.

## API
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
