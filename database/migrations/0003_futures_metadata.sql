ALTER TABLE instruments ADD COLUMN IF NOT EXISTS product_code VARCHAR(50);
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS contract_size NUMERIC(38,18);
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS contract_size_currency VARCHAR(12);
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS quotation_basis NUMERIC(38,18);
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS quotation_currency VARCHAR(12);
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS settlement_currency VARCHAR(12);
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS minimum_price_increment NUMERIC(38,18);
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS standard_lot NUMERIC(38,18);
