CREATE TABLE strategies (
 id UUID PRIMARY KEY, code VARCHAR(50) NOT NULL UNIQUE, name VARCHAR(160) NOT NULL,
 category VARCHAR(50) NOT NULL, provider_name VARCHAR(160), template_type VARCHAR(50) NOT NULL,
 template_version INTEGER NOT NULL DEFAULT 1 CHECK (template_version > 0),
 status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
 description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE accounts (
 id UUID PRIMARY KEY, name VARCHAR(160) NOT NULL,
 type VARCHAR(30) NOT NULL CHECK (type IN ('BROKERAGE','EXCHANGE','WALLET','MANUAL')),
 institution_name VARCHAR(160), base_currency VARCHAR(12), external_reference VARCHAR(255),
 status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE instruments (
 id UUID PRIMARY KEY, symbol VARCHAR(80) NOT NULL, name VARCHAR(200), asset_class VARCHAR(50) NOT NULL,
 market VARCHAR(80), currency VARCHAR(12) NOT NULL, contract_multiplier NUMERIC(38,18),
 tick_size NUMERIC(38,18), tick_value NUMERIC(38,18), metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE operations (
 id UUID PRIMARY KEY, strategy_id UUID NOT NULL REFERENCES strategies(id),
 account_id UUID NOT NULL REFERENCES accounts(id), template_type VARCHAR(50) NOT NULL,
 template_version INTEGER NOT NULL CHECK (template_version > 0), operation_type VARCHAR(50) NOT NULL,
 status VARCHAR(30) NOT NULL CHECK (status IN ('DRAFT','OPEN','PARTIALLY_CLOSED','CLOSED','CANCELLED','INVALID')),
 opened_at TIMESTAMPTZ NOT NULL, closed_at TIMESTAMPTZ, source_type VARCHAR(30) NOT NULL,
 source_id VARCHAR(100), external_id VARCHAR(255), metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK (closed_at IS NULL OR closed_at >= opened_at)
);

CREATE TABLE operation_legs (
 id UUID PRIMARY KEY, operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
 instrument_id UUID NOT NULL REFERENCES instruments(id), side VARCHAR(10) NOT NULL CHECK (side IN ('BUY','SELL')),
 quantity NUMERIC(38,18) NOT NULL CHECK (quantity > 0), entry_price NUMERIC(38,18) NOT NULL CHECK (entry_price >= 0),
 exit_price NUMERIC(38,18) CHECK (exit_price IS NULL OR exit_price >= 0), currency VARCHAR(12) NOT NULL,
 leverage NUMERIC(18,8) CHECK (leverage IS NULL OR leverage > 0), notional NUMERIC(38,18),
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_operations_strategy_opened ON operations(strategy_id, opened_at DESC);
CREATE INDEX idx_operations_account_opened ON operations(account_id, opened_at DESC);
CREATE INDEX idx_operation_legs_operation ON operation_legs(operation_id);
