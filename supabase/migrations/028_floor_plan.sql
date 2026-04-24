-- ============================================================
-- Migration 028: Dynamic Multi-Floor Plan System
-- EatFlow POS — Owner-configurable tables, zones, floors
-- ============================================================
-- Enterprise restaurant POS (Toast / Square for Restaurants / Lightspeed):
--   - Multiple floors / levels (ground, upstairs, terrace)
--   - Zones per floor (smoking, VIP, window side)
--   - Tables with x/y/shape/rotation (schema already supports)
--   - Owner changes layout from /settings/floor-plan as often as daily

-- ───────────────── 1. floors ─────────────────
CREATE TABLE IF NOT EXISTS floors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    width NUMERIC(8,2) NOT NULL DEFAULT 1200,   -- canvas dimensions (px-ish)
    height NUMERIC(8,2) NOT NULL DEFAULT 800,
    background_url TEXT,                         -- optional blueprint/photo overlay
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_floors_sort ON floors(sort_order);
CREATE INDEX IF NOT EXISTS idx_floors_active ON floors(is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS floors_updated_at ON floors;
CREATE TRIGGER floors_updated_at BEFORE UPDATE ON floors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ───────────────── 2. Seed default floor + link existing zones ─────────────────
DO $$
DECLARE
    default_floor_id UUID;
BEGIN
    -- Only seed if no floors exist
    IF NOT EXISTS (SELECT 1 FROM floors) THEN
        INSERT INTO floors (name, sort_order) VALUES ('Κύριος Χώρος', 1)
        RETURNING id INTO default_floor_id;
    ELSE
        SELECT id INTO default_floor_id FROM floors ORDER BY sort_order LIMIT 1;
    END IF;

    -- Attach floor_id to zones if the column doesn't exist yet
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'zones' AND column_name = 'floor_id'
    ) THEN
        ALTER TABLE zones ADD COLUMN floor_id UUID REFERENCES floors(id) ON DELETE RESTRICT;
        UPDATE zones SET floor_id = default_floor_id WHERE floor_id IS NULL;
        ALTER TABLE zones ALTER COLUMN floor_id SET NOT NULL;
        CREATE INDEX idx_zones_floor ON zones(floor_id);
    END IF;
END $$;

-- ───────────────── 3. Table layout refinements ─────────────────
-- Add width/height per table for rectangular tables (currently only shape + rotation)
ALTER TABLE tables
    ADD COLUMN IF NOT EXISTS width NUMERIC(6,2) NOT NULL DEFAULT 80,
    ADD COLUMN IF NOT EXISTS height NUMERIC(6,2) NOT NULL DEFAULT 80,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS label TEXT;  -- optional override (e.g. "T5" vs number 5)

CREATE INDEX IF NOT EXISTS idx_tables_zone ON tables(zone_id);
CREATE INDEX IF NOT EXISTS idx_tables_active ON tables(is_active) WHERE is_active = true;

-- ───────────────── 4. Order enrichment for rich table cards ─────────────────
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS guest_count INTEGER NOT NULL DEFAULT 1
        CHECK (guest_count >= 0 AND guest_count <= 50);

-- ───────────────── 5. RLS ─────────────────
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'floors_all'
    ) THEN
        CREATE POLICY floors_all ON floors FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;
