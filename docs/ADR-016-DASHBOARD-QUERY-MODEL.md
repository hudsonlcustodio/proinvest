# ADR-016: Dashboard query model

Status: Accepted.

Dashboard is a read-only server-side composition over canonical Portfolio results. Filters run before aggregation. Allocation includes available market/economic value only and always reports coverage. No browser financial calculation and no read-side snapshot writes.
