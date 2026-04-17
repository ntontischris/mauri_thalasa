-- Phase 1 consolidated schema additions
-- Bundles all in-session DB changes that weren't captured as individual
-- migration files. Everything here is idempotent (IF NOT EXISTS / re-runnable
-- updates) so re-applying does nothing harmful.

-- ───────── Orders: tips + cancellation tracking ─────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tip_amount numeric(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

COMMENT ON COLUMN orders.tip_amount IS
  'Gratuity captured at checkout, in EUR. Separate from order total.';
COMMENT ON COLUMN orders.cancellation_reason IS
  'Free-text or preset reason. Populated by Ακύρωση dialog.';

-- ───────── Categories: station auto-routing ─────────
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS default_station text
    CHECK (default_station IN ('hot', 'cold', 'bar', 'dessert'));

COMMENT ON COLUMN categories.default_station IS
  'Auto-routing destination when products are created under this category. '
  'Drinks→bar, sweets→dessert, salads/cheeses→cold, everything else→hot.';

-- Seed heuristic ONLY where currently NULL (does not overwrite user choices).
UPDATE categories
   SET default_station = 'bar'
 WHERE default_station IS NULL
   AND name ~* '(ΚΡΑΣΙ|ΜΠΥΡ|ΟΥΖΟ|ΟΥΖΑ|ΤΣΙΠΟΥΡ|ΠΟΤΟ|ΠΟΤΑ|ΑΝΑΨΥΚΤ|ΣΑΜΠΑΝ|ΧΥΜΟ|ΝΕΡΟ|ΚΑΦΕ|ΤΣΑΪ|ΤΣΑΙ|ΡΟΦΗΜ)';

UPDATE categories
   SET default_station = 'dessert'
 WHERE default_station IS NULL
   AND name ~* '(ΕΠΙΔΟΡΠ|ΓΛΥΚ|ΠΑΓΩΤ|ΦΡΟΥΤ)';

UPDATE categories
   SET default_station = 'cold'
 WHERE default_station IS NULL
   AND name ~* '(ΣΑΛΑΤ|ΤΥΡΙ|ΚΡΥ|ΠΡΟΣΟΥΤ|ΑΛΛΑΝΤ)';

UPDATE categories
   SET default_station = 'hot'
 WHERE default_station IS NULL;

-- Sync existing products to their category's default station.
-- Safe: only touches products that disagree with their category's current default.
UPDATE products p
   SET station = c.default_station::station_type
  FROM categories c
 WHERE p.category_id = c.id
   AND c.default_station IS NOT NULL
   AND p.station::text <> c.default_station;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS orders_cancelled_at_idx ON orders (cancelled_at);
CREATE INDEX IF NOT EXISTS categories_default_station_idx ON categories (default_station);

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
