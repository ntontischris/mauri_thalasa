-- ============================================================
-- Migration 012: Performance Indexes
-- EatFlow POS - Optimize common query patterns
-- ============================================================
-- Indexes are designed around the query patterns observed in the
-- frontend hooks (use-orders.ts, use-analytics.ts, etc.)

-- === Orders ===
-- Filter active orders for kitchen display (use-kitchen.ts)
CREATE INDEX idx_orders_status ON orders(status);
-- Filter orders by table for table view
CREATE INDEX idx_orders_table_id ON orders(table_id);
-- Date range queries for analytics (use-analytics.ts)
CREATE INDEX idx_orders_created_at ON orders(created_at);
-- Combined: active orders per table (most common query)
CREATE INDEX idx_orders_table_status ON orders(table_id, status);

-- === Order Items ===
-- Filter items by order
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
-- Kitchen display: pending/preparing items
CREATE INDEX idx_order_items_status ON order_items(status);
-- Kitchen station routing
CREATE INDEX idx_order_items_station ON order_items(station);
-- Product sales analytics
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- === Order Item Modifiers ===
CREATE INDEX idx_order_item_modifiers_item_id ON order_item_modifiers(order_item_id);

-- === Tables ===
-- Floor plan: filter by zone
CREATE INDEX idx_tables_zone_id ON tables(zone_id);
-- Find available tables
CREATE INDEX idx_tables_status ON tables(status);

-- === Products ===
-- Menu display: filter by category
CREATE INDEX idx_products_category_id ON products(category_id);
-- Kitchen station routing
CREATE INDEX idx_products_station ON products(station);
-- Show only available products
CREATE INDEX idx_products_available ON products(available) WHERE available = true;

-- === Ingredients ===
-- Stock alerts: find low stock items (use-inventory.ts)
CREATE INDEX idx_ingredients_stock ON ingredients(current_stock, min_stock);
-- Filter by supplier
CREATE INDEX idx_ingredients_supplier_id ON ingredients(supplier_id);
-- Filter by category
CREATE INDEX idx_ingredients_category ON ingredients(category);

-- === Recipes ===
-- Find recipe by product (1:1 relationship)
CREATE INDEX idx_recipes_product_id ON recipes(product_id);

-- === Recipe Ingredients ===
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);

-- === Waste Log ===
-- Date range for waste reports
CREATE INDEX idx_waste_log_date ON waste_log(date);
CREATE INDEX idx_waste_log_ingredient_id ON waste_log(ingredient_id);

-- === Supplier Orders ===
CREATE INDEX idx_supplier_orders_supplier_id ON supplier_orders(supplier_id);
CREATE INDEX idx_supplier_orders_status ON supplier_orders(status);
CREATE INDEX idx_supplier_order_items_order_id ON supplier_order_items(supplier_order_id);

-- === Customers ===
-- Phone lookup for quick search
CREATE INDEX idx_customers_phone ON customers(phone);
-- VIP filtering
CREATE INDEX idx_customers_is_vip ON customers(is_vip) WHERE is_vip = true;
-- Name search (GIN trigram for fuzzy search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_customers_name_trgm ON customers USING gin(name gin_trgm_ops);

-- === Customer Visits ===
CREATE INDEX idx_customer_visits_customer_id ON customer_visits(customer_id);
CREATE INDEX idx_customer_visits_date ON customer_visits(date);
CREATE INDEX idx_customer_visits_order_id ON customer_visits(order_id);

-- === Shifts ===
-- Schedule view: filter by date range
CREATE INDEX idx_shifts_date ON shifts(date);
CREATE INDEX idx_shifts_staff_id ON shifts(staff_id);
-- Today's shift lookup
CREATE INDEX idx_shifts_staff_date ON shifts(staff_id, date);

-- === Staff Performance ===
CREATE INDEX idx_staff_performance_staff_id ON staff_performance(staff_id);
CREATE INDEX idx_staff_performance_period ON staff_performance(period_start, period_end);

-- === Chat Messages ===
-- Chronological display
CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp);

-- === Daily Summaries ===
-- Date lookup for reports
CREATE INDEX idx_daily_summaries_date ON daily_summaries(date);
CREATE INDEX idx_daily_top_products_summary_id ON daily_top_products(daily_summary_id);
CREATE INDEX idx_daily_hourly_revenue_summary_id ON daily_hourly_revenue(daily_summary_id);
