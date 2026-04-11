-- ============================================================
-- Migration 006: Supplier Orders
-- EatFlow POS - Purchase Orders to Suppliers
-- ============================================================
-- Maps to: SupplierOrder, SupplierOrderItem interfaces in lib/types.ts

CREATE TABLE supplier_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    status supplier_order_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT
);

-- Line items within a supplier order
-- Maps to: SupplierOrderItem interface in lib/types.ts
CREATE TABLE supplier_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_order_id UUID NOT NULL REFERENCES supplier_orders(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity NUMERIC(10,3) NOT NULL,
    estimated_cost NUMERIC(10,2) NOT NULL DEFAULT 0
);
