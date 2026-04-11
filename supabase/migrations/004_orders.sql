-- ============================================================
-- Migration 004: Orders System
-- EatFlow POS - Orders, Order Items, and Item Modifiers
-- ============================================================
-- Maps to: Order, OrderItem, SelectedModifier interfaces in lib/types.ts
-- Core transactional tables for the POS system.

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE RESTRICT,
    table_number INTEGER NOT NULL,
    status order_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    payment_method payment_method,
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    vat_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    active_course INTEGER NOT NULL DEFAULT 1,
    is_rush BOOLEAN NOT NULL DEFAULT false
);

-- Individual items within an order
-- Maps to: OrderItem interface in lib/types.ts
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL, -- denormalized for receipt/history
    price NUMERIC(10,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    notes TEXT,
    status order_item_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    course INTEGER NOT NULL DEFAULT 1,
    station station_type NOT NULL
);

-- Modifiers selected for a specific order item
-- Maps to: SelectedModifier interface in lib/types.ts
CREATE TABLE order_item_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    modifier_id UUID NOT NULL REFERENCES modifiers(id) ON DELETE RESTRICT,
    name TEXT NOT NULL, -- denormalized snapshot at time of order
    price NUMERIC(10,2) NOT NULL DEFAULT 0 -- denormalized snapshot
);

-- Now add the FK from tables.current_order_id -> orders.id
ALTER TABLE tables
    ADD CONSTRAINT fk_tables_current_order
    FOREIGN KEY (current_order_id) REFERENCES orders(id) ON DELETE SET NULL;
