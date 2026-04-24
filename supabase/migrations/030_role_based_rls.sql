-- ============================================================
-- Migration 030: Role-based RLS for admin/config tables
-- ============================================================
-- Baseline from migration 011 (and later migrations) granted full
-- CRUD to every authenticated user on every table. The middleware
-- in app/(pos)/layout guards UX access, but a rogue staff session
-- could still bypass it by calling Supabase directly (DevTools,
-- curl with the cookie, etc.). This migration adds defense-in-depth
-- by restricting write access on config tables to managers only.
--
-- Scope: config/admin tables that a non-manager has no business
-- writing. Operational tables (orders, order_items, tables,
-- ingredients stock, shifts, customers, reservations, waste_log,
-- etc.) stay permissive — every staff role needs to operate them.
--
-- Role source: auth.jwt()->'user_metadata'->>'role'. Set by
-- lib/actions/auth.ts::ensureStaffAccount at PIN login.
--
-- NOTE: users must re-login after a role change for the JWT to
-- reflect the new role.
-- ============================================================

-- Helper: manager check from JWT user_metadata
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'manager',
    false
  );
$$;

-- ============================================================
-- Helpers for the repetitive drop+create dance.
-- No psql \set or DO block — we want every change to be a line of
-- DDL you can read in isolation.
-- ============================================================

-- ------------------------------------------------------------
-- products
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_update" ON products;
DROP POLICY IF EXISTS "products_delete" ON products;
CREATE POLICY products_insert_manager ON products FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());
CREATE POLICY products_update_manager ON products FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY products_delete_manager ON products FOR DELETE TO authenticated
  USING (public.is_manager());

-- ------------------------------------------------------------
-- categories
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "categories_insert" ON categories;
DROP POLICY IF EXISTS "categories_update" ON categories;
DROP POLICY IF EXISTS "categories_delete" ON categories;
CREATE POLICY categories_insert_manager ON categories FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());
CREATE POLICY categories_update_manager ON categories FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY categories_delete_manager ON categories FOR DELETE TO authenticated
  USING (public.is_manager());

-- ------------------------------------------------------------
-- modifiers
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "modifiers_insert" ON modifiers;
DROP POLICY IF EXISTS "modifiers_update" ON modifiers;
DROP POLICY IF EXISTS "modifiers_delete" ON modifiers;
CREATE POLICY modifiers_insert_manager ON modifiers FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());
CREATE POLICY modifiers_update_manager ON modifiers FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY modifiers_delete_manager ON modifiers FOR DELETE TO authenticated
  USING (public.is_manager());

-- ------------------------------------------------------------
-- modifier_categories
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "modifier_categories_insert" ON modifier_categories;
DROP POLICY IF EXISTS "modifier_categories_delete" ON modifier_categories;
CREATE POLICY modifier_categories_insert_manager ON modifier_categories FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());
CREATE POLICY modifier_categories_delete_manager ON modifier_categories FOR DELETE TO authenticated
  USING (public.is_manager());

-- ------------------------------------------------------------
-- product_modifiers
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "product_modifiers_insert" ON product_modifiers;
DROP POLICY IF EXISTS "product_modifiers_delete" ON product_modifiers;
CREATE POLICY product_modifiers_insert_manager ON product_modifiers FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());
CREATE POLICY product_modifiers_delete_manager ON product_modifiers FOR DELETE TO authenticated
  USING (public.is_manager());

-- ------------------------------------------------------------
-- zones  (table layout / floor plan config)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "zones_insert" ON zones;
DROP POLICY IF EXISTS "zones_update" ON zones;
DROP POLICY IF EXISTS "zones_delete" ON zones;
CREATE POLICY zones_insert_manager ON zones FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());
CREATE POLICY zones_update_manager ON zones FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY zones_delete_manager ON zones FOR DELETE TO authenticated
  USING (public.is_manager());

-- ------------------------------------------------------------
-- floors  (from 028_floor_plan.sql; was a single FOR ALL policy)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS floors_all ON floors;
CREATE POLICY floors_select ON floors FOR SELECT TO authenticated USING (true);
CREATE POLICY floors_insert_manager ON floors FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());
CREATE POLICY floors_update_manager ON floors FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY floors_delete_manager ON floors FOR DELETE TO authenticated
  USING (public.is_manager());

-- ------------------------------------------------------------
-- staff_members  (PIN hash, role, wage-sensitive fields)
-- SELECT stays permissive (needed for PIN login + staff UI lists)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "staff_members_insert" ON staff_members;
DROP POLICY IF EXISTS "staff_members_update" ON staff_members;
DROP POLICY IF EXISTS "staff_members_delete" ON staff_members;
CREATE POLICY staff_members_insert_manager ON staff_members FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());
CREATE POLICY staff_members_update_manager ON staff_members FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY staff_members_delete_manager ON staff_members FOR DELETE TO authenticated
  USING (public.is_manager());

-- ------------------------------------------------------------
-- loyalty_settings  (single-row config table; UPDATE only)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "loyalty_settings_update" ON loyalty_settings;
CREATE POLICY loyalty_settings_update_manager ON loyalty_settings FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());

-- ------------------------------------------------------------
-- loyalty_tiers  (from 026, was FOR ALL)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS loyalty_tiers_all ON loyalty_tiers;
CREATE POLICY loyalty_tiers_select ON loyalty_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY loyalty_tiers_insert_manager ON loyalty_tiers FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());
CREATE POLICY loyalty_tiers_update_manager ON loyalty_tiers FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY loyalty_tiers_delete_manager ON loyalty_tiers FOR DELETE TO authenticated
  USING (public.is_manager());

-- ------------------------------------------------------------
-- loyalty_rewards  (from 026, was FOR ALL)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS loyalty_rewards_all ON loyalty_rewards;
CREATE POLICY loyalty_rewards_select ON loyalty_rewards FOR SELECT TO authenticated USING (true);
CREATE POLICY loyalty_rewards_insert_manager ON loyalty_rewards FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());
CREATE POLICY loyalty_rewards_update_manager ON loyalty_rewards FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY loyalty_rewards_delete_manager ON loyalty_rewards FOR DELETE TO authenticated
  USING (public.is_manager());

-- NOTE: loyalty_transactions stays permissive — earned on every
-- order completion by any staff role.

-- ------------------------------------------------------------
-- ai_settings  (API key, single-row config)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "ai_settings_update" ON ai_settings;
CREATE POLICY ai_settings_update_manager ON ai_settings FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());

-- ------------------------------------------------------------
-- booking_settings  (public booking hours, policy, templates)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "booking_settings_update" ON booking_settings;
CREATE POLICY booking_settings_update_manager ON booking_settings FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());

-- ------------------------------------------------------------
-- message_templates  (SMS / email templates)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "message_templates_insert" ON message_templates;
DROP POLICY IF EXISTS "message_templates_update" ON message_templates;
DROP POLICY IF EXISTS "message_templates_delete" ON message_templates;
CREATE POLICY message_templates_insert_manager ON message_templates FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());
CREATE POLICY message_templates_update_manager ON message_templates FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY message_templates_delete_manager ON message_templates FOR DELETE TO authenticated
  USING (public.is_manager());

-- ------------------------------------------------------------
-- suppliers
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "suppliers_insert" ON suppliers;
DROP POLICY IF EXISTS "suppliers_update" ON suppliers;
DROP POLICY IF EXISTS "suppliers_delete" ON suppliers;
CREATE POLICY suppliers_insert_manager ON suppliers FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());
CREATE POLICY suppliers_update_manager ON suppliers FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY suppliers_delete_manager ON suppliers FOR DELETE TO authenticated
  USING (public.is_manager());

-- ------------------------------------------------------------
-- recipes
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "recipes_insert" ON recipes;
DROP POLICY IF EXISTS "recipes_update" ON recipes;
DROP POLICY IF EXISTS "recipes_delete" ON recipes;
CREATE POLICY recipes_insert_manager ON recipes FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());
CREATE POLICY recipes_update_manager ON recipes FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY recipes_delete_manager ON recipes FOR DELETE TO authenticated
  USING (public.is_manager());

-- ------------------------------------------------------------
-- recipe_ingredients
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "recipe_ingredients_insert" ON recipe_ingredients;
DROP POLICY IF EXISTS "recipe_ingredients_update" ON recipe_ingredients;
DROP POLICY IF EXISTS "recipe_ingredients_delete" ON recipe_ingredients;
CREATE POLICY recipe_ingredients_insert_manager ON recipe_ingredients FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());
CREATE POLICY recipe_ingredients_update_manager ON recipe_ingredients FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY recipe_ingredients_delete_manager ON recipe_ingredients FOR DELETE TO authenticated
  USING (public.is_manager());

-- ============================================================
-- Left permissive intentionally (operational):
--   orders, order_items, order_item_modifiers
--   tables                  (status updates by waiter/chef)
--   ingredients             (dual-purpose: config + stock; stock by chef)
--   shifts, checklist_items, staff_performance
--   customers, customer_visits
--   reservations, waitlist, caller_id_log
--   waste_log
--   loyalty_transactions    (written on checkout by every role)
--   chat_messages
--   supplier_orders, supplier_order_items
--   campaigns, notification_log
--   daily_summaries, daily_top_products, daily_hourly_revenue
--   audit_log               (writes via triggers only)
--   courses                 (dual-purpose; used operationally)
-- ============================================================
