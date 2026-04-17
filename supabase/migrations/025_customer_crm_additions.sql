-- CRM additions: denormalized aggregates + marketing consent + auto-update trigger

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS last_visit_at timestamptz,
  ADD COLUMN IF NOT EXISTS total_visits int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent numeric(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers (phone);
CREATE INDEX IF NOT EXISTS customers_last_visit_idx ON customers (last_visit_at);
CREATE INDEX IF NOT EXISTS customers_birthday_md_idx
  ON customers ((EXTRACT(MONTH FROM birthday)), (EXTRACT(DAY FROM birthday)));

CREATE INDEX IF NOT EXISTS customer_visits_customer_date_idx
  ON customer_visits (customer_id, date DESC);

-- Auto-maintain customers.last_visit_at / total_visits / total_spent
-- whenever a customer_visits row is inserted.
CREATE OR REPLACE FUNCTION recompute_customer_aggregates()
RETURNS TRIGGER AS $func$
BEGIN
  UPDATE customers
     SET total_visits = (
           SELECT COUNT(*) FROM customer_visits WHERE customer_id = NEW.customer_id
         ),
         total_spent = (
           SELECT COALESCE(SUM(total), 0) FROM customer_visits WHERE customer_id = NEW.customer_id
         ),
         last_visit_at = (
           SELECT MAX(date) FROM customer_visits WHERE customer_id = NEW.customer_id
         )
   WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customer_visits_aggregate ON customer_visits;
CREATE TRIGGER customer_visits_aggregate
  AFTER INSERT ON customer_visits
  FOR EACH ROW EXECUTE FUNCTION recompute_customer_aggregates();

-- Backfill aggregates for existing data
UPDATE customers c
   SET total_visits = sub.visits,
       total_spent = sub.spent,
       last_visit_at = sub.last_visit
  FROM (
    SELECT customer_id,
           COUNT(*) AS visits,
           SUM(total) AS spent,
           MAX(date) AS last_visit
      FROM customer_visits
     GROUP BY customer_id
  ) sub
 WHERE c.id = sub.customer_id;

NOTIFY pgrst, 'reload schema';
