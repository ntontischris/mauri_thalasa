-- supabase/migrations/036_floor_layouts.sql
BEGIN;

-- 1. Tables
CREATE TABLE floor_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  is_active BOOLEAN NOT NULL DEFAULT false,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (floor_id, name)
);

CREATE UNIQUE INDEX one_active_layout_per_floor
  ON floor_layouts (floor_id) WHERE is_active = true;

CREATE TABLE floor_layout_positions (
  layout_id UUID NOT NULL REFERENCES floor_layouts(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  rotation INTEGER NOT NULL DEFAULT 0 CHECK (rotation >= 0 AND rotation < 360),
  zone_id UUID REFERENCES zones(id),
  is_visible BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (layout_id, table_id)
);

CREATE INDEX idx_layout_positions_layout ON floor_layout_positions(layout_id);
CREATE INDEX idx_layout_positions_table ON floor_layout_positions(table_id);

-- 2. Backfill: one default layout per floor (active or not)
INSERT INTO floor_layouts (floor_id, name, is_active, sort_order)
SELECT id, 'Κύρια Διάταξη', true, 0
FROM floors;

-- Backfill positions from current tables
INSERT INTO floor_layout_positions (layout_id, table_id, x, y, rotation, zone_id, is_visible)
SELECT fl.id, t.id, COALESCE(t.x, 0), COALESCE(t.y, 0), COALESCE(t.rotation, 0), t.zone_id, t.is_active
FROM tables t
JOIN zones z ON z.id = t.zone_id
JOIN floor_layouts fl ON fl.floor_id = z.floor_id AND fl.is_active = true;

-- 3. Sync triggers: keep tables.x/y/rotation/zone_id mirrored to active layout
CREATE OR REPLACE FUNCTION sync_table_from_layout_position()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM floor_layouts WHERE id = NEW.layout_id AND is_active = true) THEN
    UPDATE tables
    SET x = NEW.x, y = NEW.y, rotation = NEW.rotation, zone_id = NEW.zone_id
    WHERE id = NEW.table_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_table_from_position
AFTER INSERT OR UPDATE ON floor_layout_positions
FOR EACH ROW EXECUTE FUNCTION sync_table_from_layout_position();

CREATE OR REPLACE FUNCTION sync_tables_on_layout_activation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true AND (OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
    UPDATE tables t
    SET x = p.x, y = p.y, rotation = p.rotation, zone_id = p.zone_id
    FROM floor_layout_positions p
    WHERE p.layout_id = NEW.id AND p.table_id = t.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_on_layout_activate
AFTER UPDATE OF is_active ON floor_layouts
FOR EACH ROW EXECUTE FUNCTION sync_tables_on_layout_activation();

CREATE TRIGGER floor_layouts_updated_at
  BEFORE UPDATE ON floor_layouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS: read for all authenticated, write for managers only (matches migration 030 pattern)
ALTER TABLE floor_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_layout_positions ENABLE ROW LEVEL SECURITY;

-- floor_layouts: read for all authenticated, write for managers only
CREATE POLICY floor_layouts_select ON floor_layouts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY floor_layouts_insert_manager ON floor_layouts
  FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY floor_layouts_update_manager ON floor_layouts
  FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY floor_layouts_delete_manager ON floor_layouts
  FOR DELETE TO authenticated USING (public.is_manager());

-- floor_layout_positions: same split
CREATE POLICY floor_layout_positions_select ON floor_layout_positions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY floor_layout_positions_insert_manager ON floor_layout_positions
  FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY floor_layout_positions_update_manager ON floor_layout_positions
  FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY floor_layout_positions_delete_manager ON floor_layout_positions
  FOR DELETE TO authenticated USING (public.is_manager());

COMMIT;
