-- ============================================================
-- Migration 019: Enhanced Fields for Migration Support
-- Adds legacy_id, source, metadata to key tables
-- ============================================================

-- Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_alt TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS legacy_id INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'eatflow';
ALTER TABLE products ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Make vat_rate flexible (not just 13/24)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_vat_rate_check;
ALTER TABLE products ALTER COLUMN vat_rate TYPE NUMERIC(5,2) USING vat_rate::NUMERIC(5,2);

-- Categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS legacy_id INTEGER;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'eatflow';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS afm TEXT UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address JSONB DEFAULT '{}';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact JSONB DEFAULT '{}';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing JSONB DEFAULT '{}';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS discount NUMERIC(5,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS legacy_id INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'eatflow';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS afm TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address JSONB DEFAULT '{}';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS legacy_id INTEGER;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'eatflow';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Staff Members
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS legacy_id INTEGER;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'eatflow';
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff_members(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES staff_members(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS elorus_invoice_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fiscal_mark TEXT;

-- Tables
ALTER TABLE tables ADD COLUMN IF NOT EXISTS legacy_id INTEGER;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Zones
ALTER TABLE zones ADD COLUMN IF NOT EXISTS legacy_id INTEGER;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
