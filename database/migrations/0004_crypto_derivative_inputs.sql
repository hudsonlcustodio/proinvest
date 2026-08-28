ALTER TABLE operation_legs ALTER COLUMN quantity DROP NOT NULL;
ALTER TABLE operation_legs ADD COLUMN IF NOT EXISTS invested_capital NUMERIC(38,18) CHECK (invested_capital IS NULL OR invested_capital > 0);
