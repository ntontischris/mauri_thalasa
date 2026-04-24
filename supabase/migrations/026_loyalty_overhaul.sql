-- ============================================================
-- Migration 026: Professional Loyalty System (audit ledger + tiers + catalog)
-- EatFlow POS — Replaces the singleton loyalty_settings-only model
-- ============================================================
-- Design:
--   1. loyalty_transactions — immutable append-only ledger. Balance = SUM(points).
--   2. loyalty_tiers — configurable tiers with multipliers + perks.
--   3. loyalty_rewards — redeemable catalog (multiple rewards, not one fixed €5).
--   4. customers.tier_id + customers.points_cache — tier + denormalized balance.
--   5. loyalty_settings extended: expiration, welcome bonus, birthday multiplier.

-- ───────────────── 1. Ledger ─────────────────
CREATE TYPE loyalty_txn_kind AS ENUM (
    'earn',          -- order points earned
    'redeem',        -- reward redemption (points deducted, negative)
    'adjust',        -- manual manager adjustment (± either sign)
    'bonus',         -- welcome / birthday / winback / promo
    'referral',      -- referral reward
    'expire',        -- system-expired points (negative)
    'opening'        -- one-shot backfill from old loyalty_points column
);

CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    kind loyalty_txn_kind NOT NULL,
    points INTEGER NOT NULL,                    -- can be negative (redeem/expire/adjust)
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    reward_id UUID,                             -- FK added after loyalty_rewards created
    note TEXT,
    expires_at TIMESTAMPTZ,                     -- null for non-earn or if eternal
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID                             -- staff user if manual; null for auto
);

CREATE INDEX idx_loyalty_txn_customer ON loyalty_transactions(customer_id, created_at DESC);
CREATE INDEX idx_loyalty_txn_order ON loyalty_transactions(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_loyalty_txn_expires ON loyalty_transactions(expires_at)
  WHERE expires_at IS NOT NULL AND kind = 'earn';

-- ───────────────── 2. Tiers ─────────────────
CREATE TABLE loyalty_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                         -- "Bronze", "Silver", "Gold", "Platinum"
    sort_order INTEGER NOT NULL,                -- 1..N ascending
    min_spend_12m NUMERIC(10,2) NOT NULL DEFAULT 0,
    min_visits_12m INTEGER NOT NULL DEFAULT 0,
    point_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00,   -- 1.0 Bronze, 1.5 Silver, 2.0 Gold …
    color TEXT NOT NULL DEFAULT '#64748b',      -- UI swatch
    icon TEXT,                                  -- lucide name
    perks TEXT[] NOT NULL DEFAULT '{}',         -- free-form perk strings
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_loyalty_tiers_sort ON loyalty_tiers(sort_order);

CREATE TRIGGER loyalty_tiers_updated_at BEFORE UPDATE ON loyalty_tiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ───────────────── 3. Rewards catalog ─────────────────
CREATE TYPE loyalty_reward_kind AS ENUM (
    'discount',      -- fixed € off total
    'free_item',     -- specific product free
    'percent_off',   -- % off total
    'custom'         -- free text (e.g. "Free dessert")
);

CREATE TABLE loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    kind loyalty_reward_kind NOT NULL DEFAULT 'discount',
    points_cost INTEGER NOT NULL CHECK (points_cost > 0),
    value NUMERIC(10,2) NOT NULL DEFAULT 0,     -- € amount or % depending on kind
    product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- for free_item
    min_tier_id UUID REFERENCES loyalty_tiers(id) ON DELETE SET NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    stock INTEGER,                              -- null = unlimited; else decremented per redeem
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loyalty_rewards_active ON loyalty_rewards(active, sort_order);
CREATE TRIGGER loyalty_rewards_updated_at BEFORE UPDATE ON loyalty_rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Now add the FK on transactions pointing at rewards
ALTER TABLE loyalty_transactions
  ADD CONSTRAINT loyalty_transactions_reward_fk
  FOREIGN KEY (reward_id) REFERENCES loyalty_rewards(id) ON DELETE SET NULL;

-- ───────────────── 4. Customer denormalized fields ─────────────────
ALTER TABLE customers
    ADD COLUMN tier_id UUID REFERENCES loyalty_tiers(id) ON DELETE SET NULL,
    ADD COLUMN tier_updated_at TIMESTAMPTZ,
    ADD COLUMN lifetime_points INTEGER NOT NULL DEFAULT 0,  -- cumulative earned (for tier calc)
    ADD COLUMN points_expiring_at TIMESTAMPTZ;              -- earliest expiration for UI

CREATE INDEX idx_customers_tier ON customers(tier_id);

-- ───────────────── 5. Extend loyalty_settings ─────────────────
ALTER TABLE loyalty_settings
    ADD COLUMN expiration_months INTEGER NOT NULL DEFAULT 18,
    ADD COLUMN welcome_bonus INTEGER NOT NULL DEFAULT 50,
    ADD COLUMN birthday_multiplier NUMERIC(3,1) NOT NULL DEFAULT 2.0,
    ADD COLUMN winback_bonus INTEGER NOT NULL DEFAULT 50,
    ADD COLUMN winback_days INTEGER NOT NULL DEFAULT 45,
    ADD COLUMN referral_bonus INTEGER NOT NULL DEFAULT 100;

-- ───────────────── 6. Seed default tiers & rewards ─────────────────
INSERT INTO loyalty_tiers (name, sort_order, min_spend_12m, min_visits_12m, point_multiplier, color, icon, perks)
VALUES
    ('Bronze',   1,    0, 0, 1.00, '#b45309', 'Award', '{"1× πόντοι","Ενημερώσεις για νέα πιάτα"}'),
    ('Silver',   2,  300, 3, 1.25, '#64748b', 'Medal', '{"1.25× πόντοι","Προτεραιότητα στην κράτηση"}'),
    ('Gold',     3,  800, 8, 1.50, '#ca8a04', 'Crown', '{"1.5× πόντοι","Δωρεάν κρασί στη 2η επίσκεψη/μήνα"}'),
    ('Platinum', 4, 2000, 20, 2.00, '#7c3aed', 'Gem',  '{"2× πόντοι","VIP τραπέζι","Έκπληξη σεφ"}');

INSERT INTO loyalty_rewards (name, description, kind, points_cost, value, sort_order, active)
VALUES
    ('€5 έκπτωση',        'Έκπτωση σε οποιαδήποτε παραγγελία',            'discount',    100,  5.00, 1, true),
    ('€10 έκπτωση',       'Έκπτωση σε οποιαδήποτε παραγγελία',            'discount',    200, 10.00, 2, true),
    ('€20 έκπτωση',       'Έκπτωση σε οποιαδήποτε παραγγελία',            'discount',    400, 20.00, 3, true),
    ('Δωρεάν επιδόρπιο',  'Επιλέξτε από την κάρτα επιδορπίων',             'custom',       80,  0.00, 4, true),
    ('Δωρεάν καραφάκι',   'Καραφάκι οίκου (λευκό ή ροζέ)',                  'custom',      120,  0.00, 5, true),
    ('10% έκπτωση',       'Έκπτωση 10% στο σύνολο (μέγιστο €30)',           'percent_off', 250, 10.00, 6, true);

-- ───────────────── 7. Backfill: one opening-balance txn per existing customer ─────────────────
INSERT INTO loyalty_transactions (customer_id, kind, points, note, created_at)
SELECT id, 'opening', loyalty_points, 'Backfill from legacy loyalty_points column', NOW()
FROM customers
WHERE loyalty_points > 0;

-- Set lifetime_points = max(loyalty_points, total_spent * default points_per_euro) as best-effort.
UPDATE customers SET lifetime_points = loyalty_points
WHERE loyalty_points > 0;

-- Assign every active customer to tier based on their rolling spend.
UPDATE customers c
SET tier_id = t.id, tier_updated_at = NOW()
FROM loyalty_tiers t
WHERE t.id = (
    SELECT tt.id FROM loyalty_tiers tt
    WHERE tt.min_spend_12m <= c.total_spent
      AND tt.min_visits_12m <= c.total_visits
    ORDER BY tt.sort_order DESC
    LIMIT 1
);

-- ───────────────── 8. RLS ─────────────────
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_tiers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards      ENABLE ROW LEVEL SECURITY;

CREATE POLICY loyalty_transactions_all ON loyalty_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY loyalty_tiers_all        ON loyalty_tiers        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY loyalty_rewards_all      ON loyalty_rewards      FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ───────────────── 9. Balance helper view (debugging + reports) ─────────────────
CREATE OR REPLACE VIEW customer_loyalty_balance AS
SELECT
    c.id AS customer_id,
    c.name,
    COALESCE(SUM(lt.points), 0) AS balance,
    COALESCE(SUM(CASE WHEN lt.kind = 'earn' THEN lt.points ELSE 0 END), 0) AS total_earned,
    COALESCE(SUM(CASE WHEN lt.kind = 'redeem' THEN -lt.points ELSE 0 END), 0) AS total_redeemed,
    MIN(CASE WHEN lt.kind = 'earn' AND lt.expires_at > NOW() THEN lt.expires_at END) AS next_expiration
FROM customers c
LEFT JOIN loyalty_transactions lt ON lt.customer_id = c.id
GROUP BY c.id, c.name;
