# ProInvest V1.2 private beta — runbook

## Scope and prerequisites

This runbook covers a private single-owner instance only. Public production is outside this gate. Use Node 24 and PostgreSQL 18. Never point tests or browser QA at a database containing user data: the suites create operations, accounts, connections and staging records.

Set `DATABASE_URL` and `TEST_DATABASE_URL` to a disposable PostgreSQL 18 database, using uncommitted environment values. `CONNECTION_MASTER_KEY` must be a base64-encoded 32-byte key only when storing a connection credential; CSV file import does not require one. Never commit or log keys.

## Clean verification

```bash
npm ci
npm run db:migrate
npm run db:migrate
npm run db:seed
npm test
npm run test:web
npx playwright install chromium
npm run test:browser
npm audit --audit-level=high
```

The second migration run checks idempotency. `npm test` must report zero skips; if `TEST_DATABASE_URL` is absent, PostgreSQL tests skip and the beta gate cannot pass. CI creates a second, isolated PostgreSQL 18 database for browser QA, migrates/seeds it, then Playwright starts the built API and runs Chromium at desktop (1440×900) and mobile (390×844) viewports. Screenshots, trace-on-failure and the HTML report are CI artifacts. The browser suite writes synthetic test records and must use a disposable database.

For a private local review, build with `npm run build`, start the API with `npm run start:api`, and open `http://127.0.0.1:3000/dashboard`. The server binds loopback by default. Binding another address requires an explicit `HOST` and `ALLOW_PRIVATE_NETWORK_BIND=true`; do not use this unauthenticated beta on a public interface. Check `/health`, `/portfolio`, `/connections`, `/sync` and `/reconciliation`. Do not assume a Vite server on port 5173 belongs to ProInvest without checking its document title and proxy target.

## Import and data safety

Only FILE_IMPORT is available. Upload a CSV with `external_id,strategy_code,account_name,symbol,side,quantity,entry_price,currency,opened_at`. A row with missing/invalid financial values becomes REJECTED and cannot be reconciled. Unknown or ambiguous references remain PENDING; choose an active equity-holding Strategy, matching equity instrument and active account, then confirm promotion. The same external ID with changed contents fails the run with `EXTERNAL_ID_CONFLICT`; it never silently creates another canonical operation. Counters track current ready, pending, imported, duplicate and rejected states; on completed runs they sum to fetched.

## Retention and observability

Run `npm run db:prune-staging` as a daily maintenance job against the private instance. `STAGING_RETENTION_DAYS` defaults to 90 and accepts 1..3650. The command deletes only terminal IMPORTED/REJECTED staging older than the configured age; PENDING/READY is not auto-deleted. Sync-run counts and canonical operation provenance remain. Record the configured retention in operating procedures and confirm legal requirements before changing it.

Safe structured logs include `connection_sync`, `connection_reconciliation` and `portfolio_query` counters/durations. Never log CSV source rows, authorization material, connection secrets or database URLs. Inspect Sync Center for FAILED runs and pending reconciliation, and Dashboard health for latest failed connection state. `EXTERNAL_ID_CONFLICT` requires a human decision about correction rather than automatic overwrite.

## Recovery and rollout

Keep this beta bound to a trusted local/private network. If a release fails, stop the API, inspect safe logs and sync status, then roll back application code; preserve migration 0007 tables and canonical records. Do not drop tables or reimport altered records as a rollback shortcut. Re-run migrations and full PostgreSQL/browser suites before retrying. Live provider selection remains an explicit product decision. Public rollout requires separate authentication, account authorization, managed KMS, TLS, backups/restore drills, rate limits and incident procedures.
