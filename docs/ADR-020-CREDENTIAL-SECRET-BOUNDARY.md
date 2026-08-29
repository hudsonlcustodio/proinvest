# ADR-020: Credential secret boundary

Status: Accepted. Public services can store, rotate and destroy credentials but never read them back. Internal connector execution may use decrypted bytes transiently. Beta storage uses AES-256-GCM with a validated master key outside PostgreSQL; external connections default disabled.
