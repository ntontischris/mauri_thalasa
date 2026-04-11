-- ============================================================
-- Migration 007: CRM & Loyalty System
-- EatFlow POS - Customers, Visits, Loyalty Settings
-- ============================================================
-- Maps to: Customer, CustomerVisit, LoyaltySettings in lib/types.ts

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    birthday DATE,
    notes TEXT,
    is_vip BOOLEAN NOT NULL DEFAULT false,
    allergies TEXT[] NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    loyalty_points INTEGER NOT NULL DEFAULT 0,
    stamp_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer visit history linked to orders
-- Maps to: CustomerVisit interface in lib/types.ts
CREATE TABLE customer_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT now(),
    table_number INTEGER NOT NULL,
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    items TEXT[] NOT NULL DEFAULT '{}', -- product names for quick display
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Singleton loyalty program configuration
-- Maps to: LoyaltySettings interface in lib/types.ts
CREATE TABLE loyalty_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    points_per_euro NUMERIC(5,2) NOT NULL DEFAULT 1,
    points_for_reward INTEGER NOT NULL DEFAULT 100,
    reward_value NUMERIC(10,2) NOT NULL DEFAULT 5,
    stamps_for_free_item INTEGER NOT NULL DEFAULT 10,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER loyalty_settings_updated_at BEFORE UPDATE ON loyalty_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
