-- RBS Criação v3 — Schema PostgreSQL Versionado (001_initial_schema.sql)
-- Moeda: valores monetários armazenados em centavos inteiros (BIGINT/INTEGER) para precisão exata.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(64) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1. IDENTIDADE, PERFIS E ACESSOS (RBAC)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'customer', -- 'admin' | 'operator' | 'partner' | 'customer'
  phone VARCHAR(40),
  document_cpf_cnpj VARCHAR(32),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(80) DEFAULT 'Principal',
  recipient_name VARCHAR(180) NOT NULL,
  cep VARCHAR(16) NOT NULL,
  street VARCHAR(200) NOT NULL,
  number VARCHAR(40) NOT NULL,
  complement VARCHAR(120),
  neighborhood VARCHAR(120) NOT NULL,
  city VARCHAR(120) NOT NULL,
  state VARCHAR(8) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. CATÁLOGO, CATEGORIAS, COLEÇÕES E PRODUTOS 3D
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(140) NOT NULL,
  description TEXT,
  icon_name VARCHAR(64),
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS collections (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(140) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT,
  banner_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  sku VARCHAR(64) UNIQUE NOT NULL,
  slug VARCHAR(140) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  subtitle VARCHAR(255),
  short_description TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id VARCHAR(64) REFERENCES categories(id),
  collection_id VARCHAR(64) REFERENCES collections(id),
  material VARCHAR(40) NOT NULL DEFAULT 'PLA', -- 'PLA' | 'PETG' | 'ABS' | 'TPU' | 'Resina'
  finish VARCHAR(80) NOT NULL DEFAULT 'Fosco Camadas Suaves',
  availability_type VARCHAR(40) NOT NULL DEFAULT 'ready_stock', -- 'ready_stock' | 'made_to_order' | 'custom_project'
  lead_time_days INTEGER NOT NULL DEFAULT 1, -- Prazo de fabricação separado do frete
  dimensions_mm VARCHAR(80) NOT NULL DEFAULT '120 x 120 x 180 mm',
  dimensional_tolerance VARCHAR(40) NOT NULL DEFAULT '± 0,3 mm',
  weight_grams INTEGER NOT NULL DEFAULT 180,
  package_weight_grams INTEGER NOT NULL DEFAULT 260,
  package_dimensions_cm VARCHAR(40) NOT NULL DEFAULT '18x18x22',
  filament_grams_per_unit INTEGER NOT NULL DEFAULT 165,
  support_purge_grams_per_unit INTEGER NOT NULL DEFAULT 15,
  print_time_minutes INTEGER NOT NULL DEFAULT 210,
  price_cents INTEGER NOT NULL,
  compare_at_price_cents INTEGER,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  allow_customization BOOLEAN NOT NULL DEFAULT FALSE,
  customization_instructions TEXT,
  max_custom_chars INTEGER DEFAULT 30,
  care_instructions TEXT NOT NULL,
  layer_notice TEXT NOT NULL,
  license_origin VARCHAR(120) NOT NULL DEFAULT 'Design Autoral RBS Criação',
  model_3d_glb_url TEXT,
  images_json TEXT NOT NULL DEFAULT '[]',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_b2b_eligible BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_variations (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku_variation VARCHAR(80) UNIQUE NOT NULL,
  color_name VARCHAR(80) NOT NULL,
  color_hex VARCHAR(16) NOT NULL DEFAULT '#1E293B',
  material_override VARCHAR(40),
  size_label VARCHAR(64) NOT NULL DEFAULT 'Padrão',
  price_delta_cents INTEGER NOT NULL DEFAULT 0,
  stock_qty INTEGER NOT NULL DEFAULT 10,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. CARRINHO SELETIVO, FAVORITOS E AVISOS DE INTERESSE
CREATE TABLE IF NOT EXISTS carts (
  id VARCHAR(64) PRIMARY KEY,
  session_key VARCHAR(120) UNIQUE NOT NULL,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  coupon_code VARCHAR(64),
  cep VARCHAR(16),
  selected_shipping_service VARCHAR(80),
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  shipping_days INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cart_items (
  id VARCHAR(64) PRIMARY KEY,
  cart_id VARCHAR(64) NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variation_id VARCHAR(64) REFERENCES product_variations(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  selected BOOLEAN NOT NULL DEFAULT TRUE,
  saved_for_later BOOLEAN NOT NULL DEFAULT FALSE,
  custom_text VARCHAR(120),
  custom_notes TEXT,
  unit_price_snapshot_cents INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wishlists (
  id VARCHAR(64) PRIMARY KEY,
  session_key VARCHAR(120) NOT NULL,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variation_id VARCHAR(64) REFERENCES product_variations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interest_alerts (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variation_id VARCHAR(64) REFERENCES product_variations(id) ON DELETE SET NULL,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  visitor_name VARCHAR(140),
  visitor_email VARCHAR(180) NOT NULL,
  visitor_whatsapp VARCHAR(40),
  alert_type VARCHAR(40) NOT NULL, -- 'restock' | 'price_drop' | 'variation_return'
  target_price_cents INTEGER,
  channel VARCHAR(24) NOT NULL DEFAULT 'email', -- 'email' | 'whatsapp' | 'both'
  opt_in_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  unsubscribe_token VARCHAR(96) UNIQUE NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active' | 'notified' | 'cancelled'
  notified_at TIMESTAMP WITH TIME ZONE,
  converted_order_id VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. PARCEIROS, COMISSÕES, CONSIGNAÇÃO E COMODATO
CREATE TABLE IF NOT EXISTS partners (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  partner_code VARCHAR(40) UNIQUE NOT NULL,
  name VARCHAR(180) NOT NULL,
  business_name VARCHAR(200),
  document_cpf_cnpj VARCHAR(32) NOT NULL,
  email VARCHAR(180) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  city VARCHAR(120) NOT NULL,
  state VARCHAR(8) NOT NULL,
  partner_type VARCHAR(32) NOT NULL DEFAULT 'hybrid', -- 'affiliate' | 'consignee' | 'comodato' | 'hybrid'
  commission_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  coupon_code VARCHAR(40) UNIQUE NOT NULL,
  customer_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  pix_key VARCHAR(140),
  status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'pending' | 'active' | 'suspended'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. PEDIDOS E MÁQUINAS DE ESTADO DESACOPLADAS (FINANCEIRO / PRODUÇÃO / EXPEDIÇÃO)
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  order_number VARCHAR(40) UNIQUE NOT NULL,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  guest_name VARCHAR(180) NOT NULL,
  guest_email VARCHAR(180) NOT NULL,
  guest_phone VARCHAR(40) NOT NULL,
  guest_cpf_cnpj VARCHAR(32) NOT NULL,
  shipping_address_json TEXT NOT NULL,
  shipping_service_name VARCHAR(80) NOT NULL,
  shipping_carrier VARCHAR(80) NOT NULL,
  shipping_tracking_code VARCHAR(80),
  shipping_days INTEGER NOT NULL DEFAULT 3,
  manufacturing_days INTEGER NOT NULL DEFAULT 2,
  total_estimated_days INTEGER NOT NULL DEFAULT 5,
  subtotal_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,
  gateway_fee_estimated_cents INTEGER NOT NULL DEFAULT 0,
  gateway_fee_actual_cents INTEGER,
  coupon_code VARCHAR(64),
  partner_id VARCHAR(64) REFERENCES partners(id) ON DELETE SET NULL,
  partner_code VARCHAR(40),
  payment_method VARCHAR(32) NOT NULL DEFAULT 'pix', -- 'pix' | 'credit_card' | 'boleto'
  payment_gateway VARCHAR(40) NOT NULL DEFAULT 'mercadopago',
  payment_external_id VARCHAR(120),
  payment_qr_code TEXT,
  payment_copy_paste TEXT,
  idempotency_key VARCHAR(120) UNIQUE NOT NULL,
  financial_status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending' | 'authorized' | 'paid' | 'partially_refunded' | 'refunded' | 'failed' | 'expired' | 'cancelled'
  production_status VARCHAR(32) NOT NULL DEFAULT 'awaiting_payment', -- 'awaiting_payment' | 'queued' | 'printing' | 'post_processing' | 'ready_to_ship' | 'shipped'
  fulfillment_status VARCHAR(32) NOT NULL DEFAULT 'unfulfilled', -- 'unfulfilled' | 'ready_for_pickup' | 'label_generated' | 'in_transit' | 'delivered' | 'returned'
  cart_selection_mode VARCHAR(24) NOT NULL DEFAULT 'full', -- 'full' | 'partial'
  unselected_items_preserved_count INTEGER NOT NULL DEFAULT 0,
  post_purchase_claim_token VARCHAR(96) UNIQUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id),
  variation_id VARCHAR(64) REFERENCES product_variations(id),
  sku_snapshot VARCHAR(80) NOT NULL,
  product_name_snapshot VARCHAR(200) NOT NULL,
  variation_label_snapshot VARCHAR(120),
  material_snapshot VARCHAR(40) NOT NULL,
  availability_snapshot VARCHAR(40) NOT NULL DEFAULT 'ready_stock',
  lead_time_days_snapshot INTEGER NOT NULL DEFAULT 1,
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  unit_cost_cents INTEGER NOT NULL DEFAULT 0,
  custom_text VARCHAR(120),
  custom_notes TEXT,
  filament_grams_estimated INTEGER NOT NULL DEFAULT 150,
  filament_grams_actual INTEGER
);

-- 6. ESTOQUE MULTI-LOCAL, INSUMOS (COMPRA EM KG -> CONSUMO EM G) E MOVIMENTAÇÕES
CREATE TABLE IF NOT EXISTS inventory_locations (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(40) UNIQUE NOT NULL,
  name VARCHAR(140) NOT NULL,
  location_type VARCHAR(40) NOT NULL, -- 'internal_factory' | 'internal_expedition' | 'internal_showroom' | 'consignment_partner' | 'comodato_partner'
  partner_id VARCHAR(64) REFERENCES partners(id) ON DELETE SET NULL,
  address_summary TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS inventory_supplies (
  id VARCHAR(64) PRIMARY KEY,
  sku VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(180) NOT NULL,
  category VARCHAR(40) NOT NULL, -- 'filament' | 'resin' | 'packaging' | 'hardware' | 'consumable'
  material_type VARCHAR(40),
  color_name VARCHAR(80),
  purchase_unit VARCHAR(24) NOT NULL DEFAULT 'kg', -- 'kg' | 'litro' | 'pacote' | 'un'
  consumption_unit VARCHAR(24) NOT NULL DEFAULT 'g', -- 'g' | 'ml' | 'un'
  conversion_factor INTEGER NOT NULL DEFAULT 1000, -- 1 kg = 1000 g
  stock_consumption_units INTEGER NOT NULL DEFAULT 0, -- Saldo real em gramas/ml/un
  reserved_consumption_units INTEGER NOT NULL DEFAULT 0,
  min_threshold_units INTEGER NOT NULL DEFAULT 1000,
  cost_per_purchase_unit_cents INTEGER NOT NULL DEFAULT 11000, -- Ex: R$ 110,00 / kg
  cost_per_consumption_unit_cents NUMERIC(10,4) NOT NULL DEFAULT 11.0000, -- Ex: 11 centavos / grama (R$ 0,11/g)
  supplier_name VARCHAR(140),
  lead_time_days INTEGER NOT NULL DEFAULT 5,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Autoridade única de saldo de produtos acabados por SKU e Local
CREATE TABLE IF NOT EXISTS inventory_balances (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variation_id VARCHAR(64) REFERENCES product_variations(id) ON DELETE CASCADE,
  location_id VARCHAR(64) NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  on_hand_qty INTEGER NOT NULL DEFAULT 0,
  reserved_qty INTEGER NOT NULL DEFAULT 0,
  min_stock_qty INTEGER NOT NULL DEFAULT 2,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id VARCHAR(64) PRIMARY KEY,
  item_type VARCHAR(24) NOT NULL, -- 'product' | 'supply'
  product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
  variation_id VARCHAR(64) REFERENCES product_variations(id) ON DELETE SET NULL,
  supply_id VARCHAR(64) REFERENCES inventory_supplies(id) ON DELETE SET NULL,
  from_location_id VARCHAR(64) REFERENCES inventory_locations(id) ON DELETE SET NULL,
  to_location_id VARCHAR(64) REFERENCES inventory_locations(id) ON DELETE SET NULL,
  movement_type VARCHAR(48) NOT NULL,
  -- 'purchase_entry' | 'production_output' | 'order_reservation' | 'reservation_release' | 'sale_dispatch'
  -- 'supply_consumption' | 'print_failure_waste' | 'reprint_consumption'
  -- 'consignment_send' | 'consignment_return' | 'consignment_sale' | 'comodato_send' | 'comodato_return' | 'inventory_adjustment'
  quantity INTEGER NOT NULL,
  unit_cost_cents INTEGER NOT NULL DEFAULT 0,
  reference_type VARCHAR(40),
  reference_id VARCHAR(64),
  reason TEXT NOT NULL,
  actor_name VARCHAR(120) NOT NULL DEFAULT 'Sistema',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. KANBAN DE PRODUÇÃO 3D, LOTES E REGISTRO DE FALHAS / REIMPRESSÕES
CREATE TABLE IF NOT EXISTS production_jobs (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id VARCHAR(64) REFERENCES order_items(id) ON DELETE SET NULL,
  product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
  batch_code VARCHAR(48) NOT NULL,
  printer_name VARCHAR(80) NOT NULL DEFAULT 'Bambu Lab X1C #01',
  supply_id VARCHAR(64) REFERENCES inventory_supplies(id) ON DELETE SET NULL,
  stage VARCHAR(32) NOT NULL DEFAULT 'awaiting_payment',
  -- 'awaiting_payment' | 'queued' | 'printing' | 'post_processing' | 'ready_to_ship' | 'shipped'
  priority VARCHAR(24) NOT NULL DEFAULT 'normal', -- 'normal' | 'high' | 'urgent'
  quantity INTEGER NOT NULL DEFAULT 1,
  estimated_grams INTEGER NOT NULL DEFAULT 180,
  actual_grams_consumed INTEGER NOT NULL DEFAULT 0,
  wasted_grams INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER NOT NULL DEFAULT 210,
  quality_checklist_passed BOOLEAN NOT NULL DEFAULT FALSE,
  operator_notes TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS production_failures (
  id VARCHAR(64) PRIMARY KEY,
  production_job_id VARCHAR(64) NOT NULL REFERENCES production_jobs(id) ON DELETE CASCADE,
  order_id VARCHAR(64) REFERENCES orders(id) ON DELETE SET NULL,
  supply_id VARCHAR(64) REFERENCES inventory_supplies(id) ON DELETE SET NULL,
  wasted_grams INTEGER NOT NULL,
  waste_cost_cents INTEGER NOT NULL DEFAULT 0,
  failure_reason VARCHAR(180) NOT NULL,
  reprint_triggered BOOLEAN NOT NULL DEFAULT TRUE,
  recorded_by VARCHAR(120) NOT NULL DEFAULT 'Operador 3D',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. ORÇAMENTOS DE PERSONALIZADOS E PROJETOS SOB MEDIDA
CREATE TABLE IF NOT EXISTS custom_quotes (
  id VARCHAR(64) PRIMARY KEY,
  quote_number VARCHAR(40) UNIQUE NOT NULL,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  client_name VARCHAR(180) NOT NULL,
  client_email VARCHAR(180) NOT NULL,
  client_phone VARCHAR(40) NOT NULL,
  company_name VARCHAR(180),
  project_title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  intended_use VARCHAR(64) NOT NULL DEFAULT 'decorativo', -- 'decorativo' | 'funcional_mecanico' | 'externo_sol' | 'contato_agua' | 'lote_corporativo'
  preferred_material VARCHAR(40) NOT NULL DEFAULT 'PLA',
  preferred_color VARCHAR(80) NOT NULL DEFAULT 'Preto Fosco',
  dimensions_description VARCHAR(180),
  quantity INTEGER NOT NULL DEFAULT 1,
  deadline_desired VARCHAR(80),
  file_name VARCHAR(255),
  file_size_bytes INTEGER,
  file_checksum_sha256 VARCHAR(128),
  file_private_path TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'submitted',
  -- 'submitted' | 'analyzing' | 'quoted' | 'approved' | 'paid' | 'in_production' | 'completed' | 'rejected'
  estimated_grams INTEGER DEFAULT 220,
  estimated_print_minutes INTEGER DEFAULT 280,
  quoted_price_cents INTEGER,
  quoted_manufacturing_days INTEGER,
  quoted_validity_date DATE,
  converted_order_id VARCHAR(64) REFERENCES orders(id) ON DELETE SET NULL,
  admin_internal_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_quote_revisions (
  id VARCHAR(64) PRIMARY KEY,
  quote_id VARCHAR(64) NOT NULL REFERENCES custom_quotes(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL DEFAULT 1,
  author_role VARCHAR(32) NOT NULL, -- 'client' | 'admin'
  author_name VARCHAR(140) NOT NULL,
  message TEXT NOT NULL,
  proposed_price_cents INTEGER,
  proposed_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. GESTÃO FINANCEIRA (CAIXA VS. COMPETÊNCIA, CONTAS A PAGAR/RECEBER, CONCILIAÇÃO)
CREATE TABLE IF NOT EXISTS financial_accounts (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  account_type VARCHAR(32) NOT NULL, -- 'bank' | 'cash' | 'gateway'
  institution VARCHAR(100),
  balance_cents INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS financial_entries (
  id VARCHAR(64) PRIMARY KEY,
  entry_code VARCHAR(48) UNIQUE NOT NULL,
  direction VARCHAR(24) NOT NULL, -- 'receivable' | 'payable'
  category_code VARCHAR(48) NOT NULL,
  -- 'product_sale' | 'custom_project_sale' | 'b2b_sale' | 'shipping_revenue'
  -- 'raw_material_purchase' | 'packaging_purchase' | 'energy_utility' | 'equipment_maintenance'
  -- 'gateway_fee' | 'shipping_cost' | 'partner_commission' | 'marketing_ads' | 'taxes' | 'operational_expense'
  accounting_class VARCHAR(40) NOT NULL,
  -- 'gross_revenue' | 'deduction_discount' | 'cogs_supply_consumed' | 'inventory_asset_purchase' | 'gateway_fee' | 'shipping_expense' | 'partner_commission' | 'operating_expense' | 'tax_expense'
  description VARCHAR(255) NOT NULL,
  counterparty_name VARCHAR(180) NOT NULL,
  reference_type VARCHAR(40), -- 'order' | 'supply_purchase' | 'production_job' | 'partner_commission' | 'manual'
  reference_id VARCHAR(64),
  competence_date DATE NOT NULL,
  due_date DATE NOT NULL,
  installment_number INTEGER NOT NULL DEFAULT 1,
  total_installments INTEGER NOT NULL DEFAULT 1,
  gross_amount_cents INTEGER NOT NULL,
  paid_amount_cents INTEGER NOT NULL DEFAULT 0,
  fee_estimated_cents INTEGER NOT NULL DEFAULT 0,
  fee_actual_cents INTEGER,
  net_amount_cents INTEGER NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'reconciled'
  account_id VARCHAR(64) REFERENCES financial_accounts(id) ON DELETE SET NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS financial_reconciliations (
  id VARCHAR(64) PRIMARY KEY,
  entry_id VARCHAR(64) NOT NULL REFERENCES financial_entries(id) ON DELETE CASCADE,
  order_id VARCHAR(64) REFERENCES orders(id) ON DELETE SET NULL,
  gateway_name VARCHAR(64) NOT NULL DEFAULT 'Mercado Pago',
  expected_gross_cents INTEGER NOT NULL,
  expected_fee_cents INTEGER NOT NULL,
  actual_fee_cents INTEGER NOT NULL,
  fee_divergence_cents INTEGER NOT NULL,
  net_settled_cents INTEGER NOT NULL,
  reconciled_by VARCHAR(120) NOT NULL DEFAULT 'Admin RBS',
  notes TEXT,
  reconciled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. PRECIFICADOR E SIMULADOR DE IMPRESSÃO 3D
CREATE TABLE IF NOT EXISTS pricing_presets (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  filament_cost_per_kg_cents INTEGER NOT NULL DEFAULT 11000,
  kwh_rate_cents INTEGER NOT NULL DEFAULT 95, -- R$ 0,95 / kWh
  printer_power_watts INTEGER NOT NULL DEFAULT 350,
  machine_value_cents INTEGER NOT NULL DEFAULT 850000, -- R$ 8.500,00
  machine_lifespan_hours INTEGER NOT NULL DEFAULT 6000,
  maintenance_per_hour_cents INTEGER NOT NULL DEFAULT 80,
  operator_hour_rate_cents INTEGER NOT NULL DEFAULT 3500, -- R$ 35,00 / h
  default_failure_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  default_packaging_cents INTEGER NOT NULL DEFAULT 350,
  is_default BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS pricing_simulations (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
  simulation_name VARCHAR(180) NOT NULL,
  channel VARCHAR(48) NOT NULL DEFAULT 'loja_propria_cartao',
  lot_quantity INTEGER NOT NULL DEFAULT 1,
  part_grams NUMERIC(10,2) NOT NULL DEFAULT 150,
  support_purge_grams NUMERIC(10,2) NOT NULL DEFAULT 15,
  filament_cost_per_kg_cents INTEGER NOT NULL DEFAULT 11000,
  print_minutes INTEGER NOT NULL DEFAULT 180,
  post_process_minutes INTEGER NOT NULL DEFAULT 15,
  packaging_cents INTEGER NOT NULL DEFAULT 350,
  extra_inputs_cents INTEGER NOT NULL DEFAULT 0,
  energy_cost_cents INTEGER NOT NULL DEFAULT 0,
  depreciation_cost_cents INTEGER NOT NULL DEFAULT 0,
  labor_cost_cents INTEGER NOT NULL DEFAULT 0,
  failure_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  unit_direct_cost_cents INTEGER NOT NULL,
  fixed_fee_cents INTEGER NOT NULL DEFAULT 200,
  variable_fee_pct NUMERIC(6,2) NOT NULL DEFAULT 10.00,
  target_margin_pct NUMERIC(6,2) NOT NULL DEFAULT 25.00,
  suggested_unit_price_cents INTEGER NOT NULL,
  suggested_lot_price_cents INTEGER NOT NULL,
  net_unit_profit_cents INTEGER NOT NULL,
  real_margin_pct NUMERIC(6,2) NOT NULL,
  applied_to_product BOOLEAN NOT NULL DEFAULT FALSE,
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. MARKETING, BANNERS E PROMOÇÕES
CREATE TABLE IF NOT EXISTS promotions (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(48) UNIQUE NOT NULL,
  name VARCHAR(180) NOT NULL,
  promotion_type VARCHAR(40) NOT NULL DEFAULT 'percentage',
  -- 'percentage' | 'fixed_amount' | 'free_shipping' | 'progressive_qty' | 'kit_combo' | 'pix_discount'
  discount_value NUMERIC(10,2) NOT NULL,
  min_order_cents INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER NOT NULL DEFAULT 1,
  applies_to_product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
  applies_to_category_id VARCHAR(64) REFERENCES categories(id) ON DELETE SET NULL,
  max_uses INTEGER DEFAULT 500,
  current_uses INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'draft' | 'scheduled' | 'active' | 'paused' | 'expired'
  min_margin_guard_pct NUMERIC(5,2) NOT NULL DEFAULT 18.00,
  simulated_impact_json TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS banners (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  subtitle VARCHAR(255),
  cta_label VARCHAR(80) NOT NULL DEFAULT 'Explorar Coleção',
  cta_href VARCHAR(255) NOT NULL DEFAULT '/catalogo',
  placement VARCHAR(40) NOT NULL DEFAULT 'home_hero', -- 'home_hero' | 'home_secondary' | 'catalog_top' | 'promo_strip'
  desktop_image_url TEXT NOT NULL,
  mobile_image_url TEXT NOT NULL,
  desktop_crop_json TEXT DEFAULT '{"aspect":"16:6","zoom":1,"x":50,"y":50}',
  mobile_crop_json TEXT DEFAULT '{"aspect":"4:5","zoom":1.05,"x":50,"y":45}',
  focal_point_x INTEGER NOT NULL DEFAULT 50,
  focal_point_y INTEGER NOT NULL DEFAULT 50,
  badge_text VARCHAR(80),
  sort_order INTEGER NOT NULL DEFAULT 1,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. COMISSÕES DE PARCEIROS, REMESSAS CONSIGNADAS E ATIVOS EM COMODATO
CREATE TABLE IF NOT EXISTS partner_commissions (
  id VARCHAR(64) PRIMARY KEY,
  partner_id VARCHAR(64) NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  order_id VARCHAR(64) REFERENCES orders(id) ON DELETE SET NULL,
  origin_type VARCHAR(32) NOT NULL, -- 'affiliate_link' | 'coupon' | 'consignment_sale'
  calculation_base_cents INTEGER NOT NULL,
  commission_rate_pct NUMERIC(5,2) NOT NULL,
  commission_amount_cents INTEGER NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending_clearance', -- 'pending_clearance' | 'approved' | 'paid' | 'reversed'
  financial_entry_id VARCHAR(64) REFERENCES financial_entries(id) ON DELETE SET NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consignment_shipments (
  id VARCHAR(64) PRIMARY KEY,
  shipment_code VARCHAR(48) UNIQUE NOT NULL,
  partner_id VARCHAR(64) NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  location_id VARCHAR(64) NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active' | 'partially_settled' | 'settled' | 'returned'
  dispatched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expected_audit_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consignment_items (
  id VARCHAR(64) PRIMARY KEY,
  shipment_id VARCHAR(64) NOT NULL REFERENCES consignment_shipments(id) ON DELETE CASCADE,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variation_id VARCHAR(64) REFERENCES product_variations(id) ON DELETE SET NULL,
  dispatched_qty INTEGER NOT NULL,
  sold_qty INTEGER NOT NULL DEFAULT 0,
  returned_qty INTEGER NOT NULL DEFAULT 0,
  damaged_qty INTEGER NOT NULL DEFAULT 0,
  agreed_unit_price_cents INTEGER NOT NULL,
  partner_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 20.00
);

CREATE TABLE IF NOT EXISTS comodato_assets (
  id VARCHAR(64) PRIMARY KEY,
  asset_code VARCHAR(48) UNIQUE NOT NULL,
  partner_id VARCHAR(64) NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  location_id VARCHAR(64) NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  asset_name VARCHAR(180) NOT NULL,
  asset_type VARCHAR(48) NOT NULL DEFAULT 'expositor_acrilico_3d',
  quantity INTEGER NOT NULL DEFAULT 1,
  declared_value_cents INTEGER NOT NULL,
  condition_status VARCHAR(32) NOT NULL DEFAULT 'bom_estado', -- 'novo' | 'bom_estado' | 'avariado' | 'devolvido'
  loaned_at DATE NOT NULL,
  return_due_date DATE,
  returned_at DATE,
  notes TEXT
);

-- 13. INSTAGRAM (@rbscriacao), FACEBOOK CATALOG E PIXEL/CAPI
CREATE TABLE IF NOT EXISTS social_posts (
  id VARCHAR(64) PRIMARY KEY,
  instagram_handle VARCHAR(64) NOT NULL DEFAULT '@rbscriacao',
  external_post_id VARCHAR(120) UNIQUE NOT NULL,
  media_type VARCHAR(32) NOT NULL DEFAULT 'IMAGE', -- 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url TEXT NOT NULL,
  permalink TEXT NOT NULL,
  caption TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_featured_on_home BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible_on_page BOOLEAN NOT NULL DEFAULT TRUE,
  clicks_to_product_count INTEGER NOT NULL DEFAULT 0,
  sync_source VARCHAR(40) NOT NULL DEFAULT 'curated_fallback', -- 'meta_graph_api' | 'curated_fallback'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS social_post_products (
  id VARCHAR(64) PRIMARY KEY,
  post_id VARCHAR(64) NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  hotspot_x INTEGER NOT NULL DEFAULT 50,
  hotspot_y INTEGER NOT NULL DEFAULT 50
);

-- 14. INTELIGÊNCIA COMERCIAL — INTERESSE E OPORTUNIDADES
CREATE TABLE IF NOT EXISTS commercial_events (
  id VARCHAR(64) PRIMARY KEY,
  event_name VARCHAR(48) NOT NULL,
  -- 'product_view' | 'search_query' | 'wishlist_add' | 'wishlist_remove'
  -- 'cart_add' | 'cart_save_for_later' | 'cart_select_toggle'
  -- 'checkout_start' | 'checkout_selective_confirm' | 'payment_success' | 'payment_failed'
  -- 'interest_alert_subscribe' | 'instagram_product_click'
  session_key VARCHAR(120) NOT NULL,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
  variation_id VARCHAR(64) REFERENCES product_variations(id) ON DELETE SET NULL,
  order_id VARCHAR(64) REFERENCES orders(id) ON DELETE SET NULL,
  search_term VARCHAR(140),
  channel_source VARCHAR(48) DEFAULT 'direto',
  event_id_dedup VARCHAR(120),
  is_internal_or_bot BOOLEAN NOT NULL DEFAULT FALSE,
  metadata_json TEXT DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. FILA ASSÍNCRONA PERSISTENTE, AUDITORIA E CONFIGURAÇÕES
CREATE TABLE IF NOT EXISTS async_jobs (
  id VARCHAR(64) PRIMARY KEY,
  job_type VARCHAR(48) NOT NULL, -- 'send_email' | 'send_whatsapp' | 'meta_capi_event' | 'webhook_process' | 'interest_alert_dispatch'
  idempotency_key VARCHAR(120) UNIQUE NOT NULL,
  payload_json TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed_retryable' | 'dead_letter'
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  actor_user_id VARCHAR(64),
  actor_name VARCHAR(140) NOT NULL,
  actor_role VARCHAR(32) NOT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  before_json TEXT,
  after_json TEXT,
  ip_address VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS store_settings (
  key VARCHAR(80) PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_statuses ON orders(financial_status, production_status, fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_commercial_events_created ON commercial_events(created_at, event_name);
CREATE INDEX IF NOT EXISTS idx_commercial_events_product ON commercial_events(product_id, event_name);
CREATE INDEX IF NOT EXISTS idx_financial_entries_dates ON financial_entries(competence_date, due_date, direction);
