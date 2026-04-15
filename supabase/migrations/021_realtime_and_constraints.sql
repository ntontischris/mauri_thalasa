-- ============================================================
-- Migration 021: Enable Realtime + Active Order Constraint
-- EatFlow POS - Phase 2: Core POS
-- ============================================================

-- Enable Realtime on tables needed for live POS updates
ALTER PUBLICATION supabase_realtime ADD TABLE tables;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;

-- Ensure only ONE active order per table at a time
-- Prevents race conditions when two waiters open the same table
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_one_active_per_table
  ON orders(table_id)
  WHERE status = 'active';
