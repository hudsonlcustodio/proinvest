# Architecture V1.2: Intelligence and Connections

## Shape
The existing modular monolith remains. Dashboard composes the canonical Portfolio service; it is not a second financial engine. Deterministic insights consume typed dashboard/connection summaries. Append-only valuation snapshots are written only by legitimate commands, never reads.

`manual/provider/file -> sanitized staging -> normalization -> validation -> deduplication -> reconciliation -> existing operation service -> canonical model`

## Boundaries
- `DashboardQueryService`: server-side filters, allocations of available economic/market value only, explicit coverage.
- `InsightEngine`: pure deterministic rules with evidence and provenance.
- `ValuationSnapshotRepository`: append/read, no update/delete API.
- `ReadOnlyConnector`: metadata, configuration schema, connectivity/capability inspection, account discovery and record fetch; no write-finance methods.
- `CredentialSecretStore`: store/rotate/destroy and internal use; public services return metadata only.
- `IngestionService`: allowlisted records, idempotency and reconciliation before canonical promotion.

## Contracts and invalid states
Currency is mandatory on money. Available and incomplete metrics are discriminated unions. Connections separate health from capability safety. A candidate missing required Strategy remains reconciliation-only. Time series returns insufficient-history until two observed snapshots exist.

## Security and deployment boundary
Same-origin Express API, CSP/anti-framing/no-sniff preserved. External URLs are adapter constants, TLS-only, timed and size-bounded. Beta encryption uses AES-256-GCM with a validated external master key. The application remains private beta; public production requires auth and managed KMS among other operational controls.
