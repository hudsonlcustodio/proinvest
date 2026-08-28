CREATE TABLE idempotency_keys (
  key UUID PRIMARY KEY,
  scope VARCHAR(100) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  response_status INTEGER,
  response_body JSONB,
  resource_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CHECK (response_status IS NULL OR response_status BETWEEN 100 AND 599)
);

CREATE INDEX idx_idempotency_created_at ON idempotency_keys(created_at);
