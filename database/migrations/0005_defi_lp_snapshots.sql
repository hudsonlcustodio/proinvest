ALTER TABLE operation_legs ALTER COLUMN entry_price DROP NOT NULL;
ALTER TABLE operations ADD COLUMN IF NOT EXISTS invested_amount NUMERIC(38,18) CHECK (invested_amount IS NULL OR invested_amount > 0);

CREATE TABLE IF NOT EXISTS defi_lp_snapshots (
 id UUID PRIMARY KEY,
 operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
 current_position_value NUMERIC(38,18) NOT NULL CHECK (current_position_value >= 0),
 unclaimed_fees NUMERIC(38,18) CHECK (unclaimed_fees IS NULL OR unclaimed_fees >= 0),
 currency VARCHAR(12) NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL,
 recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 idempotency_key VARCHAR(255) UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_defi_lp_snapshots_latest ON defi_lp_snapshots(operation_id, observed_at DESC, recorded_at DESC);
