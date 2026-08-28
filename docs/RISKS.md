# Risks V0.1

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| RSK-001 | Financial precision loss | Critical | NUMERIC + decimal.js + golden tests |
| RSK-002 | Duplicate imports | High | provenance + idempotency |
| RSK-003 | Wrong consolidation by ticker | High | instrument/account/strategy identity |
| RSK-004 | Cost basis shown as market value | High | explicit valuation model |
| RSK-005 | External write capability | Critical | no trade/withdraw/transfer routes |
| RSK-006 | Secrets committed | Critical | ignore + secret scan + env separation |
| RSK-007 | Incomplete data converted to zero | High | explicit INCOMPLETE metrics |
