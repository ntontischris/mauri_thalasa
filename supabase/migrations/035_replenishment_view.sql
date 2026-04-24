-- ============================================================
-- Migration 035: replenishment_needed view
-- ============================================================
-- Brain gap: min_stock has existed since migration 005 but
-- nothing consumes it. Managers discover low stock by manually
-- scrolling the inventory list.
--
-- This ships a view that the /inventory page (and a future
-- nightly auto-PO job) can query directly. Suggested quantity =
-- 2 × min_stock − current_stock, clamped to a reasonable floor.
-- Shape is intentionally flat so the UI can render it with no
-- joins.
-- ============================================================

CREATE OR REPLACE VIEW replenishment_needed AS
SELECT
    ing.id                                        AS ingredient_id,
    ing.name                                      AS ingredient_name,
    ing.unit,
    ing.current_stock,
    ing.min_stock,
    ing.cost_per_unit,
    ing.category,
    ing.supplier_id,
    sup.name                                      AS supplier_name,
    (ing.min_stock - ing.current_stock)::NUMERIC(10, 3)
                                                  AS shortfall,
    GREATEST(ing.min_stock * 2 - ing.current_stock, ing.min_stock)::NUMERIC(10, 3)
                                                  AS suggested_order_qty,
    CASE
        WHEN ing.current_stock <= 0                      THEN 'critical'
        WHEN ing.current_stock < ing.min_stock * 0.5     THEN 'high'
        ELSE 'normal'
    END                                           AS urgency
FROM ingredients ing
LEFT JOIN suppliers sup ON sup.id = ing.supplier_id
WHERE ing.min_stock > 0
  AND ing.current_stock < ing.min_stock;
