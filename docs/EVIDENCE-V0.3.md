# Evidence V0.3

## Implemented
- migration tracking via `schema_migrations`
- SHA-256 migration drift detection
- migration rerun behavior
- transactional seed runner
- request idempotency persistence
- operation reload endpoint
- PostgreSQL integration test
- CI PostgreSQL service

## Evidence pending
These files are implementation artifacts, not proof of runtime success.
The following must execute green in GitHub CI before `GATE-FOUNDATION` becomes PASS:

1. dependency install
2. TypeScript build
3. first migration run
4. second migration run (idempotency)
5. seeds
6. golden tests
7. PostgreSQL integration test
8. npm audit threshold

No PASS is claimed before CI evidence exists.
# V0.4 Evidence

- `npm ci`, build, migrations (including second run), seeds, tests and audit passed in GitHub Actions run `33172926227` for V0.3; the V0.4 run is pending after this change.
- Local golden cases: EMBR3 `150 × 38.23 = 5734.50` and OIBR3 `335 × 1.28 = 428.80` pass.
- Local E2E is skipped without `TEST_DATABASE_URL`; no local PostgreSQL evidence is claimed.
- No secrets or generated artifacts are included in the change.
