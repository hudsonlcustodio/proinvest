# ADR-021: Staging and reconciliation before canonical promotion

Status: Accepted. File/provider records enter sanitized staging, then normalization, validation, idempotency and reconciliation. Strategy is never guessed. Only resolved candidates invoke the existing canonical operation service.
