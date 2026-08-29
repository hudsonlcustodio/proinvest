# Threat Model: Connections V1

Assets: credentials, canonical financial records, sanitized source records and provenance. Trust boundaries: browser/API, API/PostgreSQL, connector/provider and file parser.

Controls: secrets never returned/logged/placed in URLs; AES-256-GCM with random IV/tag/key version; master key outside DB; registry-owned TLS endpoints; no arbitrary URL; timeout/response-size/retry bounds; explicit read-only capabilities; allowlisted staging fields; payload limits; idempotency and replay constraints; Strategy reconciliation; same-origin/CSP/anti-framing/no-sniff; safe React rendering; parameterized SQL; account-scoped queries; dependency audit.

Threats covered: credential theft, DB compromise, secret logging, malicious responses/files, SSRF, oversized payload, rate abuse, replay/duplicates, provider impersonation, permission escalation, tool misuse, XSS, CSRF/CORS, supply chain and cross-account leakage.

Residual risks: private beta has no auth and cannot be public; environment master key is not managed KMS; provider-specific scopes/terms remain unverified until explicit provider selection; retention policy remains configurable pending governance.
