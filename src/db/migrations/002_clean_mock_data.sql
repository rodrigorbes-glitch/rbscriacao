-- RBS Criação v3 — Migration 002: Limpeza de dados mocados / demonstração
-- Preserva rigorosamente: Usuários/Emails, Categorias, Coleções, Produtos, Variações, Estoque inicial, Presets de Precificação, Marketing (Cupons, Banners, Redes Sociais) e Configurações da Loja.

-- 1. Excluir dados transacionais e mocados de produção e pedidos
DELETE FROM production_failures;
DELETE FROM production_jobs;
DELETE FROM order_items;
DELETE FROM orders;

-- 2. Excluir consignações e comodatos de teste
DELETE FROM consignment_items;
DELETE FROM consignment_shipments;
DELETE FROM comodato_assets;

-- 3. Excluir orçamentos sob medida de demonstração
DELETE FROM custom_quote_revisions;
DELETE FROM custom_quotes;

-- 4. Excluir movimentações financeiras, conciliações e comissões mocadas
DELETE FROM financial_reconciliations;
DELETE FROM partner_commissions;
DELETE FROM financial_entries;

-- 5. Excluir movimentações de estoque vinculadas aos pedidos mocados
DELETE FROM inventory_movements;

-- 6. Excluir simulações e eventos analíticos de teste
DELETE FROM pricing_simulations;
DELETE FROM interest_alerts;
DELETE FROM commercial_events;

-- 7. Excluir endereços mocados de clientes de teste
DELETE FROM customer_addresses;

-- 8. Zerar saldos das contas financeiras para estado limpo inicial
UPDATE financial_accounts SET balance_cents = 0;
