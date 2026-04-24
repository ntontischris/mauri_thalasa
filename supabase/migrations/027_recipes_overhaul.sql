-- ============================================================
-- Migration 027: Recipe Management Overhaul
-- EatFlow POS — Add professional food-cost fields to recipes
-- ============================================================
-- Extends the existing `recipes` table with fields used by every
-- top-tier recipe management platform (MarketMan, Apicbase, xtraCHEF):
--   - method               : prep instructions
--   - allergens            : per-recipe allergen tags (auto-derived or manual)
--   - difficulty           : 1..5 chef rating
--   - servings             : how many portions the recipe yields
--   - yield_pct            : 0..100, accounts for prep loss (e.g. fish cleaning)
--   - photo_url            : reference photo for plating
--   - target_food_cost_pct : per-recipe override of the restaurant-wide target

ALTER TABLE recipes
    ADD COLUMN IF NOT EXISTS method TEXT,
    ADD COLUMN IF NOT EXISTS allergens TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS difficulty INTEGER NOT NULL DEFAULT 1
        CHECK (difficulty BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS servings INTEGER NOT NULL DEFAULT 1
        CHECK (servings >= 1),
    ADD COLUMN IF NOT EXISTS yield_pct NUMERIC(5,2) NOT NULL DEFAULT 100
        CHECK (yield_pct > 0 AND yield_pct <= 100),
    ADD COLUMN IF NOT EXISTS photo_url TEXT,
    ADD COLUMN IF NOT EXISTS target_food_cost_pct NUMERIC(5,2)
        CHECK (target_food_cost_pct IS NULL OR (target_food_cost_pct > 0 AND target_food_cost_pct < 100));

-- Helpful index for lookup-by-product (already UNIQUE but btree helps joined selects)
CREATE INDEX IF NOT EXISTS idx_recipes_product_id ON recipes(product_id);

-- The ingredients table has cost_per_unit; make sure we can filter low-cost
CREATE INDEX IF NOT EXISTS idx_ingredients_cost ON ingredients(cost_per_unit);
