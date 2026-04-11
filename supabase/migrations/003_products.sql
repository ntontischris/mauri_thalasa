-- ============================================================
-- Migration 003: Products
-- EatFlow POS - Menu Products and Product-Modifier associations
-- ============================================================
-- Maps to: Product interface in lib/types.ts

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    description TEXT,
    vat_rate INTEGER NOT NULL DEFAULT 24 CHECK (vat_rate IN (13, 24)),
    available BOOLEAN NOT NULL DEFAULT true,
    station station_type NOT NULL DEFAULT 'hot',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Junction: which modifiers are assigned to which products
-- Maps to: Product.modifierIds[] in lib/types.ts
CREATE TABLE product_modifiers (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    modifier_id UUID NOT NULL REFERENCES modifiers(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, modifier_id)
);

CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
