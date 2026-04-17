-- Phase 1: Auto-course assignment based on category
-- Waiters don't pick courses; each category maps to its natural serving order.
-- Course 1 = starters, salads, cheeses, cold dishes, drinks (served first together)
-- Course 2 = mains (fish, meat, fried, pasta, fasting mains)
-- Course 3 = desserts, fruits, ice cream, coffee

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS default_course int NOT NULL DEFAULT 1;

-- Course 3: desserts and after-meal items
UPDATE categories
SET default_course = 3
WHERE name ~* '(ΕΠΙΔΟΡΠ|ΓΛΥΚ|ΦΡΟΥΤ|ΠΑΓΩΤ|ΚΑΦΕ|ΡΟΦΗΜ|ΤΣΑΪ|ΤΣΑΙ)'
  AND default_course = 1;

-- Course 2: main dishes
UPDATE categories
SET default_course = 2
WHERE name ~* '(ΨΑΡΙ|ΚΡΕΑΣ|ΚΡΕΑΤ|ΚΥΡΙΩΣ|ΜΑΚΑΡΟΝ|ΝΗΣΤΙΣΙΜ|ΜΕΡΙΔΑ|ΚΙΛΟ|ΚΟΤΟΠΟΥΛ|ΜΟΣΧΑΡ|ΛΟΥΚΑΝΙΚ|ΜΠΙΦΤΕΚΙ|ΧΟΙΡΙΝ|ΑΡΝΙ|ΘΑΛΑΣΣΙΝ|ΜΑΓΕΙΡΕΥΤ|ΠΑΣΤΑ|ΡΙΖΟΤΟ|ΤΗΓΑΝΗΤ)'
  AND default_course = 1;

-- Index for potential future ordering by course
CREATE INDEX IF NOT EXISTS categories_default_course_idx
  ON categories (default_course);

COMMENT ON COLUMN categories.default_course IS
  'Serving order for items in this category: 1=appetizers+drinks, 2=mains, 3=desserts';
