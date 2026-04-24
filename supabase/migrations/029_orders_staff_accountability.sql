-- ============================================================
-- Migration 029: Per-order staff accountability indexes
-- ============================================================
-- The orders.created_by and orders.completed_by columns already
-- exist (added in migration 019 as staff_members FKs). What was
-- missing: indexes for staff-scoped queries + code that actually
-- populates them (see lib/actions/orders.ts, same commit).
--
-- Enforcement of NOT NULL is deferred until backfill + one full
-- reporting cycle confirms every new order is attributed.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orders_created_by
    ON orders(created_by);

CREATE INDEX IF NOT EXISTS idx_orders_created_by_created_at
    ON orders(created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_completed_by
    ON orders(completed_by);
