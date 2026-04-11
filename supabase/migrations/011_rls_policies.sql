-- ============================================================
-- Migration 011: Row Level Security (RLS) Policies
-- EatFlow POS - Secure access control for all tables
-- ============================================================
-- RLS ensures data isolation per restaurant/tenant.
-- For single-tenant deployment: policies allow all authenticated users.
-- For multi-tenant: add tenant_id column and restrict accordingly.

-- Enable RLS on all tables
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_top_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_hourly_revenue ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Policies for authenticated users (single-tenant)
-- All authenticated users can read/write all data.
-- ============================================================

-- ZONES
CREATE POLICY "zones_select" ON zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "zones_insert" ON zones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "zones_update" ON zones FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "zones_delete" ON zones FOR DELETE TO authenticated USING (true);

-- CATEGORIES
CREATE POLICY "categories_select" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_insert" ON categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "categories_update" ON categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "categories_delete" ON categories FOR DELETE TO authenticated USING (true);

-- MODIFIERS
CREATE POLICY "modifiers_select" ON modifiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "modifiers_insert" ON modifiers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "modifiers_update" ON modifiers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "modifiers_delete" ON modifiers FOR DELETE TO authenticated USING (true);

-- MODIFIER_CATEGORIES
CREATE POLICY "modifier_categories_select" ON modifier_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "modifier_categories_insert" ON modifier_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "modifier_categories_delete" ON modifier_categories FOR DELETE TO authenticated USING (true);

-- TABLES
CREATE POLICY "tables_select" ON tables FOR SELECT TO authenticated USING (true);
CREATE POLICY "tables_insert" ON tables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tables_update" ON tables FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "tables_delete" ON tables FOR DELETE TO authenticated USING (true);

-- PRODUCTS
CREATE POLICY "products_select" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_insert" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "products_update" ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "products_delete" ON products FOR DELETE TO authenticated USING (true);

-- PRODUCT_MODIFIERS
CREATE POLICY "product_modifiers_select" ON product_modifiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "product_modifiers_insert" ON product_modifiers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "product_modifiers_delete" ON product_modifiers FOR DELETE TO authenticated USING (true);

-- ORDERS
CREATE POLICY "orders_select" ON orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "orders_insert" ON orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "orders_update" ON orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "orders_delete" ON orders FOR DELETE TO authenticated USING (true);

-- ORDER_ITEMS
CREATE POLICY "order_items_select" ON order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "order_items_insert" ON order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "order_items_update" ON order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "order_items_delete" ON order_items FOR DELETE TO authenticated USING (true);

-- ORDER_ITEM_MODIFIERS
CREATE POLICY "order_item_modifiers_select" ON order_item_modifiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "order_item_modifiers_insert" ON order_item_modifiers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "order_item_modifiers_delete" ON order_item_modifiers FOR DELETE TO authenticated USING (true);

-- SUPPLIERS
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "suppliers_update" ON suppliers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "suppliers_delete" ON suppliers FOR DELETE TO authenticated USING (true);

-- INGREDIENTS
CREATE POLICY "ingredients_select" ON ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "ingredients_insert" ON ingredients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ingredients_update" ON ingredients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ingredients_delete" ON ingredients FOR DELETE TO authenticated USING (true);

-- RECIPES
CREATE POLICY "recipes_select" ON recipes FOR SELECT TO authenticated USING (true);
CREATE POLICY "recipes_insert" ON recipes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "recipes_update" ON recipes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "recipes_delete" ON recipes FOR DELETE TO authenticated USING (true);

-- RECIPE_INGREDIENTS
CREATE POLICY "recipe_ingredients_select" ON recipe_ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "recipe_ingredients_insert" ON recipe_ingredients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "recipe_ingredients_update" ON recipe_ingredients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "recipe_ingredients_delete" ON recipe_ingredients FOR DELETE TO authenticated USING (true);

-- WASTE_LOG
CREATE POLICY "waste_log_select" ON waste_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "waste_log_insert" ON waste_log FOR INSERT TO authenticated WITH CHECK (true);

-- SUPPLIER_ORDERS
CREATE POLICY "supplier_orders_select" ON supplier_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "supplier_orders_insert" ON supplier_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "supplier_orders_update" ON supplier_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- SUPPLIER_ORDER_ITEMS
CREATE POLICY "supplier_order_items_select" ON supplier_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "supplier_order_items_insert" ON supplier_order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "supplier_order_items_delete" ON supplier_order_items FOR DELETE TO authenticated USING (true);

-- CUSTOMERS
CREATE POLICY "customers_select" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "customers_insert" ON customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "customers_update" ON customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "customers_delete" ON customers FOR DELETE TO authenticated USING (true);

-- CUSTOMER_VISITS
CREATE POLICY "customer_visits_select" ON customer_visits FOR SELECT TO authenticated USING (true);
CREATE POLICY "customer_visits_insert" ON customer_visits FOR INSERT TO authenticated WITH CHECK (true);

-- LOYALTY_SETTINGS
CREATE POLICY "loyalty_settings_select" ON loyalty_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "loyalty_settings_update" ON loyalty_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- STAFF_MEMBERS
CREATE POLICY "staff_members_select" ON staff_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_members_insert" ON staff_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "staff_members_update" ON staff_members FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_members_delete" ON staff_members FOR DELETE TO authenticated USING (true);

-- SHIFTS
CREATE POLICY "shifts_select" ON shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "shifts_insert" ON shifts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shifts_update" ON shifts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- CHECKLIST_ITEMS
CREATE POLICY "checklist_items_select" ON checklist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "checklist_items_insert" ON checklist_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "checklist_items_update" ON checklist_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- STAFF_PERFORMANCE
CREATE POLICY "staff_performance_select" ON staff_performance FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_performance_insert" ON staff_performance FOR INSERT TO authenticated WITH CHECK (true);

-- CHAT_MESSAGES
CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "chat_messages_delete" ON chat_messages FOR DELETE TO authenticated USING (true);

-- AI_SETTINGS
CREATE POLICY "ai_settings_select" ON ai_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_settings_update" ON ai_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- DAILY_SUMMARIES
CREATE POLICY "daily_summaries_select" ON daily_summaries FOR SELECT TO authenticated USING (true);
CREATE POLICY "daily_summaries_insert" ON daily_summaries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "daily_summaries_update" ON daily_summaries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- DAILY_TOP_PRODUCTS
CREATE POLICY "daily_top_products_select" ON daily_top_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "daily_top_products_insert" ON daily_top_products FOR INSERT TO authenticated WITH CHECK (true);

-- DAILY_HOURLY_REVENUE
CREATE POLICY "daily_hourly_revenue_select" ON daily_hourly_revenue FOR SELECT TO authenticated USING (true);
CREATE POLICY "daily_hourly_revenue_insert" ON daily_hourly_revenue FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "daily_hourly_revenue_update" ON daily_hourly_revenue FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Allow anon read on specific tables for PIN login
-- Staff members need to be readable without auth for PIN-based login
-- ============================================================
CREATE POLICY "staff_members_anon_select" ON staff_members FOR SELECT TO anon
    USING (true);

-- Loyalty settings readable for public display
CREATE POLICY "loyalty_settings_anon_select" ON loyalty_settings FOR SELECT TO anon
    USING (true);
