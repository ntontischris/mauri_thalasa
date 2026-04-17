-- Phase 1: Dynamic courses + category→course assignment
-- Replaces the hardcoded `categories.default_course int` from migration 022.
-- Restaurant owner manages courses (names, order, colors) and category
-- assignments via the /settings/courses UI.

-- 1) Create the courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS courses_sort_order_idx ON courses (sort_order);

-- 2) updated_at auto-touch trigger (reuse the generic helper if it exists,
--    otherwise declare it locally for courses only).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'touch_updated_at') THEN
    CREATE OR REPLACE FUNCTION touch_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

DROP TRIGGER IF EXISTS courses_touch_updated_at ON courses;
CREATE TRIGGER courses_touch_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 3) Seed three bootstrap courses (idempotent via name match).
INSERT INTO courses (name, sort_order, color)
SELECT 'Ορεκτικά & Ποτά', 1, '#22c55e'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE name = 'Ορεκτικά & Ποτά');

INSERT INTO courses (name, sort_order, color)
SELECT 'Κυρίως', 2, '#3b82f6'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE name = 'Κυρίως');

INSERT INTO courses (name, sort_order, color)
SELECT 'Επιδόρπια', 3, '#ec4899'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE name = 'Επιδόρπια');

-- 4) Add course_id FK to categories
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS categories_course_id_idx ON categories (course_id);

-- 5) Backfill course_id from the old default_course int (if it still exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'default_course'
  ) THEN
    UPDATE categories c
       SET course_id = sub.id
      FROM (SELECT id, sort_order FROM courses) sub
     WHERE c.course_id IS NULL
       AND c.default_course = sub.sort_order;
  END IF;
END $$;

-- 6) Drop the obsolete default_course column
ALTER TABLE categories DROP COLUMN IF EXISTS default_course;

-- 7) RLS: allow authenticated users to read, manage-role to write.
--    Mirrors the permissive pattern used by other POS tables for now
--    (single-restaurant deployment; tightening can come later).
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courses_select ON courses;
CREATE POLICY courses_select ON courses FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS courses_insert ON courses;
CREATE POLICY courses_insert ON courses FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS courses_update ON courses;
CREATE POLICY courses_update ON courses FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS courses_delete ON courses;
CREATE POLICY courses_delete ON courses FOR DELETE
  TO authenticated USING (true);

COMMENT ON TABLE courses IS
  'Serving-sequence groups (e.g. Ορεκτικά, Κυρίως, Επιδόρπια). User-defined.';
COMMENT ON COLUMN courses.sort_order IS
  'Display and serving order — also snapshotted into order_items.course at insert time.';
