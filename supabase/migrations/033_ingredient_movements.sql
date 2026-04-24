-- ============================================================
-- Migration 033: ingredient_movements — stock ledger
-- ============================================================
-- Brain gap: ingredients.current_stock is a running total. Every
-- order deduction, supplier receipt, manual adjust, and waste
-- entry mutates it, but nothing records the delta. No way to
-- answer "why did olive oil stock drop 3kg on Thursday?".
--
-- This migration adds an append-only ledger. Every stock-changing
-- function now writes a movement row with a reason + reference.
-- Also fixes a latent bug: inserting a waste_log entry previously
-- did NOT decrement current_stock. It now does, via trigger, and
-- the movement is logged.
-- ============================================================

CREATE TYPE ingredient_movement_reason AS ENUM (
    'order_deduct',      -- recipe consumption on order completion
    'supplier_receive',  -- supplier delivery
    'manual_adjust',     -- manager correction (+/-)
    'waste',             -- logged in waste_log
    'initial_stock',     -- initial seed / import
    'correction'         -- audit correction (out-of-band)
);

CREATE TABLE ingredient_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,

    -- Signed delta applied. Positive = stock IN, negative = stock OUT.
    quantity_delta NUMERIC(14, 4) NOT NULL,

    -- Snapshot of stock AFTER this movement was applied. Makes
    -- point-in-time reconstruction O(1) instead of needing a sum
    -- across all prior rows.
    stock_after NUMERIC(14, 4) NOT NULL,

    reason ingredient_movement_reason NOT NULL,

    -- Optional reference back to the domain entity that caused
    -- the movement (order id for deductions, supplier_order id
    -- for receipts, waste_log id for waste, etc.).
    ref_type TEXT,
    ref_id UUID,

    note TEXT,
    staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingredient_movements_ingredient_occurred
    ON ingredient_movements(ingredient_id, occurred_at DESC);
CREATE INDEX idx_ingredient_movements_reason_occurred
    ON ingredient_movements(reason, occurred_at DESC);
CREATE INDEX idx_ingredient_movements_ref
    ON ingredient_movements(ref_type, ref_id);

ALTER TABLE ingredient_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY ingredient_movements_select
    ON ingredient_movements FOR SELECT TO authenticated USING (true);

-- No INSERT/UPDATE/DELETE policies for authenticated: writes go
-- through the functions below, which run under service-role when
-- called from server actions, or bypass RLS via SECURITY DEFINER
-- when triggered. Keeping the table app-append-only prevents any
-- client from forging movement rows.

-- ============================================================
-- Helper: DRY the movement insert, including the stock_after
-- snapshot. SECURITY DEFINER so triggers can call it even if
-- the caller's RLS context would otherwise block INSERT.
-- ============================================================
CREATE OR REPLACE FUNCTION log_ingredient_movement(
    p_ingredient_id UUID,
    p_delta NUMERIC,
    p_reason ingredient_movement_reason,
    p_ref_type TEXT,
    p_ref_id UUID,
    p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_stock_after NUMERIC(14, 4);
BEGIN
    IF p_delta = 0 THEN
        RETURN;  -- no-op movements are noise
    END IF;

    SELECT current_stock INTO v_stock_after
    FROM ingredients WHERE id = p_ingredient_id;

    INSERT INTO ingredient_movements (
        ingredient_id, quantity_delta, stock_after, reason,
        ref_type, ref_id, note, staff_id
    ) VALUES (
        p_ingredient_id, p_delta, COALESCE(v_stock_after, 0), p_reason,
        p_ref_type, p_ref_id, p_note, public.current_staff_id()
    );
END;
$$;

-- ============================================================
-- Replace deduct_stock_for_order to log each affected ingredient
-- ============================================================
CREATE OR REPLACE FUNCTION deduct_stock_for_order(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT ri.ingredient_id,
               SUM(ri.quantity * oi.quantity) AS total_used
        FROM order_items oi
        JOIN recipes r ON r.product_id = oi.product_id
        JOIN recipe_ingredients ri ON ri.recipe_id = r.id
        WHERE oi.order_id = p_order_id
        GROUP BY ri.ingredient_id
    LOOP
        UPDATE ingredients
        SET current_stock = GREATEST(0, current_stock - r.total_used)
        WHERE id = r.ingredient_id;

        PERFORM log_ingredient_movement(
            r.ingredient_id, -r.total_used, 'order_deduct',
            'order', p_order_id, NULL
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Replace adjust_stock to log the delta
-- ============================================================
CREATE OR REPLACE FUNCTION adjust_stock(
    p_ingredient_id UUID,
    p_quantity NUMERIC
)
RETURNS VOID AS $$
BEGIN
    UPDATE ingredients
    SET current_stock = GREATEST(0, current_stock + p_quantity)
    WHERE id = p_ingredient_id;

    PERFORM log_ingredient_movement(
        p_ingredient_id, p_quantity, 'manual_adjust',
        'manual', NULL, NULL
    );

    PERFORM auto_disable_low_stock_products();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Replace receive_supplier_order to log each received line
-- ============================================================
CREATE OR REPLACE FUNCTION receive_supplier_order(p_supplier_order_id UUID)
RETURNS VOID AS $$
DECLARE
    r RECORD;
BEGIN
    UPDATE supplier_orders
    SET status = 'received'
    WHERE id = p_supplier_order_id;

    FOR r IN
        SELECT soi.ingredient_id, soi.quantity
        FROM supplier_order_items soi
        WHERE soi.supplier_order_id = p_supplier_order_id
    LOOP
        UPDATE ingredients
        SET current_stock = current_stock + r.quantity
        WHERE id = r.ingredient_id;

        PERFORM log_ingredient_movement(
            r.ingredient_id, r.quantity, 'supplier_receive',
            'supplier_order', p_supplier_order_id, NULL
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Trigger on waste_log: deduct stock + log movement
-- (Previously waste was recorded but did NOT decrement stock.
--  This fixes that latent bug.)
-- ============================================================
CREATE OR REPLACE FUNCTION waste_log_apply_to_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE ingredients
    SET current_stock = GREATEST(0, current_stock - NEW.quantity)
    WHERE id = NEW.ingredient_id;

    PERFORM log_ingredient_movement(
        NEW.ingredient_id, -NEW.quantity, 'waste',
        'waste_log', NEW.id, NEW.reason::TEXT
    );

    PERFORM auto_disable_low_stock_products();
    RETURN NEW;
END;
$$;

CREATE TRIGGER waste_log_apply_to_stock_trg
    AFTER INSERT ON waste_log
    FOR EACH ROW EXECUTE FUNCTION waste_log_apply_to_stock();
