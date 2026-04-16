-- ============================================================
-- CLEANUP - Remove ALL test data
-- Run this in Supabase SQL Editor BEFORE adding real data
-- Order matters due to foreign key constraints
-- ============================================================

-- Delete order-related data first
DELETE FROM order_item_modifiers;
DELETE FROM order_items;
DELETE FROM orders;

-- Delete tables and zones
DELETE FROM tables;
DELETE FROM zones;

-- Verify cleanup
SELECT 'zones' AS table_name, COUNT(*) AS remaining FROM zones
UNION ALL
SELECT 'tables', COUNT(*) FROM tables
UNION ALL
SELECT 'orders', COUNT(*) FROM orders;
