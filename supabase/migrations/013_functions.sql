-- ============================================================
-- Migration 013: Database Functions
-- EatFlow POS - Business logic in the database layer
-- ============================================================
-- These mirror the helper functions in lib/pos-context.tsx
-- (calculateTotal, calculateVAT, deductStockForOrder, autoDisableProducts)

-- ============================================================
-- 1. Calculate order total from items + modifiers
-- Maps to: calculateTotal() in pos-context.tsx:195
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_order_total(p_order_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_total NUMERIC(10,2);
BEGIN
    SELECT COALESCE(SUM(
        (oi.price + COALESCE(mod_totals.modifier_total, 0)) * oi.quantity
    ), 0)
    INTO v_total
    FROM order_items oi
    LEFT JOIN (
        SELECT order_item_id, SUM(price) AS modifier_total
        FROM order_item_modifiers
        GROUP BY order_item_id
    ) mod_totals ON mod_totals.order_item_id = oi.id
    WHERE oi.order_id = p_order_id;

    RETURN v_total;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 2. Calculate VAT amount for an order
-- Maps to: calculateVAT() in pos-context.tsx:205
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_order_vat(p_order_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_vat NUMERIC(10,2);
BEGIN
    SELECT COALESCE(SUM(
        ((oi.price + COALESCE(mod_totals.modifier_total, 0)) * oi.quantity * p.vat_rate)
        / (100 + p.vat_rate)
    ), 0)
    INTO v_vat
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    LEFT JOIN (
        SELECT order_item_id, SUM(price) AS modifier_total
        FROM order_item_modifiers
        GROUP BY order_item_id
    ) mod_totals ON mod_totals.order_item_id = oi.id
    WHERE oi.order_id = p_order_id;

    RETURN v_vat;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 3. Recalculate and update order totals
-- Called after items are added/removed/modified
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_order_totals(p_order_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE orders
    SET total = calculate_order_total(p_order_id),
        vat_amount = calculate_order_vat(p_order_id)
    WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. Deduct stock when an order is completed
-- Maps to: deductStockForOrder() in pos-context.tsx:218
-- ============================================================
CREATE OR REPLACE FUNCTION deduct_stock_for_order(p_order_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE ingredients ing
    SET current_stock = GREATEST(0,
        ing.current_stock - sub.total_used
    )
    FROM (
        SELECT ri.ingredient_id,
               SUM(ri.quantity * oi.quantity) AS total_used
        FROM order_items oi
        JOIN recipes r ON r.product_id = oi.product_id
        JOIN recipe_ingredients ri ON ri.recipe_id = r.id
        WHERE oi.order_id = p_order_id
        GROUP BY ri.ingredient_id
    ) sub
    WHERE ing.id = sub.ingredient_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. Auto-disable products with low stock ingredients
-- Maps to: autoDisableProducts() in pos-context.tsx:245
-- ============================================================
CREATE OR REPLACE FUNCTION auto_disable_low_stock_products()
RETURNS void AS $$
BEGIN
    UPDATE products p
    SET available = false
    WHERE p.available = true
    AND EXISTS (
        SELECT 1
        FROM recipes r
        JOIN recipe_ingredients ri ON ri.recipe_id = r.id
        JOIN ingredients ing ON ing.id = ri.ingredient_id
        WHERE r.product_id = p.id
        AND ing.current_stock < ing.min_stock
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. Complete an order: set status, payment, deduct stock
-- Maps to: COMPLETE_ORDER action in pos-context.tsx
-- ============================================================
CREATE OR REPLACE FUNCTION complete_order(
    p_order_id UUID,
    p_payment_method payment_method
)
RETURNS void AS $$
DECLARE
    v_table_id UUID;
BEGIN
    -- Get the table associated with this order
    SELECT table_id INTO v_table_id FROM orders WHERE id = p_order_id;

    -- Recalculate totals
    PERFORM recalculate_order_totals(p_order_id);

    -- Mark order as completed
    UPDATE orders
    SET status = 'completed',
        completed_at = now(),
        payment_method = p_payment_method
    WHERE id = p_order_id;

    -- Deduct ingredient stock
    PERFORM deduct_stock_for_order(p_order_id);

    -- Auto-disable products with low stock
    PERFORM auto_disable_low_stock_products();

    -- Free the table
    UPDATE tables
    SET status = 'dirty',
        current_order_id = NULL
    WHERE id = v_table_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. Transfer order between tables
-- Maps to: TRANSFER_TABLE action in pos-context.tsx:321
-- ============================================================
CREATE OR REPLACE FUNCTION transfer_table(
    p_order_id UUID,
    p_from_table_id UUID,
    p_to_table_id UUID
)
RETURNS void AS $$
DECLARE
    v_to_table_number INTEGER;
BEGIN
    -- Get the target table number
    SELECT number INTO v_to_table_number FROM tables WHERE id = p_to_table_id;

    -- Update the order to point to new table
    UPDATE orders
    SET table_id = p_to_table_id,
        table_number = v_to_table_number
    WHERE id = p_order_id;

    -- Free the source table
    UPDATE tables
    SET status = 'available',
        current_order_id = NULL
    WHERE id = p_from_table_id;

    -- Occupy the target table
    UPDATE tables
    SET status = 'occupied',
        current_order_id = p_order_id
    WHERE id = p_to_table_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. Add loyalty points based on order total
-- Maps to: ADD_LOYALTY_POINTS action in pos-context.tsx
-- ============================================================
CREATE OR REPLACE FUNCTION add_loyalty_points_for_order(
    p_customer_id UUID,
    p_order_total NUMERIC
)
RETURNS void AS $$
DECLARE
    v_points_per_euro NUMERIC;
    v_points_to_add INTEGER;
BEGIN
    SELECT points_per_euro INTO v_points_per_euro
    FROM loyalty_settings LIMIT 1;

    v_points_to_add := FLOOR(p_order_total * v_points_per_euro);

    UPDATE customers
    SET loyalty_points = loyalty_points + v_points_to_add,
        stamp_count = stamp_count + 1
    WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9. Redeem loyalty points
-- Maps to: REDEEM_LOYALTY_POINTS action in pos-context.tsx
-- ============================================================
CREATE OR REPLACE FUNCTION redeem_loyalty_points(
    p_customer_id UUID,
    p_points INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_points INTEGER;
BEGIN
    SELECT loyalty_points INTO v_current_points
    FROM customers WHERE id = p_customer_id;

    IF v_current_points < p_points THEN
        RETURN false;
    END IF;

    UPDATE customers
    SET loyalty_points = loyalty_points - p_points
    WHERE id = p_customer_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 10. Redeem stamps (reset stamp count)
-- Maps to: REDEEM_STAMPS action in pos-context.tsx
-- ============================================================
CREATE OR REPLACE FUNCTION redeem_stamps(p_customer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_stamps INTEGER;
    v_required INTEGER;
BEGIN
    SELECT stamp_count INTO v_stamps FROM customers WHERE id = p_customer_id;
    SELECT stamps_for_free_item INTO v_required FROM loyalty_settings LIMIT 1;

    IF v_stamps < v_required THEN
        RETURN false;
    END IF;

    UPDATE customers
    SET stamp_count = stamp_count - v_required
    WHERE id = p_customer_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 11. Adjust ingredient stock (manual adjustment)
-- Maps to: ADJUST_STOCK action in pos-context.tsx
-- ============================================================
CREATE OR REPLACE FUNCTION adjust_stock(
    p_ingredient_id UUID,
    p_quantity NUMERIC
)
RETURNS void AS $$
BEGIN
    UPDATE ingredients
    SET current_stock = GREATEST(0, current_stock + p_quantity)
    WHERE id = p_ingredient_id;

    -- Auto-disable products if stock dropped below minimum
    PERFORM auto_disable_low_stock_products();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 12. Receive supplier order: update status and stock
-- Maps to: RECEIVE_SUPPLIER_ORDER action in pos-context.tsx
-- ============================================================
CREATE OR REPLACE FUNCTION receive_supplier_order(p_supplier_order_id UUID)
RETURNS void AS $$
BEGIN
    -- Mark order as received
    UPDATE supplier_orders
    SET status = 'received'
    WHERE id = p_supplier_order_id;

    -- Add ordered quantities to ingredient stock
    UPDATE ingredients ing
    SET current_stock = ing.current_stock + soi.quantity
    FROM supplier_order_items soi
    WHERE soi.supplier_order_id = p_supplier_order_id
    AND soi.ingredient_id = ing.id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 13. Generate daily summary from completed orders
-- Used by analytics dashboards
-- ============================================================
CREATE OR REPLACE FUNCTION generate_daily_summary(p_date DATE)
RETURNS UUID AS $$
DECLARE
    v_summary_id UUID;
    v_total_revenue NUMERIC;
    v_order_count INTEGER;
    v_cash NUMERIC;
    v_card NUMERIC;
BEGIN
    -- Calculate aggregates
    SELECT
        COALESCE(SUM(total), 0),
        COUNT(*),
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END), 0)
    INTO v_total_revenue, v_order_count, v_cash, v_card
    FROM orders
    WHERE status = 'completed'
    AND created_at::date = p_date;

    -- Upsert summary
    INSERT INTO daily_summaries (date, total_revenue, order_count, average_check, cash_payments, card_payments)
    VALUES (
        p_date,
        v_total_revenue,
        v_order_count,
        CASE WHEN v_order_count > 0 THEN v_total_revenue / v_order_count ELSE 0 END,
        v_cash,
        v_card
    )
    ON CONFLICT (date) DO UPDATE SET
        total_revenue = EXCLUDED.total_revenue,
        order_count = EXCLUDED.order_count,
        average_check = EXCLUDED.average_check,
        cash_payments = EXCLUDED.cash_payments,
        card_payments = EXCLUDED.card_payments
    RETURNING id INTO v_summary_id;

    -- Populate top products
    DELETE FROM daily_top_products WHERE daily_summary_id = v_summary_id;
    INSERT INTO daily_top_products (daily_summary_id, product_id, product_name, quantity, revenue)
    SELECT v_summary_id, oi.product_id, oi.product_name,
           SUM(oi.quantity), SUM(oi.price * oi.quantity)
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status = 'completed' AND o.created_at::date = p_date
    GROUP BY oi.product_id, oi.product_name
    ORDER BY SUM(oi.quantity) DESC
    LIMIT 10;

    -- Populate hourly revenue
    DELETE FROM daily_hourly_revenue WHERE daily_summary_id = v_summary_id;
    INSERT INTO daily_hourly_revenue (daily_summary_id, hour, revenue)
    SELECT v_summary_id, EXTRACT(HOUR FROM o.created_at)::integer, SUM(o.total)
    FROM orders o
    WHERE o.status = 'completed' AND o.created_at::date = p_date
    GROUP BY EXTRACT(HOUR FROM o.created_at);

    RETURN v_summary_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 14. Clock in/out functions for staff shifts
-- Maps to: CLOCK_IN, CLOCK_OUT actions in pos-context.tsx
-- ============================================================
CREATE OR REPLACE FUNCTION clock_in(p_staff_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE shifts
    SET clock_in = now()
    WHERE staff_id = p_staff_id
    AND date = CURRENT_DATE
    AND clock_in IS NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION clock_out(p_staff_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE shifts
    SET clock_out = now()
    WHERE staff_id = p_staff_id
    AND date = CURRENT_DATE
    AND clock_out IS NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 15. Reset checklist items by type
-- Maps to: RESET_CHECKLIST action in pos-context.tsx
-- ============================================================
CREATE OR REPLACE FUNCTION reset_checklist(p_type checklist_type)
RETURNS void AS $$
BEGIN
    UPDATE checklist_items
    SET checked = false
    WHERE type = p_type;
END;
$$ LANGUAGE plpgsql;
