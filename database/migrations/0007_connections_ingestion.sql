CREATE TABLE connections (
 id UUID PRIMARY KEY, provider_key VARCHAR(80) NOT NULL, display_name VARCHAR(160) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN('ACTIVE','REVOKED')),
 read_only BOOLEAN NOT NULL DEFAULT TRUE CHECK(read_only), capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
 last_sync_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE connection_secrets (
 id UUID PRIMARY KEY, connection_id UUID NOT NULL UNIQUE REFERENCES connections(id) ON DELETE CASCADE,
 ciphertext BYTEA NOT NULL, iv BYTEA NOT NULL, auth_tag BYTEA NOT NULL, key_version INTEGER NOT NULL CHECK(key_version>0),
 revoked_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), rotated_at TIMESTAMPTZ
);
CREATE TABLE sync_runs (
 id UUID PRIMARY KEY, connection_id UUID NOT NULL REFERENCES connections(id), status VARCHAR(20) NOT NULL CHECK(status IN('RUNNING','COMPLETED','FAILED')),
 started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ, fetched_count INTEGER NOT NULL DEFAULT 0,
 imported_count INTEGER NOT NULL DEFAULT 0, duplicate_count INTEGER NOT NULL DEFAULT 0, ready_count INTEGER NOT NULL DEFAULT 0, pending_count INTEGER NOT NULL DEFAULT 0,
 rejected_count INTEGER NOT NULL DEFAULT 0, error_code VARCHAR(80), CHECK(completed_at IS NULL OR completed_at>=started_at)
);
CREATE TABLE staging_records (
 id UUID PRIMARY KEY, connection_id UUID NOT NULL REFERENCES connections(id), sync_run_id UUID NOT NULL REFERENCES sync_runs(id),
 external_id VARCHAR(255), fingerprint CHAR(64) NOT NULL, status VARCHAR(20) NOT NULL CHECK(status IN('PENDING','READY','IMPORTED','REJECTED','DUPLICATE')),
 sanitized_source JSONB NOT NULL, normalized JSONB NOT NULL, issues JSONB NOT NULL DEFAULT '[]'::jsonb,
 strategy_id UUID REFERENCES strategies(id), instrument_id UUID REFERENCES instruments(id), account_id UUID REFERENCES accounts(id),
 canonical_operation_id UUID REFERENCES operations(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(connection_id,fingerprint)
);
CREATE UNIQUE INDEX idx_staging_connection_external_id ON staging_records(connection_id,external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_sync_runs_connection_started ON sync_runs(connection_id,started_at DESC);
CREATE INDEX idx_staging_status_created ON staging_records(status,created_at DESC);
