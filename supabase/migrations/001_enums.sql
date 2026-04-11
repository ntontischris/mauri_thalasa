-- ============================================================
-- Migration 001: Custom Enum Types
-- EatFlow POS - Mauri Thalasa Restaurant
-- ============================================================
-- All PostgreSQL enum types used across the database schema.
-- These map directly to the TypeScript union types in lib/types.ts

-- Kitchen station assignment for products and order items
CREATE TYPE station_type AS ENUM ('hot', 'cold', 'bar', 'dessert');

-- Table lifecycle statuses
CREATE TYPE table_status AS ENUM ('available', 'occupied', 'bill-requested', 'dirty');

-- Table visual shapes for floor plan rendering
CREATE TYPE table_shape AS ENUM ('square', 'round', 'rectangle');

-- Order lifecycle statuses
CREATE TYPE order_status AS ENUM ('active', 'completed', 'cancelled');

-- Individual order item preparation statuses
CREATE TYPE order_item_status AS ENUM ('pending', 'preparing', 'ready', 'served');

-- Payment methods
CREATE TYPE payment_method AS ENUM ('cash', 'card');

-- Ingredient categorization for inventory management
CREATE TYPE ingredient_category AS ENUM ('seafood', 'meat', 'dairy', 'vegetables', 'dry', 'drinks', 'other');

-- Units of measurement for ingredients
CREATE TYPE ingredient_unit AS ENUM ('kg', 'lt', 'pcs', 'gr', 'ml');

-- Reasons for waste tracking
CREATE TYPE waste_reason AS ENUM ('expired', 'damaged', 'overproduction', 'returned');

-- Supplier order lifecycle
CREATE TYPE supplier_order_status AS ENUM ('draft', 'sent', 'received');

-- Staff roles
CREATE TYPE staff_role AS ENUM ('waiter', 'chef', 'barman', 'manager');

-- Shift types for scheduling
CREATE TYPE shift_type AS ENUM ('morning', 'afternoon', 'off');

-- Checklist types (opening/closing procedures)
CREATE TYPE checklist_type AS ENUM ('opening', 'closing');

-- AI chat message roles
CREATE TYPE chat_role AS ENUM ('user', 'assistant');

-- Forecast confidence levels
CREATE TYPE forecast_confidence AS ENUM ('high', 'medium', 'low');

-- Menu optimization suggestion types
CREATE TYPE menu_suggestion_type AS ENUM ('promote', 'reprice', 'remove', 'keep');
