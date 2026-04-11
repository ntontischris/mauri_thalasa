-- ============================================================
-- Migration 018: New Features
-- QR Ordering, Customer Feedback, Bar Management, AI
-- ============================================================

-- === Customer Feedback ===
CREATE TABLE customer_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    table_number INTEGER,
    overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    food_rating INTEGER CHECK (food_rating BETWEEN 1 AND 5),
    service_rating INTEGER CHECK (service_rating BETWEEN 1 AND 5),
    ambiance_rating INTEGER CHECK (ambiance_rating BETWEEN 1 AND 5),
    value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_order ON customer_feedback(order_id);
CREATE INDEX idx_feedback_rating ON customer_feedback(overall_rating);
CREATE INDEX idx_feedback_created ON customer_feedback(created_at);

ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_select" ON customer_feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "feedback_insert" ON customer_feedback FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "feedback_auth_insert" ON customer_feedback FOR INSERT TO authenticated WITH CHECK (true);

-- === Bar Management ===

CREATE TYPE spirit_category AS ENUM (
    'vodka', 'gin', 'rum', 'tequila', 'whiskey',
    'wine', 'beer', 'liqueur', 'mixer', 'garnish', 'other'
);

CREATE TYPE cocktail_method AS ENUM (
    'shaken', 'stirred', 'built', 'blended', 'muddled'
);

CREATE TABLE bottles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category spirit_category NOT NULL,
    volume INTEGER NOT NULL DEFAULT 700, -- ml
    cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    current_level INTEGER NOT NULL DEFAULT 100 CHECK (current_level BETWEEN 0 AND 100),
    is_open BOOLEAN NOT NULL DEFAULT false,
    opened_at TIMESTAMPTZ,
    par_level INTEGER NOT NULL DEFAULT 2,
    stock_count INTEGER NOT NULL DEFAULT 0,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cocktail_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    method cocktail_method NOT NULL DEFAULT 'built',
    glass TEXT NOT NULL DEFAULT 'Highball',
    garnish TEXT,
    instructions TEXT,
    cost_per_serving NUMERIC(10,2) NOT NULL DEFAULT 0,
    pour_cost_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cocktail_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cocktail_recipe_id UUID NOT NULL REFERENCES cocktail_recipes(id) ON DELETE CASCADE,
    bottle_id UUID NOT NULL REFERENCES bottles(id) ON DELETE RESTRICT,
    quantity NUMERIC(10,2) NOT NULL, -- ml
    is_optional BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE happy_hour_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    days_of_week INTEGER[] NOT NULL DEFAULT '{}',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    discount_percent INTEGER NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
    category_ids UUID[] NOT NULL DEFAULT '{}',
    product_ids UUID[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_bottles_category ON bottles(category);
CREATE INDEX idx_bottles_low_stock ON bottles(stock_count, par_level);
CREATE INDEX idx_cocktail_ingredients_recipe ON cocktail_ingredients(cocktail_recipe_id);

-- RLS
ALTER TABLE bottles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cocktail_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cocktail_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE happy_hour_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bottles_all" ON bottles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cocktails_all" ON cocktail_recipes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cocktail_ing_all" ON cocktail_ingredients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "happy_hour_all" ON happy_hour_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers
CREATE TRIGGER bottles_updated_at BEFORE UPDATE ON bottles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER cocktail_recipes_updated_at BEFORE UPDATE ON cocktail_recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- === QR Code Orders ===
-- Add order_type to distinguish dine-in from QR self-orders
-- (uses existing orders table, just needs source tracking)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_source TEXT NOT NULL DEFAULT 'pos';
-- order_source: 'pos' | 'qr_code' | 'online' | 'phone'

CREATE INDEX idx_orders_source ON orders(order_source);

-- === AI Predictions Cache ===
CREATE TABLE ai_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_type TEXT NOT NULL, -- 'pricing' | 'waste' | 'churn' | 'demand'
    data JSONB NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_ai_predictions_type ON ai_predictions(prediction_type);

ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_predictions_all" ON ai_predictions FOR ALL TO authenticated USING (true) WITH CHECK (true);
