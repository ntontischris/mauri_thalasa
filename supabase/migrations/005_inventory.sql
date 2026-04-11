-- ============================================================
-- Migration 005: Inventory Management
-- EatFlow POS - Ingredients, Recipes, Recipe Ingredients, Waste Log
-- ============================================================
-- Maps to: Ingredient, Recipe, RecipeIngredient, WasteEntry in lib/types.ts

-- Suppliers table (created here since ingredients reference it)
-- Maps to: Supplier interface in lib/types.ts
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    categories ingredient_category[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Raw ingredients / inventory items
-- Maps to: Ingredient interface in lib/types.ts
CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unit ingredient_unit NOT NULL DEFAULT 'kg',
    current_stock NUMERIC(10,3) NOT NULL DEFAULT 0,
    min_stock NUMERIC(10,3) NOT NULL DEFAULT 0,
    cost_per_unit NUMERIC(10,2) NOT NULL DEFAULT 0,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    category ingredient_category NOT NULL DEFAULT 'other',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recipes linking products to their ingredient requirements
-- Maps to: Recipe interface in lib/types.ts
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    prep_time INTEGER NOT NULL DEFAULT 0, -- minutes
    portion_size TEXT NOT NULL DEFAULT '1 μερίδα',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(product_id) -- one recipe per product
);

-- Ingredients required for each recipe
-- Maps to: RecipeIngredient interface in lib/types.ts
CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity NUMERIC(10,4) NOT NULL,
    unit ingredient_unit NOT NULL,
    UNIQUE(recipe_id, ingredient_id)
);

-- Waste/spoilage tracking log
-- Maps to: WasteEntry interface in lib/types.ts
CREATE TABLE waste_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity NUMERIC(10,3) NOT NULL,
    reason waste_reason NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER ingredients_updated_at BEFORE UPDATE ON ingredients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER recipes_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
