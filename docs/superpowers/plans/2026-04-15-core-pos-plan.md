# Core POS - Implementation Plan (Phase 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the critical POS flow: Tables floor plan (realtime) → Order taking → Kitchen display (realtime) → Checkout/Payment — all connected to Supabase with live updates across devices.

**Architecture:** Next.js 16 App Router with Server Components fetching initial data, Client Components for interactivity, Supabase Realtime for cross-device sync. Server Actions for all mutations with Zod validation. Existing shadcn/ui components reused for styling.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.7, Supabase (supabase-js v2 + Realtime), Tailwind CSS 4, shadcn/ui, Zod

---

## File Structure

### New files to create:

```
lib/
├── types/
│   └── database.ts             -- EXTEND: add DbZone, DbTable, DbOrder, DbOrderItem, DbOrderItemModifier, DbModifier
├── validators/
│   └── orders.ts               -- Zod schemas for order operations
├── queries/
│   ├── zones.ts                -- getZones
│   ├── tables.ts               -- getTables, getTableById
│   ├── modifiers.ts            -- getModifiers, getModifiersByProduct
│   └── orders.ts               -- getActiveOrderByTable, getOrderItems, getKitchenItems
├── actions/
│   ├── tables.ts               -- updateTableStatus
│   └── orders.ts               -- createOrder, addOrderItem, updateItemQuantity, removeOrderItem, updateItemStatus, completeOrder, cancelOrder
└── hooks/
    ├── use-realtime-tables.ts   -- Subscribe to table status changes
    ├── use-realtime-orders.ts   -- Subscribe to order/item changes for a table
    └── use-realtime-kitchen.ts  -- Subscribe to kitchen item changes

app/(pos)/
├── tables/page.tsx              -- REWRITE: Server Component → TablesView
├── orders/[tableId]/page.tsx    -- NEW: Server Component → OrderPanel
├── kitchen/page.tsx             -- REWRITE: Server Component → KitchenDisplay
└── checkout/[tableId]/page.tsx  -- NEW: Server Component → CheckoutFlow

components/pos/
├── tables-view.tsx              -- NEW: Floor plan with realtime tables
├── order-panel.tsx              -- NEW: Menu browser + order management
├── kitchen-display.tsx          -- NEW: KDS with realtime items
└── checkout-flow.tsx            -- NEW: Payment + receipt flow

supabase/migrations/
└── 021_realtime_and_constraints.sql -- Enable Realtime + unique active order index
```

### Files unchanged (reused as-is):

```
components/ui/*                  -- All shadcn components
lib/supabase/client.ts           -- Browser Supabase client
lib/supabase/server.ts           -- Server Supabase client
lib/supabase/middleware.ts       -- Auth middleware
components/providers/supabase-provider.tsx -- Supabase context
```

---

## Task 1: Extend Database Types

**Files:**
- Modify: `lib/types/database.ts`

- [ ] **Step 1: Add zone, table, order, modifier types to database.ts**

Add the following types after the existing `DbAuditLog` interface in `lib/types/database.ts`:

```typescript
// --- Zones ---

export interface DbZone {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  legacy_id: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// --- Tables ---

export type TableStatus = "available" | "occupied" | "bill-requested" | "dirty";
export type TableShape = "square" | "round" | "rectangle";

export interface DbTable {
  id: string;
  number: number;
  capacity: number;
  status: TableStatus;
  current_order_id: string | null;
  zone_id: string;
  x: number;
  y: number;
  shape: TableShape;
  rotation: number;
  legacy_id: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// --- Modifiers ---

export interface DbModifier {
  id: string;
  name: string;
  price: number;
  created_at: string;
  updated_at: string;
}

// --- Orders ---

export type OrderStatus = "active" | "completed" | "cancelled";
export type OrderItemStatus = "pending" | "preparing" | "ready" | "served";
export type PaymentMethod = "cash" | "card";
export type StationType = "hot" | "cold" | "bar" | "dessert";

export interface DbOrder {
  id: string;
  table_id: string;
  table_number: number;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  total: number;
  vat_amount: number;
  discount_amount: number;
  active_course: number;
  is_rush: boolean;
  notes: string | null;
  customer_id: string | null;
  created_by: string | null;
  completed_by: string | null;
  elorus_invoice_id: string | null;
  fiscal_mark: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  notes: string | null;
  status: OrderItemStatus;
  course: number;
  station: StationType;
  created_at: string;
  updated_at: string;
}

export interface DbOrderItemModifier {
  id: string;
  order_item_id: string;
  modifier_id: string;
  name: string;
  price: number;
}

// --- Composite types for queries with joins ---

export type OrderItemWithModifiers = DbOrderItem & {
  order_item_modifiers: DbOrderItemModifier[];
};

export type KitchenItem = DbOrderItem & {
  table_number: number;
  order_item_modifiers: DbOrderItemModifier[];
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/types/database.ts
git commit -m "feat: add database types for zones, tables, orders, modifiers"
```

---

## Task 2: Migration - Realtime & Constraints

**Files:**
- Create: `supabase/migrations/021_realtime_and_constraints.sql`

- [ ] **Step 1: Create realtime migration**

Create `supabase/migrations/021_realtime_and_constraints.sql`:

```sql
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
```

- [ ] **Step 2: Run migration on Supabase**

Execute the SQL in Supabase Dashboard → SQL Editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/021_realtime_and_constraints.sql
git commit -m "feat(db): enable realtime on tables/orders and add active order constraint"
```

---

## Task 3: Zod Validators for Orders

**Files:**
- Create: `lib/validators/orders.ts`

- [ ] **Step 1: Create order validators**

Create `lib/validators/orders.ts`:

```typescript
import { z } from "zod";

export const addOrderItemSchema = z.object({
  orderId: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string().min(1),
  price: z.number().min(0),
  quantity: z.number().int().min(1).default(1),
  station: z.enum(["hot", "cold", "bar", "dessert"]),
  notes: z.string().max(500).optional(),
  course: z.number().int().min(1).default(1),
  modifiers: z
    .array(
      z.object({
        modifierId: z.string().uuid(),
        name: z.string(),
        price: z.number().min(0),
      }),
    )
    .optional(),
});

export const updateItemQuantitySchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

export const updateItemStatusSchema = z.object({
  itemId: z.string().uuid(),
  status: z.enum(["pending", "preparing", "ready", "served"]),
});

export const completeOrderSchema = z.object({
  orderId: z.string().uuid(),
  tableId: z.string().uuid(),
  paymentMethod: z.enum(["cash", "card"]),
});

export type AddOrderItemInput = z.infer<typeof addOrderItemSchema>;
export type UpdateItemQuantityInput = z.infer<typeof updateItemQuantitySchema>;
export type UpdateItemStatusInput = z.infer<typeof updateItemStatusSchema>;
export type CompleteOrderInput = z.infer<typeof completeOrderSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add lib/validators/orders.ts
git commit -m "feat: add Zod validators for order operations"
```

---

## Task 4: Server Queries - Zones, Tables, Modifiers

**Files:**
- Create: `lib/queries/zones.ts`
- Create: `lib/queries/tables.ts`
- Create: `lib/queries/modifiers.ts`

- [ ] **Step 1: Create zones query**

Create `lib/queries/zones.ts`:

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbZone } from "@/lib/types/database";

export async function getZones(): Promise<DbZone[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("zones")
    .select(
      "id, name, color, sort_order, legacy_id, metadata, created_at, updated_at",
    )
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch zones: ${error.message}`);
  }

  return data;
}
```

- [ ] **Step 2: Create tables query**

Create `lib/queries/tables.ts`:

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbTable } from "@/lib/types/database";

export async function getTables(): Promise<DbTable[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("tables")
    .select(
      "id, number, capacity, status, current_order_id, zone_id, x, y, shape, rotation, legacy_id, metadata, created_at, updated_at",
    )
    .order("number", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch tables: ${error.message}`);
  }

  return data;
}

export async function getTableById(id: string): Promise<DbTable | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("tables")
    .select(
      "id, number, capacity, status, current_order_id, zone_id, x, y, shape, rotation, legacy_id, metadata, created_at, updated_at",
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch table: ${error.message}`);
  }

  return data;
}
```

- [ ] **Step 3: Create modifiers query**

Create `lib/queries/modifiers.ts`:

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbModifier } from "@/lib/types/database";

export async function getModifiers(): Promise<DbModifier[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("modifiers")
    .select("id, name, price, created_at, updated_at")
    .order("name");

  if (error) {
    throw new Error(`Failed to fetch modifiers: ${error.message}`);
  }

  return data;
}

export async function getModifiersByProduct(
  productId: string,
): Promise<DbModifier[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("product_modifiers")
    .select("modifiers(id, name, price, created_at, updated_at)")
    .eq("product_id", productId);

  if (error) {
    throw new Error(`Failed to fetch product modifiers: ${error.message}`);
  }

  return data.map(
    (d: { modifiers: DbModifier }) => d.modifiers,
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/queries/zones.ts lib/queries/tables.ts lib/queries/modifiers.ts
git commit -m "feat: add server queries for zones, tables, and modifiers"
```

---

## Task 5: Server Queries - Orders

**Files:**
- Create: `lib/queries/orders.ts`

- [ ] **Step 1: Create orders query**

Create `lib/queries/orders.ts`:

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  DbOrder,
  OrderItemWithModifiers,
  KitchenItem,
} from "@/lib/types/database";

export async function getActiveOrderByTable(
  tableId: string,
): Promise<DbOrder | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, table_id, table_number, status, payment_method, total, vat_amount, discount_amount, active_course, is_rush, notes, customer_id, created_by, completed_by, elorus_invoice_id, fiscal_mark, created_at, updated_at, completed_at",
    )
    .eq("table_id", tableId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch active order: ${error.message}`);
  }

  return data;
}

export async function getOrderById(
  orderId: string,
): Promise<DbOrder | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, table_id, table_number, status, payment_method, total, vat_amount, discount_amount, active_course, is_rush, notes, customer_id, created_by, completed_by, elorus_invoice_id, fiscal_mark, created_at, updated_at, completed_at",
    )
    .eq("id", orderId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch order: ${error.message}`);
  }

  return data;
}

export async function getOrderItems(
  orderId: string,
): Promise<OrderItemWithModifiers[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("order_items")
    .select(
      `id, order_id, product_id, product_name, price, quantity,
       notes, status, course, station, created_at, updated_at,
       order_item_modifiers(id, order_item_id, modifier_id, name, price)`,
    )
    .eq("order_id", orderId)
    .order("course", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch order items: ${error.message}`);
  }

  return data as OrderItemWithModifiers[];
}

export async function getKitchenItems(): Promise<KitchenItem[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("order_items")
    .select(
      `id, order_id, product_id, product_name, price, quantity,
       notes, status, course, station, created_at, updated_at,
       order_item_modifiers(id, order_item_id, modifier_id, name, price),
       orders!inner(table_number, status)`,
    )
    .in("status", ["pending", "preparing"])
    .eq("orders.status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch kitchen items: ${error.message}`);
  }

  return data.map((item: Record<string, unknown>) => {
    const orders = item.orders as { table_number: number };
    const { orders: _, ...rest } = item;
    return { ...rest, table_number: orders.table_number } as KitchenItem;
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/queries/orders.ts
git commit -m "feat: add server queries for orders, items, and kitchen"
```

---

## Task 6: Server Actions - Tables

**Files:**
- Create: `lib/actions/tables.ts`

- [ ] **Step 1: Create table actions**

Create `lib/actions/tables.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TableStatus } from "@/lib/types/database";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function updateTableStatus(
  tableId: string,
  status: TableStatus,
  currentOrderId?: string | null,
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  const update: Record<string, unknown> = { status };
  if (currentOrderId !== undefined) {
    update.current_order_id = currentOrderId;
  }

  const { error } = await supabase
    .from("tables")
    .update(update)
    .eq("id", tableId);

  if (error) {
    return {
      success: false,
      error: `Αποτυχία ενημέρωσης τραπεζιού: ${error.message}`,
    };
  }

  revalidatePath("/tables");
  return { success: true };
}

export async function clearTable(tableId: string): Promise<ActionResult> {
  return updateTableStatus(tableId, "available", null);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/actions/tables.ts
git commit -m "feat: add server actions for table status updates"
```

---

## Task 7: Server Actions - Orders

**Files:**
- Create: `lib/actions/orders.ts`

- [ ] **Step 1: Create order actions**

Create `lib/actions/orders.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  addOrderItemSchema,
  updateItemQuantitySchema,
  updateItemStatusSchema,
  completeOrderSchema,
  type AddOrderItemInput,
  type UpdateItemQuantityInput,
  type UpdateItemStatusInput,
  type CompleteOrderInput,
} from "@/lib/validators/orders";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createOrder(
  tableId: string,
  tableNumber: number,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .insert({
      table_id: tableId,
      table_number: tableNumber,
      status: "active",
      total: 0,
      vat_amount: 0,
      discount_amount: 0,
      active_course: 1,
      is_rush: false,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      // Unique constraint violation - order already exists
      const { data: existing } = await supabase
        .from("orders")
        .select("id")
        .eq("table_id", tableId)
        .eq("status", "active")
        .single();

      if (existing) {
        return { success: true, data: { id: existing.id } };
      }
    }
    return { success: false, error: `Αποτυχία δημιουργίας: ${error.message}` };
  }

  // Update table status to occupied
  await supabase
    .from("tables")
    .update({ status: "occupied", current_order_id: data.id })
    .eq("id", tableId);

  revalidatePath("/tables");
  revalidatePath(`/orders/${tableId}`);
  return { success: true, data: { id: data.id } };
}

export async function addOrderItem(
  input: AddOrderItemInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = addOrderItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();
  const { orderId, modifiers, ...itemData } = parsed.data;

  // Insert order item
  const { data: item, error: itemError } = await supabase
    .from("order_items")
    .insert({
      order_id: orderId,
      product_id: itemData.productId,
      product_name: itemData.productName,
      price: itemData.price,
      quantity: itemData.quantity,
      station: itemData.station,
      notes: itemData.notes ?? null,
      course: itemData.course ?? 1,
      status: "pending",
    })
    .select("id")
    .single();

  if (itemError) {
    return {
      success: false,
      error: `Αποτυχία προσθήκης: ${itemError.message}`,
    };
  }

  // Insert modifiers if any
  if (modifiers && modifiers.length > 0) {
    const modifierRows = modifiers.map((m) => ({
      order_item_id: item.id,
      modifier_id: m.modifierId,
      name: m.name,
      price: m.price,
    }));

    const { error: modError } = await supabase
      .from("order_item_modifiers")
      .insert(modifierRows);

    if (modError) {
      // Rollback: delete the item
      await supabase.from("order_items").delete().eq("id", item.id);
      return {
        success: false,
        error: `Αποτυχία modifiers: ${modError.message}`,
      };
    }
  }

  revalidatePath("/orders");
  revalidatePath("/kitchen");
  return { success: true, data: { id: item.id } };
}

export async function updateItemQuantity(
  input: UpdateItemQuantityInput,
): Promise<ActionResult> {
  const parsed = updateItemQuantitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("order_items")
    .update({ quantity: parsed.data.quantity })
    .eq("id", parsed.data.itemId)
    .eq("status", "pending"); // Can only change quantity of pending items

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/orders");
  return { success: true };
}

export async function removeOrderItem(
  itemId: string,
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  // Delete modifiers first (FK constraint)
  await supabase
    .from("order_item_modifiers")
    .delete()
    .eq("order_item_id", itemId);

  const { error } = await supabase
    .from("order_items")
    .delete()
    .eq("id", itemId)
    .eq("status", "pending"); // Can only remove pending items

  if (error) {
    return { success: false, error: `Αποτυχία αφαίρεσης: ${error.message}` };
  }

  revalidatePath("/orders");
  revalidatePath("/kitchen");
  return { success: true };
}

export async function updateItemStatus(
  input: UpdateItemStatusInput,
): Promise<ActionResult> {
  const parsed = updateItemStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("order_items")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.itemId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/kitchen");
  revalidatePath("/orders");
  return { success: true };
}

export async function completeOrder(
  input: CompleteOrderInput,
): Promise<ActionResult> {
  const parsed = completeOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  // Fetch items with product VAT rates for total calculation
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select(
      `id, price, quantity,
       order_item_modifiers(price),
       products!inner(vat_rate)`,
    )
    .eq("order_id", parsed.data.orderId);

  if (itemsError) {
    return { success: false, error: `Αποτυχία υπολογισμού: ${itemsError.message}` };
  }

  // Calculate totals
  let total = 0;
  let vatTotal = 0;

  for (const item of items) {
    const modifierSum = (
      item.order_item_modifiers as { price: number }[]
    ).reduce((sum, m) => sum + m.price, 0);
    const itemTotal = (item.price + modifierSum) * item.quantity;
    const vatRate =
      (item.products as { vat_rate: number })?.vat_rate ?? 24;
    const vatAmount = itemTotal - itemTotal / (1 + vatRate / 100);

    total += itemTotal;
    vatTotal += vatAmount;
  }

  total = Math.round(total * 100) / 100;
  vatTotal = Math.round(vatTotal * 100) / 100;

  // Mark all items as served
  await supabase
    .from("order_items")
    .update({ status: "served" })
    .eq("order_id", parsed.data.orderId)
    .neq("status", "served");

  // Complete the order
  const { error: orderError } = await supabase
    .from("orders")
    .update({
      status: "completed",
      payment_method: parsed.data.paymentMethod,
      total,
      vat_amount: vatTotal,
      completed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.orderId);

  if (orderError) {
    return {
      success: false,
      error: `Αποτυχία ολοκλήρωσης: ${orderError.message}`,
    };
  }

  // Free the table
  await supabase
    .from("tables")
    .update({ status: "available", current_order_id: null })
    .eq("id", parsed.data.tableId);

  revalidatePath("/tables");
  revalidatePath("/orders");
  revalidatePath("/kitchen");
  revalidatePath(`/checkout/${parsed.data.tableId}`);
  return { success: true };
}

export async function cancelOrder(
  orderId: string,
  tableId: string,
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId);

  if (error) {
    return { success: false, error: `Αποτυχία ακύρωσης: ${error.message}` };
  }

  // Free the table
  await supabase
    .from("tables")
    .update({ status: "available", current_order_id: null })
    .eq("id", tableId);

  revalidatePath("/tables");
  revalidatePath("/orders");
  revalidatePath("/kitchen");
  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/actions/orders.ts
git commit -m "feat: add server actions for orders, items, kitchen, and checkout"
```

---

## Task 8: Realtime Hooks

**Files:**
- Create: `lib/hooks/use-realtime-tables.ts`
- Create: `lib/hooks/use-realtime-orders.ts`
- Create: `lib/hooks/use-realtime-kitchen.ts`

- [ ] **Step 1: Create realtime tables hook**

Create `lib/hooks/use-realtime-tables.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import type { DbTable } from "@/lib/types/database";

export function useRealtimeTables(initialTables: DbTable[]) {
  const supabase = useSupabase();
  const [tables, setTables] = useState(initialTables);

  useEffect(() => {
    setTables(initialTables);
  }, [initialTables]);

  useEffect(() => {
    const channel = supabase
      .channel("realtime-tables")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setTables((prev) =>
              prev.map((t) =>
                t.id === (payload.new as DbTable).id
                  ? (payload.new as DbTable)
                  : t,
              ),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return tables;
}
```

- [ ] **Step 2: Create realtime orders hook**

Create `lib/hooks/use-realtime-orders.ts`:

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import type {
  DbOrder,
  OrderItemWithModifiers,
  DbOrderItem,
} from "@/lib/types/database";

export function useRealtimeOrder(
  initialOrder: DbOrder | null,
  initialItems: OrderItemWithModifiers[],
  tableId: string,
) {
  const supabase = useSupabase();
  const [order, setOrder] = useState(initialOrder);
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    setOrder(initialOrder);
    setItems(initialItems);
  }, [initialOrder, initialItems]);

  const refetchItems = useCallback(async () => {
    if (!order) return;

    const { data } = await supabase
      .from("order_items")
      .select(
        `id, order_id, product_id, product_name, price, quantity,
         notes, status, course, station, created_at, updated_at,
         order_item_modifiers(id, order_item_id, modifier_id, name, price)`,
      )
      .eq("order_id", order.id)
      .order("course", { ascending: true })
      .order("created_at", { ascending: true });

    if (data) {
      setItems(data as OrderItemWithModifiers[]);
    }
  }, [supabase, order]);

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-order-${tableId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          const row = payload.new as DbOrder;
          if (row.table_id === tableId) {
            setOrder(row);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        (payload) => {
          const row = (payload.new ?? payload.old) as DbOrderItem;
          if (order && row.order_id === order.id) {
            refetchItems();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, tableId, order, refetchItems]);

  return { order, items, setOrder, setItems };
}
```

- [ ] **Step 3: Create realtime kitchen hook**

Create `lib/hooks/use-realtime-kitchen.ts`:

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import type { KitchenItem } from "@/lib/types/database";

export function useRealtimeKitchen(initialItems: KitchenItem[]) {
  const supabase = useSupabase();
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from("order_items")
      .select(
        `id, order_id, product_id, product_name, price, quantity,
         notes, status, course, station, created_at, updated_at,
         order_item_modifiers(id, order_item_id, modifier_id, name, price),
         orders!inner(table_number, status)`,
      )
      .in("status", ["pending", "preparing"])
      .eq("orders.status", "active")
      .order("created_at", { ascending: true });

    if (data) {
      const mapped = data.map((item: Record<string, unknown>) => {
        const orders = item.orders as { table_number: number };
        const { orders: _, ...rest } = item;
        return { ...rest, table_number: orders.table_number } as KitchenItem;
      });
      setItems(mapped);
    }
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("realtime-kitchen")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => {
          refetch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refetch]);

  return items;
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/hooks/use-realtime-tables.ts lib/hooks/use-realtime-orders.ts lib/hooks/use-realtime-kitchen.ts
git commit -m "feat: add realtime hooks for tables, orders, and kitchen"
```

---

## Task 9: Tables Page - Floor Plan

**Files:**
- Rewrite: `app/(pos)/tables/page.tsx`
- Create: `components/pos/tables-view.tsx`

- [ ] **Step 1: Rewrite tables page as Server Component**

Replace `app/(pos)/tables/page.tsx`:

```typescript
import { getTables } from "@/lib/queries/tables";
import { getZones } from "@/lib/queries/zones";
import { TablesView } from "@/components/pos/tables-view";

export default async function TablesPage() {
  const [tables, zones] = await Promise.all([getTables(), getZones()]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Τραπέζια</h1>
        <p className="text-muted-foreground">
          {tables.filter((t) => t.status === "available").length} διαθέσιμα
          από {tables.length}
        </p>
      </div>
      <TablesView initialTables={tables} zones={zones} />
    </div>
  );
}
```

- [ ] **Step 2: Create TablesView client component**

Create `components/pos/tables-view.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealtimeTables } from "@/lib/hooks/use-realtime-tables";
import type { DbTable, DbZone, TableStatus } from "@/lib/types/database";

interface TablesViewProps {
  initialTables: DbTable[];
  zones: DbZone[];
}

const statusConfig: Record<
  TableStatus,
  { label: string; bg: string; border: string; text: string }
> = {
  available: {
    label: "Διαθέσιμο",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/50",
    text: "text-emerald-600",
  },
  occupied: {
    label: "Κατειλημμένο",
    bg: "bg-amber-500/10",
    border: "border-amber-500/50",
    text: "text-amber-600",
  },
  "bill-requested": {
    label: "Λογαριασμός",
    bg: "bg-blue-500/10",
    border: "border-blue-500/50",
    text: "text-blue-600",
  },
  dirty: {
    label: "Καθαρισμός",
    bg: "bg-gray-500/10",
    border: "border-gray-500/50",
    text: "text-gray-500",
  },
};

export function TablesView({ initialTables, zones }: TablesViewProps) {
  const tables = useRealtimeTables(initialTables);
  const router = useRouter();
  const [activeZone, setActiveZone] = useState("all");

  const filteredTables =
    activeZone === "all"
      ? tables
      : tables.filter((t) => t.zone_id === activeZone);

  const handleTableClick = (table: DbTable) => {
    if (table.status === "bill-requested") {
      router.push(`/checkout/${table.id}`);
    } else if (table.status === "dirty") {
      // Could trigger clean action - for now navigate to orders
      router.push(`/orders/${table.id}`);
    } else {
      router.push(`/orders/${table.id}`);
    }
  };

  return (
    <Tabs value={activeZone} onValueChange={setActiveZone}>
      <TabsList className="flex-wrap">
        <TabsTrigger value="all">
          Όλα ({tables.length})
        </TabsTrigger>
        {zones.map((zone) => {
          const count = tables.filter((t) => t.zone_id === zone.id).length;
          return (
            <TabsTrigger key={zone.id} value={zone.id}>
              <span
                className="mr-1.5 inline-block size-2.5 rounded-full"
                style={{ backgroundColor: zone.color }}
              />
              {zone.name} ({count})
            </TabsTrigger>
          );
        })}
      </TabsList>

      <div className="mt-4">
        {/* Status summary */}
        <div className="mb-4 flex gap-3">
          {(
            Object.entries(statusConfig) as [TableStatus, (typeof statusConfig)[TableStatus]][]
          ).map(([status, config]) => {
            const count = filteredTables.filter(
              (t) => t.status === status,
            ).length;
            if (count === 0) return null;
            return (
              <Badge
                key={status}
                variant="outline"
                className={`${config.text} gap-1`}
              >
                <span
                  className={`inline-block size-2 rounded-full ${config.bg}`}
                />
                {count} {config.label}
              </Badge>
            );
          })}
        </div>

        {/* Table grid */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredTables.map((table) => {
            const config = statusConfig[table.status];
            return (
              <Card
                key={table.id}
                className={`cursor-pointer border-2 transition-all hover:scale-[1.02] active:scale-95 ${config.bg} ${config.border}`}
                onClick={() => handleTableClick(table)}
              >
                <CardContent className="flex flex-col items-center justify-center p-4">
                  <span className="text-2xl font-bold">{table.number}</span>
                  <span className="text-xs text-muted-foreground">
                    {table.capacity} άτομα
                  </span>
                  <Badge
                    variant="secondary"
                    className={`mt-2 text-xs ${config.text}`}
                  >
                    {config.label}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Tabs>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(pos)/tables/page.tsx" components/pos/tables-view.tsx
git commit -m "feat: rewrite tables page with Supabase data and realtime updates"
```

---

## Task 10: Order Page

**Files:**
- Create: `app/(pos)/orders/[tableId]/page.tsx`
- Create: `components/pos/order-panel.tsx`

- [ ] **Step 1: Create order page Server Component**

Create `app/(pos)/orders/[tableId]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import { getTableById } from "@/lib/queries/tables";
import { getActiveOrderByTable, getOrderItems } from "@/lib/queries/orders";
import { getProducts } from "@/lib/queries/products";
import { getCategories } from "@/lib/queries/categories";
import { OrderPanel } from "@/components/pos/order-panel";

interface OrderPageProps {
  params: Promise<{ tableId: string }>;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { tableId } = await params;

  const table = await getTableById(tableId);
  if (!table) notFound();

  const [order, products, categories] = await Promise.all([
    getActiveOrderByTable(tableId),
    getProducts(),
    getCategories(),
  ]);

  const items = order ? await getOrderItems(order.id) : [];

  return (
    <OrderPanel
      table={table}
      initialOrder={order}
      initialItems={items}
      products={products.filter((p) => p.available)}
      categories={categories}
    />
  );
}
```

- [ ] **Step 2: Create OrderPanel client component**

Create `components/pos/order-panel.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { useRealtimeOrder } from "@/lib/hooks/use-realtime-orders";
import { createOrder, addOrderItem, updateItemQuantity, removeOrderItem } from "@/lib/actions/orders";
import { updateTableStatus } from "@/lib/actions/tables";
import type {
  DbTable,
  DbOrder,
  DbProduct,
  DbCategory,
  OrderItemWithModifiers,
} from "@/lib/types/database";

interface OrderPanelProps {
  table: DbTable;
  initialOrder: DbOrder | null;
  initialItems: OrderItemWithModifiers[];
  products: DbProduct[];
  categories: DbCategory[];
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

export function OrderPanel({
  table,
  initialOrder,
  initialItems,
  products,
  categories,
}: OrderPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { order, items, setOrder } = useRealtimeOrder(
    initialOrder,
    initialItems,
    table.id,
  );

  const handleAddProduct = async (product: DbProduct) => {
    let currentOrderId = order?.id;

    // Create order if it doesn't exist
    if (!currentOrderId) {
      const result = await createOrder(table.id, table.number);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      currentOrderId = result.data!.id;
      setOrder({
        id: currentOrderId,
        table_id: table.id,
        table_number: table.number,
        status: "active",
        payment_method: null,
        total: 0,
        vat_amount: 0,
        discount_amount: 0,
        active_course: 1,
        is_rush: false,
        notes: null,
        customer_id: null,
        created_by: null,
        completed_by: null,
        elorus_invoice_id: null,
        fiscal_mark: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      });
    }

    const result = await addOrderItem({
      orderId: currentOrderId,
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      station: product.station,
    });

    if (!result.success) {
      toast.error(result.error);
    }
  };

  const handleUpdateQuantity = (itemId: string, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty < 1) return;

    startTransition(async () => {
      const result = await updateItemQuantity({
        itemId,
        quantity: newQty,
      });
      if (!result.success) {
        toast.error(result.error);
      }
    });
  };

  const handleRemoveItem = (itemId: string) => {
    startTransition(async () => {
      const result = await removeOrderItem(itemId);
      if (!result.success) {
        toast.error(result.error);
      }
    });
  };

  const handleRequestBill = async () => {
    if (!order) return;
    const result = await updateTableStatus(table.id, "bill-requested");
    if (result.success) {
      router.push(`/checkout/${table.id}`);
    } else {
      toast.error(result.error);
    }
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    const modTotal = item.order_item_modifiers.reduce(
      (ms, m) => ms + m.price,
      0,
    );
    return sum + (item.price + modTotal) * item.quantity;
  }, 0);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 lg:flex-row">
      {/* Left: Menu Browser */}
      <div className="flex-1 overflow-hidden rounded-lg border">
        <div className="flex items-center gap-2 border-b p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/tables")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h2 className="font-semibold">
            Τραπέζι {table.number}
          </h2>
          <Badge variant="outline">{table.capacity} άτομα</Badge>
        </div>

        <Tabs defaultValue="all" className="p-3">
          <TabsList className="flex-wrap">
            <TabsTrigger value="all">Όλα</TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="h-[calc(100vh-16rem)]">
            <TabsContent value="all" className="mt-3">
              <ProductGrid
                products={products}
                onAdd={handleAddProduct}
                isPending={isPending}
              />
            </TabsContent>
            {categories.map((cat) => (
              <TabsContent key={cat.id} value={cat.id} className="mt-3">
                <ProductGrid
                  products={products.filter(
                    (p) => p.category_id === cat.id,
                  )}
                  onAdd={handleAddProduct}
                  isPending={isPending}
                />
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
      </div>

      {/* Right: Current Order */}
      <div className="flex w-full flex-col rounded-lg border lg:w-96">
        <div className="border-b p-3">
          <h3 className="font-semibold flex items-center gap-2">
            <UtensilsCrossed className="size-4" />
            Παραγγελία
            {items.length > 0 && (
              <Badge variant="secondary">{items.length}</Badge>
            )}
          </h3>
        </div>

        <ScrollArea className="flex-1 p-3">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Επιλέξτε προϊόντα από το μενού
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const modTotal = item.order_item_modifiers.reduce(
                  (s, m) => s + m.price,
                  0,
                );
                const lineTotal =
                  (item.price + modTotal) * item.quantity;

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 rounded-md border p-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.product_name}
                      </p>
                      {item.order_item_modifiers.length > 0 && (
                        <p className="text-xs text-amber-600">
                          +{" "}
                          {item.order_item_modifiers
                            .map((m) => m.name)
                            .join(", ")}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-muted-foreground italic">
                          {item.notes}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(item.price + modTotal)} × {item.quantity}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold">
                        {formatPrice(lineTotal)}
                      </span>
                      {item.status === "pending" && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-6"
                            onClick={() =>
                              handleUpdateQuantity(
                                item.id,
                                item.quantity,
                                -1,
                              )
                            }
                            disabled={item.quantity <= 1 || isPending}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="w-5 text-center text-xs">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-6"
                            onClick={() =>
                              handleUpdateQuantity(
                                item.id,
                                item.quantity,
                                1,
                              )
                            }
                            disabled={isPending}
                          >
                            <Plus className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-destructive"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      )}
                      {item.status !== "pending" && (
                        <Badge variant="outline" className="text-xs">
                          {item.status === "preparing"
                            ? "Ετοιμάζεται"
                            : item.status === "ready"
                              ? "Έτοιμο"
                              : "Σερβιρίστηκε"}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {items.length > 0 && (
          <div className="border-t p-3 space-y-3">
            <Separator />
            <div className="flex justify-between text-sm">
              <span>Σύνολο</span>
              <span className="text-lg font-bold">
                {formatPrice(subtotal)}
              </span>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleRequestBill}
              disabled={isPending}
            >
              <CreditCard className="mr-2 size-4" />
              Λογαριασμός
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductGrid({
  products,
  onAdd,
  isPending,
}: {
  products: DbProduct[];
  onAdd: (product: DbProduct) => void;
  isPending: boolean;
}) {
  if (products.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Δεν βρέθηκαν προϊόντα
      </p>
    );
  }

  return (
    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onAdd(product)}
          disabled={isPending}
          className="flex flex-col items-start rounded-lg border p-3 text-left transition-colors hover:bg-accent active:scale-95 disabled:opacity-50"
        >
          <span className="text-sm font-medium leading-tight">
            {product.name}
          </span>
          <span className="mt-1 text-sm font-bold text-primary">
            {formatPrice(product.price)}
          </span>
        </button>
      ))}
    </div>
  );
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(pos)/orders/[tableId]/page.tsx" components/pos/order-panel.tsx
git commit -m "feat: add order page with menu browser and live order management"
```

---

## Task 11: Kitchen Display

**Files:**
- Rewrite: `app/(pos)/kitchen/page.tsx`
- Create: `components/pos/kitchen-display.tsx`

- [ ] **Step 1: Rewrite kitchen page as Server Component**

Replace `app/(pos)/kitchen/page.tsx`:

```typescript
import { getKitchenItems } from "@/lib/queries/orders";
import { KitchenDisplay } from "@/components/pos/kitchen-display";

export default async function KitchenPage() {
  const items = await getKitchenItems();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Κουζίνα</h1>
        <p className="text-muted-foreground">
          {items.filter((i) => i.status === "pending").length} σε αναμονή
          {" • "}
          {items.filter((i) => i.status === "preparing").length} ετοιμάζονται
        </p>
      </div>
      <KitchenDisplay initialItems={items} />
    </div>
  );
}
```

- [ ] **Step 2: Create KitchenDisplay client component**

Create `components/pos/kitchen-display.tsx`:

```typescript
"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, ChefHat, Clock, Flame } from "lucide-react";
import { toast } from "sonner";
import { useRealtimeKitchen } from "@/lib/hooks/use-realtime-kitchen";
import { updateItemStatus } from "@/lib/actions/orders";
import type { KitchenItem, StationType, OrderItemStatus } from "@/lib/types/database";

interface KitchenDisplayProps {
  initialItems: KitchenItem[];
}

type StationFilter = StationType | "all";

const stationLabels: Record<StationType, string> = {
  hot: "Κουζίνα",
  cold: "Κρύα",
  bar: "Μπαρ",
  dessert: "Γλυκά",
};

function getElapsedMinutes(createdAt: string): number {
  return Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 60000,
  );
}

function getTimerColor(minutes: number): string {
  if (minutes < 5) return "text-emerald-500 border-emerald-500/50";
  if (minutes < 10) return "text-amber-500 border-amber-500/50";
  if (minutes < 15) return "text-orange-500 border-orange-500/50";
  return "text-red-500 border-red-500/50 animate-pulse";
}

function formatTimer(createdAt: string): string {
  const totalSeconds = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 1000,
  );
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function KitchenDisplay({ initialItems }: KitchenDisplayProps) {
  const items = useRealtimeKitchen(initialItems);
  const [station, setStation] = useState<StationFilter>("all");
  const [isPending, startTransition] = useTransition();
  const [, setTick] = useState(0);

  // Update timers every second
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredItems =
    station === "all"
      ? items
      : items.filter((i) => i.station === station);

  // Group items by order
  const orderGroups = new Map<
    string,
    { tableNumber: number; items: KitchenItem[] }
  >();

  for (const item of filteredItems) {
    const group = orderGroups.get(item.order_id) ?? {
      tableNumber: item.table_number,
      items: [],
    };
    group.items.push(item);
    orderGroups.set(item.order_id, group);
  }

  const handleStatusChange = (
    itemId: string,
    newStatus: OrderItemStatus,
  ) => {
    startTransition(async () => {
      const result = await updateItemStatus({
        itemId,
        status: newStatus,
      });
      if (!result.success) {
        toast.error(result.error);
      }
    });
  };

  const stationCounts = {
    all: items.length,
    hot: items.filter((i) => i.station === "hot").length,
    cold: items.filter((i) => i.station === "cold").length,
    bar: items.filter((i) => i.station === "bar").length,
    dessert: items.filter((i) => i.station === "dessert").length,
  };

  return (
    <div>
      <Tabs
        value={station}
        onValueChange={(v) => setStation(v as StationFilter)}
      >
        <TabsList>
          <TabsTrigger value="all">
            Όλα ({stationCounts.all})
          </TabsTrigger>
          {(Object.keys(stationLabels) as StationType[]).map((s) => (
            <TabsTrigger key={s} value={s}>
              {stationLabels[s]} ({stationCounts[s]})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {orderGroups.size === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ChefHat className="mb-4 size-12 opacity-30" />
          <p>Δεν υπάρχουν παραγγελίες</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from(orderGroups.entries()).map(
            ([orderId, { tableNumber, items: orderItems }]) => {
              const oldestItem = orderItems.reduce((oldest, item) =>
                item.created_at < oldest.created_at ? item : oldest,
              );
              const minutes = getElapsedMinutes(oldestItem.created_at);
              const timerColor = getTimerColor(minutes);

              return (
                <Card
                  key={orderId}
                  className={`border-2 ${timerColor.split(" ").slice(1).join(" ")}`}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4">
                    <CardTitle className="text-base">
                      Τραπέζι {tableNumber}
                    </CardTitle>
                    <div
                      className={`flex items-center gap-1 text-sm font-mono font-bold ${timerColor.split(" ")[0]}`}
                    >
                      <Clock className="size-3.5" />
                      {formatTimer(oldestItem.created_at)}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2 px-4 pb-3">
                    {orderItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-md bg-muted/50 p-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1"
                            >
                              ×{item.quantity}
                            </Badge>
                            <span className="text-sm font-medium truncate">
                              {item.product_name}
                            </span>
                          </div>
                          {item.order_item_modifiers.length > 0 && (
                            <p className="text-xs text-amber-600 ml-7">
                              {item.order_item_modifiers
                                .map((m) => m.name)
                                .join(", ")}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-muted-foreground italic ml-7">
                              {item.notes}
                            </p>
                          )}
                        </div>

                        {item.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0"
                            onClick={() =>
                              handleStatusChange(item.id, "preparing")
                            }
                            disabled={isPending}
                          >
                            <Flame className="mr-1 size-3" />
                            Ξεκίνα
                          </Button>
                        )}

                        {item.status === "preparing" && (
                          <Button
                            size="sm"
                            className="shrink-0"
                            onClick={() =>
                              handleStatusChange(item.id, "ready")
                            }
                            disabled={isPending}
                          >
                            <Check className="mr-1 size-3" />
                            Έτοιμο
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(pos)/kitchen/page.tsx" components/pos/kitchen-display.tsx
git commit -m "feat: rewrite kitchen display with realtime updates and live timers"
```

---

## Task 12: Checkout Page

**Files:**
- Create: `app/(pos)/checkout/[tableId]/page.tsx`
- Create: `components/pos/checkout-flow.tsx`

- [ ] **Step 1: Create checkout page Server Component**

Create `app/(pos)/checkout/[tableId]/page.tsx`:

```typescript
import { notFound, redirect } from "next/navigation";
import { getTableById } from "@/lib/queries/tables";
import { getActiveOrderByTable, getOrderItems } from "@/lib/queries/orders";
import { CheckoutFlow } from "@/components/pos/checkout-flow";

interface CheckoutPageProps {
  params: Promise<{ tableId: string }>;
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { tableId } = await params;

  const table = await getTableById(tableId);
  if (!table) notFound();

  const order = await getActiveOrderByTable(tableId);
  if (!order) redirect(`/orders/${tableId}`);

  const items = await getOrderItems(order.id);

  return (
    <CheckoutFlow
      table={table}
      order={order}
      items={items}
    />
  );
}
```

- [ ] **Step 2: Create CheckoutFlow client component**

Create `components/pos/checkout-flow.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Check,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { completeOrder } from "@/lib/actions/orders";
import type {
  DbTable,
  DbOrder,
  OrderItemWithModifiers,
  PaymentMethod,
} from "@/lib/types/database";

interface CheckoutFlowProps {
  table: DbTable;
  order: DbOrder;
  items: OrderItemWithModifiers[];
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

type CheckoutStep = "payment" | "receipt";

export function CheckoutFlow({ table, order, items }: CheckoutFlowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<CheckoutStep>("payment");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [cashGiven, setCashGiven] = useState("");

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    const modTotal = item.order_item_modifiers.reduce(
      (s, m) => s + m.price,
      0,
    );
    return sum + (item.price + modTotal) * item.quantity;
  }, 0);

  // Approximate VAT (24% standard rate for simplicity in display)
  const vatAmount = subtotal - subtotal / 1.24;
  const total = subtotal;
  const cashGivenNum = parseFloat(cashGiven) || 0;
  const change = cashGivenNum - total;

  const handleComplete = () => {
    if (!paymentMethod) return;

    startTransition(async () => {
      const result = await completeOrder({
        orderId: order.id,
        tableId: table.id,
        paymentMethod,
      });

      if (result.success) {
        setStep("receipt");
        toast.success("Πληρωμή ολοκληρώθηκε!");
      } else {
        toast.error(result.error);
      }
    });
  };

  if (step === "receipt") {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <Card>
          <CardContent className="p-6 space-y-4 font-mono text-sm">
            <div className="text-center space-y-1">
              <p className="text-base font-bold">ΜΑΥΡΗ ΘΑΛΑΣΣΑ</p>
              <p className="text-xs text-muted-foreground">
                Νίκης 3, Καλαμαριά 55132
              </p>
              <p className="text-xs text-muted-foreground">
                ΑΦΜ: 800474837
              </p>
            </div>

            <Separator />

            <div className="flex justify-between text-xs">
              <span>Τραπέζι: {table.number}</span>
              <span>
                {new Date().toLocaleDateString("el-GR")}{" "}
                {new Date().toLocaleTimeString("el-GR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <Separator />

            <div className="space-y-1">
              {items.map((item) => {
                const modTotal = item.order_item_modifiers.reduce(
                  (s, m) => s + m.price,
                  0,
                );
                const lineTotal =
                  (item.price + modTotal) * item.quantity;
                return (
                  <div
                    key={item.id}
                    className="flex justify-between"
                  >
                    <span>
                      {item.quantity}× {item.product_name}
                    </span>
                    <span>{formatPrice(lineTotal)}</span>
                  </div>
                );
              })}
            </div>

            <Separator />

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Καθαρή αξία</span>
                <span>{formatPrice(total - vatAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>ΦΠΑ</span>
                <span>{formatPrice(vatAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-base">
                <span>ΣΥΝΟΛΟ</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between text-xs">
              <span>
                Πληρωμή:{" "}
                {paymentMethod === "cash" ? "Μετρητά" : "Κάρτα"}
              </span>
              {paymentMethod === "cash" && cashGivenNum > 0 && (
                <span>Ρέστα: {formatPrice(change)}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.print()}
          >
            <Printer className="mr-2 size-4" />
            Εκτύπωση
          </Button>
          <Button
            className="flex-1"
            onClick={() => router.push("/tables")}
          >
            <Check className="mr-2 size-4" />
            Κλείσιμο
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/orders/${table.id}`)}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-bold">
          Λογαριασμός — Τραπέζι {table.number}
        </h1>
      </div>

      {/* Order summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Σύνοψη παραγγελίας</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {items.map((item) => {
            const modTotal = item.order_item_modifiers.reduce(
              (s, m) => s + m.price,
              0,
            );
            const lineTotal =
              (item.price + modTotal) * item.quantity;
            return (
              <div
                key={item.id}
                className="flex justify-between text-sm"
              >
                <span>
                  {item.quantity}× {item.product_name}
                  {item.order_item_modifiers.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      (+{item.order_item_modifiers.map((m) => m.name).join(", ")})
                    </span>
                  )}
                </span>
                <span className="font-medium">
                  {formatPrice(lineTotal)}
                </span>
              </div>
            );
          })}
          <Separator className="my-2" />
          <div className="flex justify-between font-bold text-lg">
            <span>Σύνολο</span>
            <span>{formatPrice(total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment method */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Τρόπος πληρωμής</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={paymentMethod === "cash" ? "default" : "outline"}
              className="h-16 text-lg"
              onClick={() => setPaymentMethod("cash")}
            >
              <Banknote className="mr-2 size-5" />
              Μετρητά
            </Button>
            <Button
              variant={paymentMethod === "card" ? "default" : "outline"}
              className="h-16 text-lg"
              onClick={() => setPaymentMethod("card")}
            >
              <CreditCard className="mr-2 size-5" />
              Κάρτα
            </Button>
          </div>

          {paymentMethod === "cash" && (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">
                  Ποσό που δόθηκε
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value)}
                  placeholder="0.00"
                  className="text-lg font-mono"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                {[20, 50, 100].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setCashGiven(amount.toString())}
                  >
                    €{amount}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCashGiven(total.toFixed(2))
                  }
                >
                  Ακριβές
                </Button>
              </div>

              {cashGivenNum > 0 && (
                <div
                  className={`rounded-lg p-3 text-center text-lg font-bold ${
                    change >= 0
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-red-500/10 text-red-600"
                  }`}
                >
                  {change >= 0
                    ? `Ρέστα: ${formatPrice(change)}`
                    : `Υπολείπεται: ${formatPrice(Math.abs(change))}`}
                </div>
              )}
            </div>
          )}

          {paymentMethod === "card" && (
            <div className="rounded-lg border-2 border-dashed p-6 text-center text-muted-foreground">
              <CreditCard className="mx-auto mb-2 size-8 opacity-50" />
              <p>Χρησιμοποιήστε το POS terminal</p>
              <p className="text-lg font-bold text-foreground mt-1">
                {formatPrice(total)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complete button */}
      <Button
        className="w-full h-14 text-lg"
        size="lg"
        onClick={handleComplete}
        disabled={
          !paymentMethod ||
          isPending ||
          (paymentMethod === "cash" && change < 0)
        }
      >
        {isPending ? "Ολοκλήρωση..." : "Ολοκλήρωση Πληρωμής"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(pos)/checkout/[tableId]/page.tsx" components/pos/checkout-flow.tsx
git commit -m "feat: add checkout page with cash/card payment and receipt"
```

---

## Task 13: Seed Data & Verification

- [ ] **Step 1: Ensure zones and tables seed data exists**

Run in Supabase SQL Editor if zones/tables are empty:

```sql
-- Check if data exists
SELECT COUNT(*) FROM zones;
SELECT COUNT(*) FROM tables;

-- If empty, insert test data:
INSERT INTO zones (name, color, sort_order) VALUES
  ('Εσωτερικός', '#3b82f6', 1),
  ('Εξωτερικός', '#22c55e', 2),
  ('Μπαρ', '#f59e0b', 3),
  ('VIP', '#a855f7', 4);

-- Insert tables (20 tables across zones)
INSERT INTO tables (number, capacity, status, zone_id, x, y, shape, rotation)
SELECT
  t.num, t.cap, 'available', z.id, t.x, t.y, t.shp::table_shape, 0
FROM (VALUES
  (1, 4, 10, 10, 'square'), (2, 4, 30, 10, 'square'),
  (3, 6, 50, 10, 'rectangle'), (4, 2, 70, 10, 'round'),
  (5, 4, 10, 30, 'square'), (6, 4, 30, 30, 'square'),
  (7, 8, 50, 30, 'rectangle'), (8, 2, 70, 30, 'round'),
  (9, 4, 10, 50, 'square'), (10, 4, 30, 50, 'square')
) AS t(num, cap, x, y, shp)
CROSS JOIN (SELECT id FROM zones WHERE name = 'Εσωτερικός') z;

INSERT INTO tables (number, capacity, status, zone_id, x, y, shape, rotation)
SELECT
  t.num, t.cap, 'available', z.id, t.x, t.y, t.shp::table_shape, 0
FROM (VALUES
  (11, 4, 10, 10, 'square'), (12, 6, 30, 10, 'rectangle'),
  (13, 4, 50, 10, 'square'), (14, 8, 70, 10, 'rectangle'),
  (15, 2, 10, 30, 'round'), (16, 4, 30, 30, 'square')
) AS t(num, cap, x, y, shp)
CROSS JOIN (SELECT id FROM zones WHERE name = 'Εξωτερικός') z;

INSERT INTO tables (number, capacity, status, zone_id, x, y, shape, rotation)
SELECT
  t.num, t.cap, 'available', z.id, t.x, t.y, t.shp::table_shape, 0
FROM (VALUES
  (17, 2, 20, 20, 'round'), (18, 2, 50, 20, 'round')
) AS t(num, cap, x, y, shp)
CROSS JOIN (SELECT id FROM zones WHERE name = 'Μπαρ') z;

INSERT INTO tables (number, capacity, status, zone_id, x, y, shape, rotation)
SELECT
  t.num, t.cap, 'available', z.id, t.x, t.y, t.shp::table_shape, 0
FROM (VALUES
  (19, 6, 30, 30, 'rectangle'), (20, 8, 60, 30, 'rectangle')
) AS t(num, cap, x, y, shp)
CROSS JOIN (SELECT id FROM zones WHERE name = 'VIP') z;
```

- [ ] **Step 2: Start dev server and verify**

```bash
cd C:/Users/ntont/Desktop/MAURI/mauri_thalasa
pnpm dev
```

Open `http://localhost:3000`:

1. **Tables page** (`/tables`):
   - Shows 20 tables in a grid
   - Zone tabs filter correctly
   - All tables show "Διαθέσιμο" (green)

2. **Order flow** (click any table):
   - Products displayed in grid with categories
   - Click product → order created, item added
   - Table on floor plan changes to "Κατειλημμένο" (amber) on another tab
   - Quantity +/- buttons work for pending items
   - Click "Λογαριασμός" → navigates to checkout

3. **Kitchen display** (`/kitchen`):
   - Shows pending items grouped by order
   - Timers counting up in real time
   - "Ξεκίνα" button → changes to "preparing"
   - "Έτοιμο" button → item disappears from kitchen

4. **Checkout** (from order page):
   - Order summary with item list
   - Cash: amount entry, change calculation
   - Card: POS terminal message
   - Complete → receipt displayed, table freed

5. **Realtime** (open two browser tabs):
   - Change table status in one → updates in the other
   - Add items in order → appear in kitchen display

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: core POS complete - tables, orders, kitchen, checkout with realtime"
```

---

## Summary

After completing this plan, we have:

| Component | Status |
|-----------|--------|
| Database types (zones, tables, orders, modifiers) | Working |
| Realtime enabled on tables, orders, order_items | Working |
| Zod validators for order operations | Working |
| Server queries (zones, tables, modifiers, orders, kitchen) | Working |
| Server actions (table status, order CRUD, checkout) | Working |
| Realtime hooks (tables, orders, kitchen) | Working |
| Tables page with floor plan + zone tabs | Working |
| Order page with menu browser + live order | Working |
| Kitchen display with timers + status updates | Working |
| Checkout page with cash/card + receipt | Working |
| Cross-device sync via Supabase Realtime | Working |

**Next plan:** Phase 3 - Operations (Inventory, Recipes, Suppliers, CRM)
