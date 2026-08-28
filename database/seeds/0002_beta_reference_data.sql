INSERT INTO accounts
(id, name, type, institution_name, base_currency, status)
VALUES
('10000000-0000-4000-8000-000000000001', 'Conta Manual Beta', 'MANUAL', NULL, 'BRL', 'ACTIVE');

INSERT INTO instruments
(id, symbol, name, asset_class, market, currency, status)
VALUES
('20000000-0000-4000-8000-000000000001', 'EMBR3', 'Embraer ON', 'EQUITY', 'B3', 'BRL', 'ACTIVE'),
('20000000-0000-4000-8000-000000000002', 'OIBR3', 'Oi ON', 'EQUITY', 'B3', 'BRL', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO instruments
(id, symbol, name, asset_class, market, currency, status)
VALUES
('20000000-0000-4000-8000-000000000006', 'BTC', 'Bitcoin', 'CRYPTO', NULL, 'USD', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO instruments
(id, symbol, name, asset_class, market, currency, product_code, contract_size, contract_size_currency, quotation_basis, quotation_currency, settlement_currency, minimum_price_increment, standard_lot, status)
VALUES
('20000000-0000-4000-8000-000000000005', 'WDOL26', 'Futuro Mini de Dólar — vencimento L26', 'FUTURE', 'B3', 'BRL', 'WDO', 10000, 'USD', 1000, 'USD', 'BRL', 0.50, 1, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO instruments
(id, symbol, name, asset_class, market, currency, status)
VALUES
('20000000-0000-4000-8000-000000000003', 'PTBR4', 'PTBR4 (acceptance fixture)', 'EQUITY', 'B3', 'BRL', 'ACTIVE'),
('20000000-0000-4000-8000-000000000004', 'SMIG3', 'SMIG3 (acceptance fixture)', 'EQUITY', 'B3', 'BRL', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;
