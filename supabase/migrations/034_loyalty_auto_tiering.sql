-- ============================================================
-- Migration 034: loyalty auto-tiering
-- ============================================================
-- The brain gap: customers.tier_id exists since migration 026 but
-- nothing promotes a customer to the correct tier as their spend
-- accumulates. The tier stays at whatever was assigned initially
-- (usually NULL or Bronze).
--
-- This migration:
--   1. Defines recalculate_customer_tier(customer_id) — picks the
--      highest tier whose min_spend_12m and min_visits_12m are
--      both satisfied by the customer's trailing-12-month aggregates.
--   2. Adds a trigger on customer_visits so every new visit
--      triggers a tier recalculation for that customer.
--   3. Exposes recalculate_all_tiers() for ad-hoc / scheduled runs
--      (nightly cron, or after a tier rules change).
--
-- Downgrade behavior: if a customer's 12-month spend drops below
-- their current tier's threshold, they ARE downgraded. Run
-- recalculate_all_tiers() on a schedule to catch decay — the
-- per-visit trigger only catches upgrades.
-- ============================================================

CREATE OR REPLACE FUNCTION recalculate_customer_tier(p_customer_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_spend_12m   NUMERIC(12, 2);
    v_visits_12m  INTEGER;
    v_target_tier UUID;
    v_current_tier UUID;
BEGIN
    SELECT
        COALESCE(SUM(total), 0),
        COUNT(*)
    INTO v_spend_12m, v_visits_12m
    FROM customer_visits
    WHERE customer_id = p_customer_id
      AND date >= (now() - INTERVAL '12 months');

    -- Highest-sort-order tier whose thresholds are met.
    SELECT id
    INTO v_target_tier
    FROM loyalty_tiers
    WHERE min_spend_12m  <= v_spend_12m
      AND min_visits_12m <= v_visits_12m
    ORDER BY sort_order DESC
    LIMIT 1;

    SELECT tier_id INTO v_current_tier
    FROM customers WHERE id = p_customer_id;

    -- Only write if something changed, so tier_updated_at stays
    -- meaningful and triggers don't fire unnecessarily.
    IF v_target_tier IS DISTINCT FROM v_current_tier THEN
        UPDATE customers
        SET tier_id = v_target_tier,
            tier_updated_at = now()
        WHERE id = p_customer_id;
    END IF;

    RETURN v_target_tier;
END;
$$;

-- Trigger: every new visit recomputes the tier for that customer.
CREATE OR REPLACE FUNCTION customer_visits_recalc_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.customer_id IS NOT NULL THEN
        PERFORM recalculate_customer_tier(NEW.customer_id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER customer_visits_recalc_tier_trg
    AFTER INSERT ON customer_visits
    FOR EACH ROW EXECUTE FUNCTION customer_visits_recalc_tier();

-- Bulk recompute — nightly cron target + manual re-tier button.
-- Returns the number of customers whose tier actually changed.
CREATE OR REPLACE FUNCTION recalculate_all_tiers()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_changed INTEGER := 0;
    r RECORD;
    v_target UUID;
    v_current UUID;
BEGIN
    FOR r IN SELECT id, tier_id FROM customers LOOP
        v_target := recalculate_customer_tier(r.id);
        IF v_target IS DISTINCT FROM r.tier_id THEN
            v_changed := v_changed + 1;
        END IF;
    END LOOP;
    RETURN v_changed;
END;
$$;
