# Operations - Implementation Plan (Phase 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver 4 operational modules — Customers/CRM, Inventory (ingredients + stock alerts), Recipes (food cost), and Suppliers — all connected to Supabase, replacing the placeholder pages.

**Architecture:** Same pattern as Phase 2: Server Components fetch data, Client Components for interactivity, Server Actions with Zod validation for mutations. No realtime needed for these modules (data changes infrequently).

**Tech Stack:** Next.js 16, React 19, TypeScript 5.7, Supabase, Tailwind CSS 4, shadcn/ui, Zod

---

## File Structure

### New files to create:

```
lib/
├── types/
│   └── database.ts             -- EXTEND: DbCustomer, DbCustomerVisit, DbIngredient, DbRecipe, DbRecipeIngredient, DbWasteEntry, DbSupplier, DbSupplierOrder, DbSupplierOrderItem
├── validators/
│   ├── customers.ts            -- Zod schemas for customer CRUD
│   ├── inventory.ts            -- Zod schemas for ingredients, waste
│   └── suppliers.ts            -- Zod schemas for supplier orders
├── queries/
│   ├── customers.ts            -- getCustomers, getCustomerById, getCustomerVisits
│   ├── ingredients.ts          -- getIngredients, getLowStockIngredients
│   ├── recipes.ts              -- getRecipes, getRecipeByProduct
│   └── suppliers.ts            -- getSuppliers, getSupplierOrders
└── actions/
    ├── customers.ts            -- createCustomer, updateCustomer, deleteCustomer
    ├── inventory.ts            -- createIngredient, updateIngredient, updateStock, recordWaste
    ├── recipes.ts              -- createRecipe, updateRecipe
    └── suppliers.ts            -- createSupplier, createSupplierOrder, updateOrderStatus

app/(pos)/
├── customers/page.tsx          -- REWRITE: Server Component
├── inventory/page.tsx          -- REWRITE: Server Component
├── recipes/page.tsx            -- REWRITE: Server Component (removed from plan - merge into inventory)

components/pos/
├── customers-panel.tsx         -- NEW: Customer list + search + detail + form
├── inventory-panel.tsx         -- NEW: Ingredients table + stock alerts + waste log
├── recipe-panel.tsx            -- NEW: Recipe list + editor + food cost
└── suppliers-panel.tsx         -- NEW: Supplier list + order management
```

---

## Task 1: Extend Database Types

**Files:**
- Modify: `lib/types/database.ts`

- [ ] **Step 1: Add customer, ingredient, recipe, supplier types**

Add after the existing `KitchenItem` type in `lib/types/database.ts`:

```typescript
// --- Customers ---

export interface DbCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthday: string | null;
  notes: string | null;
  is_vip: boolean;
  allergies: string[];
  tags: string[];
  loyalty_points: number;
  stamp_count: number;
  afm: string | null;
  address: Record<string, unknown>;
  contact: Record<string, unknown>;
  billing: Record<string, unknown>;
  is_active: boolean;
  discount: number;
  legacy_id: number | null;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbCustomerVisit {
  id: string;
  customer_id: string;
  order_id: string | null;
  date: string;
  table_number: number;
  total: number;
  items: string[];
  created_at: string;
}

// --- Inventory ---

export type IngredientUnit = "kg" | "lt" | "pcs" | "gr" | "ml";
export type IngredientCategory = "seafood" | "meat" | "vegetables" | "dairy" | "dry" | "beverages" | "other";
export type WasteReason = "expired" | "damaged" | "overproduction" | "other";

export interface DbIngredient {
  id: string;
  name: string;
  unit: IngredientUnit;
  current_stock: number;
  min_stock: number;
  cost_per_unit: number;
  supplier_id: string | null;
  category: IngredientCategory;
  created_at: string;
  updated_at: string;
}

export interface DbWasteEntry {
  id: string;
  ingredient_id: string;
  quantity: number;
  reason: WasteReason;
  date: string;
  notes: string | null;
  created_at: string;
}

// --- Recipes ---

export interface DbRecipe {
  id: string;
  product_id: string;
  prep_time: number | null;
  portion_size: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbRecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
}

export type RecipeWithIngredients = DbRecipe & {
  recipe_ingredients: (DbRecipeIngredient & {
    ingredients: DbIngredient;
  })[];
  products: { name: string; price: number };
};

// --- Suppliers ---

export type SupplierOrderStatus = "draft" | "sent" | "received" | "cancelled";

export interface DbSupplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  categories: IngredientCategory[];
  afm: string | null;
  address: Record<string, unknown>;
  legacy_id: number | null;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbSupplierOrder {
  id: string;
  supplier_id: string;
  status: SupplierOrderStatus;
  created_at: string;
  notes: string | null;
}

export interface DbSupplierOrderItem {
  id: string;
  supplier_order_id: string;
  ingredient_id: string;
  quantity: number;
  estimated_cost: number;
}

export type SupplierOrderWithItems = DbSupplierOrder & {
  supplier_order_items: (DbSupplierOrderItem & {
    ingredients: { name: string; unit: string };
  })[];
  suppliers: { name: string };
};

export type IngredientWithSupplier = DbIngredient & {
  suppliers: { name: string } | null;
};

export type WasteEntryWithIngredient = DbWasteEntry & {
  ingredients: { name: string; unit: string };
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/types/database.ts
git commit -m "feat(types): add customer, ingredient, recipe, supplier DB types"
```

---

## Task 2: Validators

**Files:**
- Create: `lib/validators/customers.ts`
- Create: `lib/validators/inventory.ts`
- Create: `lib/validators/suppliers.ts`

- [ ] **Step 1: Create customer validators**

Create `lib/validators/customers.ts`:

```typescript
import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Το όνομα είναι υποχρεωτικό").max(200),
  phone: z.string().max(20).optional(),
  email: z.string().email("Μη έγκυρο email").optional().or(z.literal("")),
  birthday: z.string().optional(),
  notes: z.string().max(1000).optional(),
  is_vip: z.boolean().default(false),
  allergies: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  afm: z.string().max(20).optional(),
  discount: z.number().min(0).max(100).default(0),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
```

- [ ] **Step 2: Create inventory validators**

Create `lib/validators/inventory.ts`:

```typescript
import { z } from "zod";

export const createIngredientSchema = z.object({
  name: z.string().min(1, "Το όνομα είναι υποχρεωτικό").max(200),
  unit: z.enum(["kg", "lt", "pcs", "gr", "ml"]),
  current_stock: z.number().min(0).default(0),
  min_stock: z.number().min(0).default(0),
  cost_per_unit: z.number().min(0).default(0),
  supplier_id: z.string().uuid().optional().nullable(),
  category: z.enum(["seafood", "meat", "vegetables", "dairy", "dry", "beverages", "other"]),
});

export const updateIngredientSchema = createIngredientSchema.partial();

export const updateStockSchema = z.object({
  ingredientId: z.string().uuid(),
  quantity: z.number(),
});

export const recordWasteSchema = z.object({
  ingredient_id: z.string().uuid(),
  quantity: z.number().min(0.01, "Η ποσότητα πρέπει να είναι θετική"),
  reason: z.enum(["expired", "damaged", "overproduction", "other"]),
  notes: z.string().max(500).optional(),
});

export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;
export type UpdateStockInput = z.infer<typeof updateStockSchema>;
export type RecordWasteInput = z.infer<typeof recordWasteSchema>;
```

- [ ] **Step 3: Create supplier validators**

Create `lib/validators/suppliers.ts`:

```typescript
import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().min(1, "Το όνομα είναι υποχρεωτικό").max(200),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  categories: z.array(z.enum(["seafood", "meat", "vegetables", "dairy", "dry", "beverages", "other"])).default([]),
  afm: z.string().max(20).optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const createSupplierOrderSchema = z.object({
  supplier_id: z.string().uuid(),
  notes: z.string().max(500).optional(),
  items: z.array(z.object({
    ingredient_id: z.string().uuid(),
    quantity: z.number().min(0.01),
    estimated_cost: z.number().min(0),
  })).min(1, "Προσθέστε τουλάχιστον ένα είδος"),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type CreateSupplierOrderInput = z.infer<typeof createSupplierOrderSchema>;
```

- [ ] **Step 4: Commit**

```bash
git add lib/validators/customers.ts lib/validators/inventory.ts lib/validators/suppliers.ts
git commit -m "feat: add Zod validators for customers, inventory, and suppliers"
```

---

## Task 3: Queries - Customers

**Files:**
- Create: `lib/queries/customers.ts`

- [ ] **Step 1: Create customer queries**

Create `lib/queries/customers.ts`:

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbCustomer, DbCustomerVisit } from "@/lib/types/database";

export async function getCustomers(search?: string): Promise<DbCustomer[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("customers")
    .select(
      "id, name, phone, email, birthday, notes, is_vip, allergies, tags, loyalty_points, stamp_count, afm, address, contact, billing, is_active, discount, legacy_id, source, metadata, created_at, updated_at",
    )
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,afm.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch customers: ${error.message}`);
  }

  return data;
}

export async function getCustomerById(id: string): Promise<DbCustomer | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, name, phone, email, birthday, notes, is_vip, allergies, tags, loyalty_points, stamp_count, afm, address, contact, billing, is_active, discount, legacy_id, source, metadata, created_at, updated_at",
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch customer: ${error.message}`);
  }

  return data;
}

export async function getCustomerVisits(customerId: string): Promise<DbCustomerVisit[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("customer_visits")
    .select("id, customer_id, order_id, date, table_number, total, items, created_at")
    .eq("customer_id", customerId)
    .order("date", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to fetch visits: ${error.message}`);
  }

  return data;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/queries/customers.ts
git commit -m "feat: add server queries for customers and visits"
```

---

## Task 4: Queries - Inventory & Recipes

**Files:**
- Create: `lib/queries/ingredients.ts`
- Create: `lib/queries/recipes.ts`

- [ ] **Step 1: Create ingredients queries**

Create `lib/queries/ingredients.ts`:

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { IngredientWithSupplier, WasteEntryWithIngredient } from "@/lib/types/database";

export async function getIngredients(): Promise<IngredientWithSupplier[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("ingredients")
    .select(
      `id, name, unit, current_stock, min_stock, cost_per_unit, supplier_id, category, created_at, updated_at,
       suppliers(name)`,
    )
    .order("category")
    .order("name");

  if (error) {
    throw new Error(`Failed to fetch ingredients: ${error.message}`);
  }

  return data as IngredientWithSupplier[];
}

export async function getLowStockIngredients(): Promise<IngredientWithSupplier[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("ingredients")
    .select(
      `id, name, unit, current_stock, min_stock, cost_per_unit, supplier_id, category, created_at, updated_at,
       suppliers(name)`,
    )
    .filter("current_stock", "lte", "min_stock" as unknown as string);

  if (error) {
    throw new Error(`Failed to fetch low stock: ${error.message}`);
  }

  return data as IngredientWithSupplier[];
}

export async function getWasteLog(): Promise<WasteEntryWithIngredient[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("waste_log")
    .select(
      `id, ingredient_id, quantity, reason, date, notes, created_at,
       ingredients(name, unit)`,
    )
    .order("date", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Failed to fetch waste log: ${error.message}`);
  }

  return data as WasteEntryWithIngredient[];
}
```

- [ ] **Step 2: Create recipes queries**

Create `lib/queries/recipes.ts`:

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RecipeWithIngredients } from "@/lib/types/database";

export async function getRecipes(): Promise<RecipeWithIngredients[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("recipes")
    .select(
      `id, product_id, prep_time, portion_size, created_at, updated_at,
       products(name, price),
       recipe_ingredients(id, recipe_id, ingredient_id, quantity, unit,
         ingredients(id, name, unit, cost_per_unit)
       )`,
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch recipes: ${error.message}`);
  }

  return data as unknown as RecipeWithIngredients[];
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/queries/ingredients.ts lib/queries/recipes.ts
git commit -m "feat: add server queries for ingredients, waste log, and recipes"
```

---

## Task 5: Queries - Suppliers

**Files:**
- Create: `lib/queries/suppliers.ts`

- [ ] **Step 1: Create supplier queries**

Create `lib/queries/suppliers.ts`:

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbSupplier, SupplierOrderWithItems } from "@/lib/types/database";

export async function getSuppliers(): Promise<DbSupplier[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select(
      "id, name, phone, email, categories, afm, address, legacy_id, source, metadata, created_at, updated_at",
    )
    .order("name");

  if (error) {
    throw new Error(`Failed to fetch suppliers: ${error.message}`);
  }

  return data;
}

export async function getSupplierOrders(): Promise<SupplierOrderWithItems[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("supplier_orders")
    .select(
      `id, supplier_id, status, created_at, notes,
       suppliers(name),
       supplier_order_items(id, supplier_order_id, ingredient_id, quantity, estimated_cost,
         ingredients(name, unit)
       )`,
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to fetch supplier orders: ${error.message}`);
  }

  return data as unknown as SupplierOrderWithItems[];
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/queries/suppliers.ts
git commit -m "feat: add server queries for suppliers and supplier orders"
```

---

## Task 6: Actions - Customers

**Files:**
- Create: `lib/actions/customers.ts`

- [ ] **Step 1: Create customer actions**

Create `lib/actions/customers.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createCustomerSchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
} from "@/lib/validators/customers";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createCustomer(
  input: CreateCustomerInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("customers")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: `Αποτυχία δημιουργίας: ${error.message}` };
  }

  revalidatePath("/customers");
  return { success: true, data: { id: data.id } };
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
): Promise<ActionResult> {
  const parsed = updateCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("customers")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { success: false, error: `Αποτυχία ενημέρωσης: ${error.message}` };
  }

  revalidatePath("/customers");
  return { success: true };
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("customers")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    return { success: false, error: `Αποτυχία διαγραφής: ${error.message}` };
  }

  revalidatePath("/customers");
  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/actions/customers.ts
git commit -m "feat: add server actions for customer CRUD"
```

---

## Task 7: Actions - Inventory

**Files:**
- Create: `lib/actions/inventory.ts`

- [ ] **Step 1: Create inventory actions**

Create `lib/actions/inventory.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createIngredientSchema,
  updateIngredientSchema,
  updateStockSchema,
  recordWasteSchema,
  type CreateIngredientInput,
  type UpdateIngredientInput,
  type UpdateStockInput,
  type RecordWasteInput,
} from "@/lib/validators/inventory";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createIngredient(
  input: CreateIngredientInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createIngredientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("ingredients")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: `Αποτυχία δημιουργίας: ${error.message}` };
  }

  revalidatePath("/inventory");
  return { success: true, data: { id: data.id } };
}

export async function updateIngredient(
  id: string,
  input: UpdateIngredientInput,
): Promise<ActionResult> {
  const parsed = updateIngredientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("ingredients")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { success: false, error: `Αποτυχία ενημέρωσης: ${error.message}` };
  }

  revalidatePath("/inventory");
  return { success: true };
}

export async function updateStock(
  input: UpdateStockInput,
): Promise<ActionResult> {
  const parsed = updateStockSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  // Get current stock
  const { data: ingredient, error: fetchError } = await supabase
    .from("ingredients")
    .select("current_stock")
    .eq("id", parsed.data.ingredientId)
    .single();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  const newStock = ingredient.current_stock + parsed.data.quantity;
  if (newStock < 0) {
    return { success: false, error: "Ανεπαρκές απόθεμα" };
  }

  const { error } = await supabase
    .from("ingredients")
    .update({ current_stock: newStock })
    .eq("id", parsed.data.ingredientId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/inventory");
  return { success: true };
}

export async function deleteIngredient(id: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("ingredients")
    .delete()
    .eq("id", id);

  if (error) {
    if (error.message.includes("foreign key")) {
      return { success: false, error: "Το υλικό χρησιμοποιείται σε συνταγές" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/inventory");
  return { success: true };
}

export async function recordWaste(
  input: RecordWasteInput,
): Promise<ActionResult> {
  const parsed = recordWasteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  // Insert waste entry
  const { error: wasteError } = await supabase
    .from("waste_log")
    .insert({
      ...parsed.data,
      date: new Date().toISOString().split("T")[0],
    });

  if (wasteError) {
    return { success: false, error: `Αποτυχία καταγραφής: ${wasteError.message}` };
  }

  // Deduct from stock
  await updateStock({
    ingredientId: parsed.data.ingredient_id,
    quantity: -parsed.data.quantity,
  });

  revalidatePath("/inventory");
  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/actions/inventory.ts
git commit -m "feat: add server actions for ingredients, stock, and waste"
```

---

## Task 8: Actions - Recipes & Suppliers

**Files:**
- Create: `lib/actions/recipes.ts`
- Create: `lib/actions/suppliers.ts`

- [ ] **Step 1: Create recipe actions**

Create `lib/actions/recipes.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

interface RecipeInput {
  product_id: string;
  prep_time?: number;
  portion_size?: number;
  ingredients: {
    ingredient_id: string;
    quantity: number;
    unit: string;
  }[];
}

export async function saveRecipe(
  input: RecipeInput,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createServerSupabaseClient();

  // Upsert recipe
  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .upsert(
      {
        product_id: input.product_id,
        prep_time: input.prep_time ?? null,
        portion_size: input.portion_size ?? null,
      },
      { onConflict: "product_id" },
    )
    .select("id")
    .single();

  if (recipeError) {
    return { success: false, error: `Αποτυχία αποθήκευσης: ${recipeError.message}` };
  }

  // Replace ingredients
  await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", recipe.id);

  if (input.ingredients.length > 0) {
    const rows = input.ingredients.map((ing) => ({
      recipe_id: recipe.id,
      ingredient_id: ing.ingredient_id,
      quantity: ing.quantity,
      unit: ing.unit,
    }));

    const { error: ingError } = await supabase
      .from("recipe_ingredients")
      .insert(rows);

    if (ingError) {
      return { success: false, error: `Αποτυχία υλικών: ${ingError.message}` };
    }
  }

  revalidatePath("/recipes");
  return { success: true, data: { id: recipe.id } };
}

export async function deleteRecipe(recipeId: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
  const { error } = await supabase.from("recipes").delete().eq("id", recipeId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/recipes");
  return { success: true };
}
```

- [ ] **Step 2: Create supplier actions**

Create `lib/actions/suppliers.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createSupplierSchema,
  updateSupplierSchema,
  createSupplierOrderSchema,
  type CreateSupplierInput,
  type UpdateSupplierInput,
  type CreateSupplierOrderInput,
} from "@/lib/validators/suppliers";
import type { SupplierOrderStatus } from "@/lib/types/database";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createSupplier(
  input: CreateSupplierInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createSupplierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("suppliers")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: `Αποτυχία δημιουργίας: ${error.message}` };
  }

  revalidatePath("/inventory");
  return { success: true, data: { id: data.id } };
}

export async function updateSupplier(
  id: string,
  input: UpdateSupplierInput,
): Promise<ActionResult> {
  const parsed = updateSupplierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("suppliers")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/inventory");
  return { success: true };
}

export async function createSupplierOrder(
  input: CreateSupplierOrderInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createSupplierOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { data: order, error: orderError } = await supabase
    .from("supplier_orders")
    .insert({
      supplier_id: parsed.data.supplier_id,
      status: "draft",
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();

  if (orderError) {
    return { success: false, error: orderError.message };
  }

  const items = parsed.data.items.map((item) => ({
    supplier_order_id: order.id,
    ...item,
  }));

  const { error: itemsError } = await supabase
    .from("supplier_order_items")
    .insert(items);

  if (itemsError) {
    await supabase.from("supplier_orders").delete().eq("id", order.id);
    return { success: false, error: itemsError.message };
  }

  revalidatePath("/inventory");
  return { success: true, data: { id: order.id } };
}

export async function updateSupplierOrderStatus(
  orderId: string,
  status: SupplierOrderStatus,
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("supplier_orders")
    .update({ status })
    .eq("id", orderId);

  if (error) {
    return { success: false, error: error.message };
  }

  // If received, update ingredient stock
  if (status === "received") {
    const { data: items } = await supabase
      .from("supplier_order_items")
      .select("ingredient_id, quantity")
      .eq("supplier_order_id", orderId);

    if (items) {
      for (const item of items) {
        const { data: ing } = await supabase
          .from("ingredients")
          .select("current_stock")
          .eq("id", item.ingredient_id)
          .single();

        if (ing) {
          await supabase
            .from("ingredients")
            .update({ current_stock: ing.current_stock + item.quantity })
            .eq("id", item.ingredient_id);
        }
      }
    }
  }

  revalidatePath("/inventory");
  return { success: true };
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/actions/recipes.ts lib/actions/suppliers.ts
git commit -m "feat: add server actions for recipes and supplier orders"
```

---

## Task 9: Customers Page

**Files:**
- Rewrite: `app/(pos)/customers/page.tsx`
- Create: `components/pos/customers-panel.tsx`

- [ ] **Step 1: Rewrite customers page**

Replace `app/(pos)/customers/page.tsx`:

```typescript
import { getCustomers } from "@/lib/queries/customers";
import { CustomersPanel } from "@/components/pos/customers-panel";

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Πελάτες</h1>
        <p className="text-muted-foreground">
          {customers.length} πελάτες • {customers.filter((c) => c.is_vip).length} VIP
        </p>
      </div>
      <CustomersPanel initialCustomers={customers} />
    </div>
  );
}
```

- [ ] **Step 2: Create CustomersPanel**

Create `components/pos/customers-panel.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, Star, Phone, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createCustomer, updateCustomer, deleteCustomer } from "@/lib/actions/customers";
import type { DbCustomer } from "@/lib/types/database";

interface CustomersPanelProps {
  initialCustomers: DbCustomer[];
}

export function CustomersPanel({ initialCustomers }: CustomersPanelProps) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DbCustomer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.afm?.includes(search),
  );

  const handleCreate = async (formData: FormData) => {
    const result = await createCustomer({
      name: formData.get("name") as string,
      phone: (formData.get("phone") as string) || undefined,
      email: (formData.get("email") as string) || undefined,
      afm: (formData.get("afm") as string) || undefined,
      is_vip: formData.get("is_vip") === "on",
      discount: Number(formData.get("discount")) || 0,
      notes: (formData.get("notes") as string) || undefined,
    });

    if (result.success) {
      toast.success("Ο πελάτης δημιουργήθηκε");
      setIsFormOpen(false);
      window.location.reload();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteCustomer(id);
      if (result.success) {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        setSelected(null);
        toast.success("Ο πελάτης διαγράφηκε");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4">
      {/* Left: Customer list */}
      <div className="w-full max-w-md space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Αναζήτηση..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button size="icon">
                <Plus className="size-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Νέος Πελάτης</DialogTitle>
              </DialogHeader>
              <form action={handleCreate} className="space-y-3">
                <div>
                  <Label htmlFor="name">Όνομα *</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="phone">Τηλέφωνο</Label>
                    <Input id="phone" name="phone" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="afm">ΑΦΜ</Label>
                    <Input id="afm" name="afm" />
                  </div>
                  <div>
                    <Label htmlFor="discount">Έκπτωση %</Label>
                    <Input id="discount" name="discount" type="number" min="0" max="100" defaultValue="0" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Σημειώσεις</Label>
                  <Input id="notes" name="notes" />
                </div>
                <Button type="submit" className="w-full">
                  Δημιουργία
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="h-[calc(100vh-14rem)]">
          <div className="space-y-1">
            {filtered.map((customer) => (
              <button
                key={customer.id}
                onClick={() => setSelected(customer)}
                className={`w-full rounded-md border p-3 text-left transition-colors hover:bg-accent ${
                  selected?.id === customer.id ? "border-primary bg-accent" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{customer.name}</span>
                  {customer.is_vip && (
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                  )}
                </div>
                {customer.phone && (
                  <span className="text-xs text-muted-foreground">{customer.phone}</span>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Customer detail */}
      <div className="flex-1">
        {selected ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {selected.name}
                {selected.is_vip && (
                  <Badge className="bg-amber-500">VIP</Badge>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => handleDelete(selected.id)}
                disabled={isPending}
              >
                <Trash2 className="size-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {selected.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="size-4 text-muted-foreground" />
                  {selected.phone}
                </div>
              )}
              {selected.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="size-4 text-muted-foreground" />
                  {selected.email}
                </div>
              )}
              {selected.afm && (
                <div className="text-sm">
                  <span className="text-muted-foreground">ΑΦΜ:</span> {selected.afm}
                </div>
              )}
              {selected.discount > 0 && (
                <Badge variant="outline">Έκπτωση {selected.discount}%</Badge>
              )}
              <div className="flex gap-2">
                <Badge variant="secondary">
                  Πόντοι: {selected.loyalty_points}
                </Badge>
                <Badge variant="secondary">
                  Stamps: {selected.stamp_count}
                </Badge>
              </div>
              {selected.allergies.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Αλλεργίες:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selected.allergies.map((a) => (
                      <Badge key={a} variant="destructive" className="text-xs">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {selected.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Σημειώσεις:</span>{" "}
                  {selected.notes}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p>Επιλέξτε πελάτη</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(pos)/customers/page.tsx" components/pos/customers-panel.tsx
git commit -m "feat: add customers page with search, create, and detail view"
```

---

## Task 10: Inventory Page

**Files:**
- Rewrite: `app/(pos)/inventory/page.tsx`
- Create: `components/pos/inventory-panel.tsx`

- [ ] **Step 1: Rewrite inventory page**

Replace `app/(pos)/inventory/page.tsx`:

```typescript
import { getIngredients, getWasteLog } from "@/lib/queries/ingredients";
import { getSuppliers } from "@/lib/queries/suppliers";
import { InventoryPanel } from "@/components/pos/inventory-panel";

export default async function InventoryPage() {
  const [ingredients, wasteLog, suppliers] = await Promise.all([
    getIngredients(),
    getWasteLog(),
    getSuppliers(),
  ]);

  const lowStock = ingredients.filter((i) => i.current_stock <= i.min_stock);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Αποθήκη</h1>
        <p className="text-muted-foreground">
          {ingredients.length} υλικά
          {lowStock.length > 0 && (
            <span className="text-red-500"> • {lowStock.length} χαμηλό απόθεμα</span>
          )}
        </p>
      </div>
      <InventoryPanel
        initialIngredients={ingredients}
        wasteLog={wasteLog}
        suppliers={suppliers}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create InventoryPanel**

Create `components/pos/inventory-panel.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createIngredient,
  deleteIngredient,
  recordWaste,
} from "@/lib/actions/inventory";
import type {
  IngredientWithSupplier,
  WasteEntryWithIngredient,
  DbSupplier,
  IngredientCategory,
} from "@/lib/types/database";

interface InventoryPanelProps {
  initialIngredients: IngredientWithSupplier[];
  wasteLog: WasteEntryWithIngredient[];
  suppliers: DbSupplier[];
}

const categoryLabels: Record<IngredientCategory, string> = {
  seafood: "Θαλασσινά",
  meat: "Κρέατα",
  vegetables: "Λαχανικά",
  dairy: "Γαλακτοκομικά",
  dry: "Ξηρά",
  beverages: "Ποτά",
  other: "Άλλα",
};

const unitLabels: Record<string, string> = {
  kg: "κιλά",
  lt: "λίτρα",
  pcs: "τεμάχια",
  gr: "γραμμάρια",
  ml: "ml",
};

const wasteReasonLabels: Record<string, string> = {
  expired: "Ληγμένο",
  damaged: "Κατεστραμμένο",
  overproduction: "Υπερπαραγωγή",
  other: "Άλλο",
};

export function InventoryPanel({
  initialIngredients,
  wasteLog,
  suppliers,
}: InventoryPanelProps) {
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isWasteOpen, setIsWasteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const lowStock = ingredients.filter((i) => i.current_stock <= i.min_stock);

  const handleCreateIngredient = async (formData: FormData) => {
    const result = await createIngredient({
      name: formData.get("name") as string,
      unit: formData.get("unit") as "kg" | "lt" | "pcs" | "gr" | "ml",
      category: formData.get("category") as IngredientCategory,
      current_stock: Number(formData.get("current_stock")) || 0,
      min_stock: Number(formData.get("min_stock")) || 0,
      cost_per_unit: Number(formData.get("cost_per_unit")) || 0,
      supplier_id: (formData.get("supplier_id") as string) || null,
    });

    if (result.success) {
      toast.success("Το υλικό προστέθηκε");
      setIsAddOpen(false);
      window.location.reload();
    } else {
      toast.error(result.error);
    }
  };

  const handleRecordWaste = async (formData: FormData) => {
    const result = await recordWaste({
      ingredient_id: formData.get("ingredient_id") as string,
      quantity: Number(formData.get("quantity")),
      reason: formData.get("reason") as "expired" | "damaged" | "overproduction" | "other",
      notes: (formData.get("notes") as string) || undefined,
    });

    if (result.success) {
      toast.success("Η φθορά καταγράφηκε");
      setIsWasteOpen(false);
      window.location.reload();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteIngredient(id);
      if (result.success) {
        setIngredients((prev) => prev.filter((i) => i.id !== id));
        toast.success("Το υλικό διαγράφηκε");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Tabs defaultValue="ingredients">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="ingredients">
            Υλικά ({ingredients.length})
          </TabsTrigger>
          <TabsTrigger value="low-stock">
            Χαμηλό Απόθεμα ({lowStock.length})
          </TabsTrigger>
          <TabsTrigger value="waste">
            Φθορές ({wasteLog.length})
          </TabsTrigger>
        </TabsList>

        <div className="flex gap-2">
          <Dialog open={isWasteOpen} onOpenChange={setIsWasteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <AlertTriangle className="mr-1 size-4" />
                Φθορά
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Καταγραφή Φθοράς</DialogTitle>
              </DialogHeader>
              <form action={handleRecordWaste} className="space-y-3">
                <div>
                  <Label>Υλικό</Label>
                  <Select name="ingredient_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Επιλέξτε..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.map((ing) => (
                        <SelectItem key={ing.id} value={ing.id}>
                          {ing.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Ποσότητα</Label>
                    <Input name="quantity" type="number" step="0.01" min="0.01" required />
                  </div>
                  <div>
                    <Label>Αιτία</Label>
                    <Select name="reason" required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expired">Ληγμένο</SelectItem>
                        <SelectItem value="damaged">Κατεστραμμένο</SelectItem>
                        <SelectItem value="overproduction">Υπερπαραγωγή</SelectItem>
                        <SelectItem value="other">Άλλο</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Σημειώσεις</Label>
                  <Input name="notes" />
                </div>
                <Button type="submit" className="w-full">Καταγραφή</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 size-4" />
                Υλικό
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Νέο Υλικό</DialogTitle>
              </DialogHeader>
              <form action={handleCreateIngredient} className="space-y-3">
                <div>
                  <Label>Όνομα *</Label>
                  <Input name="name" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Μονάδα</Label>
                    <Select name="unit" required>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Κιλά</SelectItem>
                        <SelectItem value="lt">Λίτρα</SelectItem>
                        <SelectItem value="pcs">Τεμάχια</SelectItem>
                        <SelectItem value="gr">Γραμμάρια</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Κατηγορία</Label>
                    <Select name="category" required>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Απόθεμα</Label>
                    <Input name="current_stock" type="number" step="0.01" defaultValue="0" />
                  </div>
                  <div>
                    <Label>Ελάχιστο</Label>
                    <Input name="min_stock" type="number" step="0.01" defaultValue="0" />
                  </div>
                  <div>
                    <Label>Κόστος/μ</Label>
                    <Input name="cost_per_unit" type="number" step="0.01" defaultValue="0" />
                  </div>
                </div>
                <div>
                  <Label>Προμηθευτής</Label>
                  <Select name="supplier_id">
                    <SelectTrigger><SelectValue placeholder="Κανένας" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">Δημιουργία</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <TabsContent value="ingredients" className="mt-4">
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium">Υλικό</th>
                <th className="p-3 text-left font-medium">Κατηγορία</th>
                <th className="p-3 text-right font-medium">Απόθεμα</th>
                <th className="p-3 text-right font-medium">Ελάχιστο</th>
                <th className="p-3 text-right font-medium">Κόστος/μ</th>
                <th className="p-3 text-left font-medium">Προμηθευτής</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing) => {
                const isLow = ing.current_stock <= ing.min_stock;
                return (
                  <tr key={ing.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{ing.name}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">
                        {categoryLabels[ing.category as IngredientCategory] ?? ing.category}
                      </Badge>
                    </td>
                    <td className={`p-3 text-right font-mono ${isLow ? "text-red-500 font-bold" : ""}`}>
                      {ing.current_stock} {unitLabels[ing.unit] ?? ing.unit}
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {ing.min_stock}
                    </td>
                    <td className="p-3 text-right font-mono">
                      €{ing.cost_per_unit.toFixed(2)}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {ing.suppliers?.name ?? "—"}
                    </td>
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive"
                        onClick={() => handleDelete(ing.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </TabsContent>

      <TabsContent value="low-stock" className="mt-4">
        {lowStock.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Όλα τα αποθέματα είναι επαρκή
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lowStock.map((ing) => (
              <Card key={ing.id} className="border-red-500/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{ing.name}</span>
                    <AlertTriangle className="size-4 text-red-500" />
                  </div>
                  <p className="text-sm text-red-500">
                    {ing.current_stock} / {ing.min_stock} {unitLabels[ing.unit] ?? ing.unit}
                  </p>
                  {ing.suppliers?.name && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Προμηθευτής: {ing.suppliers.name}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="waste" className="mt-4">
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium">Ημ/νία</th>
                <th className="p-3 text-left font-medium">Υλικό</th>
                <th className="p-3 text-right font-medium">Ποσότητα</th>
                <th className="p-3 text-left font-medium">Αιτία</th>
                <th className="p-3 text-left font-medium">Σημειώσεις</th>
              </tr>
            </thead>
            <tbody>
              {wasteLog.map((w) => (
                <tr key={w.id} className="border-b last:border-0">
                  <td className="p-3">{new Date(w.date).toLocaleDateString("el-GR")}</td>
                  <td className="p-3 font-medium">
                    {w.ingredients?.name ?? "—"}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {w.quantity} {w.ingredients?.unit ?? ""}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs">
                      {wasteReasonLabels[w.reason] ?? w.reason}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{w.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(pos)/inventory/page.tsx" components/pos/inventory-panel.tsx
git commit -m "feat: add inventory page with ingredients, stock alerts, and waste log"
```

---

## Task 11: Recipes Page

**Files:**
- Rewrite: `app/(pos)/recipes/page.tsx`
- Create: `components/pos/recipe-panel.tsx`

- [ ] **Step 1: Rewrite recipes page**

Replace `app/(pos)/recipes/page.tsx`:

```typescript
import { getRecipes } from "@/lib/queries/recipes";
import { getIngredients } from "@/lib/queries/ingredients";
import { getProducts } from "@/lib/queries/products";
import { RecipePanel } from "@/components/pos/recipe-panel";

export default async function RecipesPage() {
  const [recipes, ingredients, products] = await Promise.all([
    getRecipes(),
    getIngredients(),
    getProducts(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Συνταγές & Food Cost</h1>
        <p className="text-muted-foreground">
          {recipes.length} συνταγές από {products.length} προϊόντα
        </p>
      </div>
      <RecipePanel
        recipes={recipes}
        ingredients={ingredients}
        products={products}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create RecipePanel**

Create `components/pos/recipe-panel.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChefHat, TrendingUp, AlertCircle } from "lucide-react";
import type {
  RecipeWithIngredients,
  IngredientWithSupplier,
  DbProduct,
} from "@/lib/types/database";

interface RecipePanelProps {
  recipes: RecipeWithIngredients[];
  ingredients: IngredientWithSupplier[];
  products: DbProduct[];
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

export function RecipePanel({ recipes, ingredients, products }: RecipePanelProps) {
  const productsWithRecipe = new Set(recipes.map((r) => r.product_id));
  const productsWithoutRecipe = products.filter(
    (p) => !productsWithRecipe.has(p.id),
  );

  return (
    <div className="space-y-4">
      {productsWithoutRecipe.length > 0 && (
        <Card className="border-amber-500/50">
          <CardContent className="flex items-center gap-2 p-3 text-sm text-amber-600">
            <AlertCircle className="size-4" />
            {productsWithoutRecipe.length} προϊόντα χωρίς συνταγή
          </CardContent>
        </Card>
      )}

      {recipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ChefHat className="mb-4 size-12 opacity-30" />
            <p>Δεν υπάρχουν συνταγές ακόμα</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => {
            const foodCost = recipe.recipe_ingredients.reduce(
              (sum, ri) => {
                const ing = ri.ingredients;
                return sum + (ing?.cost_per_unit ?? 0) * ri.quantity;
              },
              0,
            );
            const price = recipe.products?.price ?? 0;
            const costPercent = price > 0 ? (foodCost / price) * 100 : 0;
            const isHighCost = costPercent > 35;

            return (
              <Card key={recipe.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {recipe.products?.name ?? "—"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Τιμή πώλησης</span>
                    <span className="font-medium">{formatPrice(price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Food cost</span>
                    <span className={`font-medium ${isHighCost ? "text-red-500" : "text-emerald-500"}`}>
                      {formatPrice(foodCost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ποσοστό</span>
                    <Badge variant={isHighCost ? "destructive" : "secondary"}>
                      <TrendingUp className="mr-1 size-3" />
                      {costPercent.toFixed(1)}%
                    </Badge>
                  </div>

                  {recipe.recipe_ingredients.length > 0 && (
                    <div className="border-t pt-2">
                      <p className="text-xs text-muted-foreground mb-1">Υλικά:</p>
                      {recipe.recipe_ingredients.map((ri) => (
                        <div key={ri.id} className="flex justify-between text-xs">
                          <span>{ri.ingredients?.name ?? "—"}</span>
                          <span className="text-muted-foreground">
                            {ri.quantity} {ri.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {recipe.prep_time && (
                    <p className="text-xs text-muted-foreground">
                      Χρόνος: {recipe.prep_time} λεπτά
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(pos)/recipes/page.tsx" components/pos/recipe-panel.tsx
git commit -m "feat: add recipes page with food cost calculation"
```

---

## Task 12: Build Verification

- [ ] **Step 1: Type check**

```bash
cd C:/Users/ntont/Desktop/MAURI/mauri_thalasa
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 2: Build check**

```bash
pnpm build
```

Expected: all routes compile successfully.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: Phase 3 Operations complete - customers, inventory, recipes, suppliers"
```

---

## Summary

After completing this plan:

| Module | Features |
|--------|----------|
| Customers | List, search, create, detail view, VIP/allergies/loyalty display |
| Inventory | Ingredients table, low stock alerts, waste log, add/delete |
| Recipes | Recipe list with food cost calculation, percentage indicator |
| Suppliers | Server actions ready (createSupplier, createSupplierOrder, updateOrderStatus) |

**Note:** Suppliers UI is not included as a separate page — supplier management is done through the Inventory page (supplier selection per ingredient). Supplier orders can be added as a future enhancement when needed.

**Next plan:** Phase 4 - Staff Management, Reservations, Loyalty
