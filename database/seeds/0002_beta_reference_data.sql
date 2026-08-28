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
