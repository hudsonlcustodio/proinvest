CREATE TABLE portfolio_valuation_snapshots (
 id UUID PRIMARY KEY, scope_type VARCHAR(20) NOT NULL CHECK(scope_type='PORTFOLIO'), scope_id VARCHAR(160) NOT NULL,
 currency VARCHAR(12) NOT NULL, known_value NUMERIC(38,18) NOT NULL, status VARCHAR(20) NOT NULL CHECK(status IN('AVAILABLE','INCOMPLETE','UNRECONCILED')),
 coverage_total INTEGER NOT NULL CHECK(coverage_total>=0), coverage_available INTEGER NOT NULL CHECK(coverage_available>=0), coverage_missing INTEGER NOT NULL CHECK(coverage_missing>=0),
 as_of TIMESTAMPTZ NOT NULL, recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), trigger VARCHAR(50) NOT NULL, source VARCHAR(50) NOT NULL,
 CHECK(coverage_available+coverage_missing=coverage_total)
);
CREATE INDEX idx_portfolio_valuation_snapshots_scope_time ON portfolio_valuation_snapshots(scope_type,scope_id,currency,as_of DESC);
