# EatFlow Foundation - Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Supabase database, auth system, app shell with layout/sidebar, and deliver the first working module (Products/Menu) — proving the full stack works end-to-end.

**Architecture:** Next.js 16 App Router with Server Components (default) and Server Actions for mutations. Supabase for PostgreSQL, Auth, and Realtime. All existing shadcn/ui components and presentational POS components are reused as-is.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.7, Supabase (supabase-js v2), Tailwind CSS 4, shadcn/ui, Zod, Vitest

---

## File Structure

### New files to create:

```
lib/
├── supabase/
│   ├── client.ts              -- Browser Supabase client (singleton)
│   ├── server.ts              -- Server-side Supabase client (per-request)
│   └── middleware.ts           -- Auth middleware helper
├── actions/
│   ├── products.ts            -- Server Actions: CRUD products
│   └── categories.ts          -- Server Actions: CRUD categories
├── queries/
│   ├── products.ts            -- Data fetching: getProducts, getProductById
│   └── categories.ts          -- Data fetching: getCategories
├── validators/
│   └── products.ts            -- Zod schemas for product input
├── types/
│   └── database.ts            -- Supabase-generated types + app types
└── utils.ts                   -- formatPrice, formatDate, cn (move from existing)

app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx           -- PIN login page
│   └── layout.tsx             -- Minimal layout for auth pages
├── (pos)/
│   ├── layout.tsx             -- REWRITE: Supabase provider, auth check, sidebar
│   ├── page.tsx               -- Redirect to /tables
│   └── menu/
│       └── page.tsx           -- REWRITE: Server Component, real data
└── middleware.ts               -- Next.js middleware for auth redirects

components/
├── providers/
│   └── supabase-provider.tsx  -- Client-side Supabase context
└── pos/
    └── sidebar.tsx            -- MODIFY: minor nav updates

supabase/
└── migrations/
    ├── 018_audit_log.sql      -- NEW: audit_log table + triggers
    ├── 019_enhanced_fields.sql -- NEW: legacy_id, source, metadata on key tables
    └── 020_archive_schema.sql -- NEW: archive schema for SoftOne data
```

### Files to modify:

```
package.json                   -- Add: @supabase/supabase-js, @supabase/ssr, vitest
lib/types.ts                   -- Enhance with migration fields, new types
app/(pos)/layout.tsx           -- Replace POSProvider with Supabase provider
app/(pos)/menu/page.tsx        -- Replace mock data with Supabase queries
```

### Files unchanged (reused as-is):

```
components/ui/*                -- All 58 shadcn components
components/pos/menu-item.tsx   -- Presentational (remove mock-data import)
styles/globals.css             -- Theme
public/*                       -- Assets
tsconfig.json                  -- Config
postcss.config.mjs             -- Config
components.json                -- shadcn config
```

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Supabase and testing dependencies**

```bash
cd C:/Users/ntont/Desktop/MAURI/mauri_thalasa
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add -D vitest @vitejs/plugin-react supabase
```

- [ ] **Step 2: Create .env.local for Supabase credentials**

Create: `.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

- [ ] **Step 3: Add .env.local to .gitignore if not already there**

```bash
echo ".env.local" >> .gitignore
```

- [ ] **Step 4: Verify install works**

Run: `pnpm dev`
Expected: App starts without errors on localhost:3000

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml .gitignore
git commit -m "chore: add supabase and vitest dependencies"
```

---

## Task 2: Supabase Client Setup

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `app/middleware.ts`

- [ ] **Step 1: Create browser Supabase client**

Create `lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 2: Create server Supabase client**

Create `lib/supabase/server.ts`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3: Create middleware helper**

Create `lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login (except public routes)
  const isPublicRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/booking");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/tables";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

- [ ] **Step 4: Create Next.js middleware**

Create `app/middleware.ts`:
```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.*|apple-icon.*|manifest.json|placeholder.*).*)",
  ],
};
```

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/ app/middleware.ts
git commit -m "feat: add Supabase client setup and auth middleware"
```

---

## Task 3: Supabase Provider for Client Components

**Files:**
- Create: `components/providers/supabase-provider.tsx`

- [ ] **Step 1: Create Supabase provider**

Create `components/providers/supabase-provider.tsx`:
```typescript
"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

interface SupabaseContext {
  supabase: SupabaseClient;
}

const Context = createContext<SupabaseContext | undefined>(undefined);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());

  return (
    <Context.Provider value={{ supabase }}>
      {children}
    </Context.Provider>
  );
}

export function useSupabase() {
  const context = useContext(Context);
  if (!context) {
    throw new Error("useSupabase must be used within SupabaseProvider");
  }
  return context.supabase;
}
```

- [ ] **Step 2: Commit**

```bash
git add components/providers/
git commit -m "feat: add Supabase client provider for client components"
```

---

## Task 4: Enhanced Database Migrations

**Files:**
- Create: `supabase/migrations/018_audit_log.sql`
- Create: `supabase/migrations/019_enhanced_fields.sql`
- Create: `supabase/migrations/020_archive_schema.sql`

- [ ] **Step 1: Create audit log migration**

Create `supabase/migrations/018_audit_log.sql`:
```sql
-- ============================================================
-- Migration 018: Audit Log
-- EatFlow POS - Track every data change with who/what/when
-- ============================================================

CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID,
    staff_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_table_date ON audit_log(table_name, created_at DESC);
CREATE INDEX idx_audit_log_record ON audit_log(record_id);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log(table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'INSERT', to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log(table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log(table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id::TEXT, 'DELETE', to_jsonb(OLD), auth.uid());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to critical tables
CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_order_items AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_products AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_customers AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_ingredients AFTER INSERT OR UPDATE OR DELETE ON ingredients
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_tables AFTER INSERT OR UPDATE OR DELETE ON tables
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_staff AFTER INSERT OR UPDATE OR DELETE ON staff_members
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_reservations AFTER INSERT OR UPDATE OR DELETE ON reservations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- RLS: audit_log is read-only for authenticated, writable by triggers (SECURITY DEFINER)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT TO authenticated USING (true);
```

- [ ] **Step 2: Create enhanced fields migration**

Create `supabase/migrations/019_enhanced_fields.sql`:
```sql
-- ============================================================
-- Migration 019: Enhanced Fields for Migration Support
-- Adds legacy_id, source, metadata to key tables
-- ============================================================

-- Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_alt TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS legacy_id INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'eatflow';
ALTER TABLE products ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Make vat_rate flexible (not just 13/24)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_vat_rate_check;
ALTER TABLE products ALTER COLUMN vat_rate TYPE NUMERIC(5,2) USING vat_rate::NUMERIC(5,2);

-- Categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS legacy_id INTEGER;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'eatflow';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Customers (enhance existing)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS afm TEXT UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address JSONB DEFAULT '{}';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact JSONB DEFAULT '{}';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing JSONB DEFAULT '{}';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS discount NUMERIC(5,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS legacy_id INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'eatflow';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS afm TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address JSONB DEFAULT '{}';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS legacy_id INTEGER;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'eatflow';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Staff Members
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS legacy_id INTEGER;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'eatflow';
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Orders (Elorus integration fields)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff_members(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES staff_members(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS elorus_invoice_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fiscal_mark TEXT;

-- Tables
ALTER TABLE tables ADD COLUMN IF NOT EXISTS legacy_id INTEGER;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Zones
ALTER TABLE zones ADD COLUMN IF NOT EXISTS legacy_id INTEGER;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
```

- [ ] **Step 3: Create archive schema migration**

Create `supabase/migrations/020_archive_schema.sql`:
```sql
-- ============================================================
-- Migration 020: Archive Schema for SoftOne Historical Data
-- Read-only tables for historical reports
-- ============================================================

CREATE SCHEMA IF NOT EXISTS archive;

-- SoftOne POS sales (ESTSalesTrans: 111K records, 2013-2023)
CREATE TABLE archive.softone_est_sales (
    id INTEGER PRIMARY KEY,
    sale_date TIMESTAMPTZ,
    table_id INTEGER,
    customer_id INTEGER,
    salesman_id INTEGER,
    total NUMERIC(12,2),
    net NUMERIC(12,2),
    vat NUMERIC(12,2),
    paid NUMERIC(12,2),
    section_name TEXT,
    remarks TEXT,
    imported_at TIMESTAMPTZ DEFAULT now()
);

-- SoftOne POS product lines (ESTProductTrans: 1.1M records)
CREATE TABLE archive.softone_est_product_trans (
    id INTEGER PRIMARY KEY,
    sales_trans_id INTEGER,
    product_id INTEGER,
    product_name TEXT,
    quantity NUMERIC(12,4),
    unit_price NUMERIC(12,4),
    total_price NUMERIC(12,2),
    total_net NUMERIC(12,2),
    total_vat NUMERIC(12,2),
    remarks TEXT,
    imported_at TIMESTAMPTZ DEFAULT now()
);

-- SoftOne invoices (CustomerSalesTrans: 605K records)
CREATE TABLE archive.softone_invoices (
    id INTEGER PRIMARY KEY,
    invoice_date DATE,
    customer_id INTEGER,
    customer_name TEXT,
    para_type TEXT,
    total NUMERIC(12,2),
    net NUMERIC(12,2),
    vat NUMERIC(12,2),
    remarks TEXT,
    imported_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for reporting
CREATE INDEX idx_archive_sales_date ON archive.softone_est_sales(sale_date);
CREATE INDEX idx_archive_product_trans_sales ON archive.softone_est_product_trans(sales_trans_id);
CREATE INDEX idx_archive_invoices_date ON archive.softone_invoices(invoice_date);
CREATE INDEX idx_archive_invoices_customer ON archive.softone_invoices(customer_id);

-- Grant read-only access
GRANT USAGE ON SCHEMA archive TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA archive TO authenticated;
```

- [ ] **Step 4: Commit migrations**

```bash
git add supabase/migrations/018_audit_log.sql supabase/migrations/019_enhanced_fields.sql supabase/migrations/020_archive_schema.sql
git commit -m "feat(db): add audit log, migration fields, and archive schema"
```

---

## Task 5: Enhanced TypeScript Types

**Files:**
- Create: `lib/types/database.ts`
- Modify: `lib/types.ts`

- [ ] **Step 1: Create database types**

Create `lib/types/database.ts`:
```typescript
// Database row types (what Supabase returns)
// These map directly to the PostgreSQL schema

export interface DbProduct {
  id: string;
  code: string | null;
  name: string;
  name_alt: string | null;
  price: number;
  category_id: string;
  description: string | null;
  vat_rate: number;
  available: boolean;
  station: "hot" | "cold" | "bar" | "dessert";
  sort_order: number;
  cost_price: number | null;
  legacy_id: number | null;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbCategory {
  id: string;
  name: string;
  sort_order: number;
  legacy_id: number | null;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbStaffMember {
  id: string;
  name: string;
  role: "waiter" | "chef" | "barman" | "manager";
  pin: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  legacy_id: number | null;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbAuditLog {
  id: number;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_by: string | null;
  staff_name: string | null;
  created_at: string;
}

// Insert types (what we send to Supabase)
export interface InsertProduct {
  name: string;
  price: number;
  category_id: string;
  code?: string;
  name_alt?: string;
  description?: string;
  vat_rate?: number;
  available?: boolean;
  station?: "hot" | "cold" | "bar" | "dessert";
  sort_order?: number;
  cost_price?: number;
}

export interface UpdateProduct {
  name?: string;
  price?: number;
  category_id?: string;
  code?: string;
  name_alt?: string;
  description?: string;
  vat_rate?: number;
  available?: boolean;
  station?: "hot" | "cold" | "bar" | "dessert";
  sort_order?: number;
  cost_price?: number;
}

export interface InsertCategory {
  name: string;
  sort_order?: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types/
git commit -m "feat: add database types for Supabase schema"
```

---

## Task 6: Zod Validators

**Files:**
- Create: `lib/validators/products.ts`

- [ ] **Step 1: Create product validators**

Create `lib/validators/products.ts`:
```typescript
import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Το όνομα είναι υποχρεωτικό").max(200),
  price: z.number().min(0, "Η τιμή δεν μπορεί να είναι αρνητική"),
  category_id: z.string().uuid("Μη έγκυρη κατηγορία"),
  code: z.string().max(50).optional(),
  name_alt: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  vat_rate: z.number().min(0).max(100).default(24),
  available: z.boolean().default(true),
  station: z.enum(["hot", "cold", "bar", "dessert"]).default("hot"),
  sort_order: z.number().int().default(0),
  cost_price: z.number().min(0).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(1, "Το όνομα είναι υποχρεωτικό").max(100),
  sort_order: z.number().int().default(0),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
```

- [ ] **Step 2: Commit**

```bash
git add lib/validators/
git commit -m "feat: add Zod validators for product inputs"
```

---

## Task 7: Server Queries (Data Fetching)

**Files:**
- Create: `lib/queries/products.ts`
- Create: `lib/queries/categories.ts`

- [ ] **Step 1: Create product queries**

Create `lib/queries/products.ts`:
```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbProduct } from "@/lib/types/database";

export async function getProducts(): Promise<DbProduct[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  return data;
}

export async function getProductsByCategory(
  categoryId: string,
): Promise<DbProduct[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  return data;
}

export async function getProductById(
  id: string,
): Promise<DbProduct | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch product: ${error.message}`);
  }

  return data;
}
```

- [ ] **Step 2: Create category queries**

Create `lib/queries/categories.ts`:
```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbCategory } from "@/lib/types/database";

export async function getCategories(): Promise<DbCategory[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return data;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/queries/
git commit -m "feat: add server queries for products and categories"
```

---

## Task 8: Server Actions (Mutations)

**Files:**
- Create: `lib/actions/products.ts`
- Create: `lib/actions/categories.ts`

- [ ] **Step 1: Create product actions**

Create `lib/actions/products.ts`:
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/lib/validators/products";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createProduct(
  input: CreateProductInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: `Αποτυχία δημιουργίας: ${error.message}` };
  }

  revalidatePath("/menu");
  return { success: true, data: { id: data.id } };
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<ActionResult> {
  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("products")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { success: false, error: `Αποτυχία ενημέρωσης: ${error.message}` };
  }

  revalidatePath("/menu");
  return { success: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    return { success: false, error: `Αποτυχία διαγραφής: ${error.message}` };
  }

  revalidatePath("/menu");
  return { success: true };
}

export async function toggleProductAvailability(
  id: string,
  available: boolean,
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("products")
    .update({ available })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/menu");
  return { success: true };
}
```

- [ ] **Step 2: Create category actions**

Create `lib/actions/categories.ts`:
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createCategorySchema,
  type CreateCategoryInput,
} from "@/lib/validators/products";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("categories")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: `Αποτυχία δημιουργίας: ${error.message}` };
  }

  revalidatePath("/menu");
  return { success: true, data: { id: data.id } };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    if (error.message.includes("violates foreign key")) {
      return {
        success: false,
        error: "Η κατηγορία έχει προϊόντα. Μεταφέρετε τα προϊόντα πρώτα.",
      };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/menu");
  return { success: true };
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/actions/
git commit -m "feat: add server actions for product and category mutations"
```

---

## Task 9: Auth - PIN Login Page

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/layout.tsx`

- [ ] **Step 1: Create auth layout**

Create `app/(auth)/layout.tsx`:
```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create PIN login page**

Create `app/(auth)/login/page.tsx`:
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
    }
  };

  const handleClear = () => setPin("");

  const handleBackspace = () => setPin((prev) => prev.slice(0, -1));

  const handleSubmit = async () => {
    if (pin.length !== 4) return;
    setLoading(true);

    try {
      // Look up staff member by PIN
      const { data: staff, error: lookupError } = await supabase
        .from("staff_members")
        .select("id, name, role, pin")
        .eq("is_active", true);

      if (lookupError) {
        toast.error("Σφάλμα σύνδεσης");
        setPin("");
        setLoading(false);
        return;
      }

      const member = staff?.find((s) => s.pin === pin);

      if (!member) {
        toast.error("Λάθος PIN");
        setPin("");
        setLoading(false);
        return;
      }

      // Sign in with email/password using PIN as password
      // Staff accounts use: {staff_id}@eatflow.local / {pin}
      const email = `${member.id}@eatflow.local`;

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: pin,
      });

      if (signInError) {
        // First time: create the account
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password: pin,
          options: {
            data: {
              staff_id: member.id,
              staff_name: member.name,
              role: member.role,
            },
          },
        });

        if (signUpError) {
          toast.error("Σφάλμα δημιουργίας λογαριασμού");
          setPin("");
          setLoading(false);
          return;
        }
      }

      toast.success(`Καλώς ήρθες, ${member.name}!`);
      router.push("/tables");
      router.refresh();
    } catch {
      toast.error("Σφάλμα σύνδεσης");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when 4 digits entered
  if (pin.length === 4 && !loading) {
    handleSubmit();
  }

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", ""];

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">EatFlow POS</CardTitle>
        <p className="text-sm text-muted-foreground">
          Εισάγετε το PIN σας
        </p>
      </CardHeader>
      <CardContent>
        {/* PIN display */}
        <div className="mb-6 flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-4 w-4 rounded-full border-2 transition-colors ${
                i < pin.length
                  ? "border-primary bg-primary"
                  : "border-muted-foreground"
              }`}
            />
          ))}
        </div>

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-2">
          {digits.map((digit, i) => {
            if (digit === "" && i === 9) {
              return (
                <Button
                  key="clear"
                  variant="ghost"
                  className="h-14 text-lg"
                  onClick={handleClear}
                  disabled={loading}
                >
                  C
                </Button>
              );
            }
            if (digit === "" && i === 11) {
              return (
                <Button
                  key="back"
                  variant="ghost"
                  className="h-14 text-lg"
                  onClick={handleBackspace}
                  disabled={loading}
                >
                  ←
                </Button>
              );
            }
            return (
              <Button
                key={digit}
                variant="outline"
                className="h-14 text-xl font-semibold"
                onClick={() => handlePinDigit(digit)}
                disabled={loading}
              >
                {digit}
              </Button>
            );
          })}
        </div>

        {loading && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Σύνδεση...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/
git commit -m "feat: add PIN login page with number pad UI"
```

---

## Task 10: Rewrite POS Layout

**Files:**
- Modify: `app/(pos)/layout.tsx`

- [ ] **Step 1: Rewrite POS layout with Supabase provider**

Replace the contents of `app/(pos)/layout.tsx`:
```typescript
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { POSSidebar } from "@/components/pos/sidebar";
import { Separator } from "@/components/ui/separator";
import { StaffHeader } from "@/components/pos/staff-header";
import { SupabaseProvider } from "@/components/providers/supabase-provider";
import { Toaster } from "@/components/ui/sonner";
import { CurrentTime } from "@/components/pos/current-time";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <SupabaseProvider>
      <SidebarProvider defaultOpen={true}>
        <POSSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="h-6" />
            </div>
            <div className="flex items-center gap-3">
              <CurrentTime />
              <Separator orientation="vertical" className="h-6" />
              <StaffHeader />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster position="top-right" richColors />
    </SupabaseProvider>
  );
}
```

- [ ] **Step 2: Extract CurrentTime to its own component**

Create `components/pos/current-time.tsx`:
```typescript
"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function CurrentTime() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("el-GR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
      setDate(
        now.toLocaleDateString("el-GR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock className="size-4" />
      <span className="font-medium text-foreground">{time}</span>
      <span className="hidden sm:inline">&bull;</span>
      <span className="hidden sm:inline">{date}</span>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(pos\)/layout.tsx components/pos/current-time.tsx
git commit -m "feat: rewrite POS layout with Supabase auth and providers"
```

---

## Task 11: Menu Page - First Working Module

**Files:**
- Modify: `app/(pos)/menu/page.tsx`
- Create: `components/pos/menu-list.tsx`

- [ ] **Step 1: Rewrite menu page as Server Component**

Replace `app/(pos)/menu/page.tsx`:
```typescript
import { getProducts } from "@/lib/queries/products";
import { getCategories } from "@/lib/queries/categories";
import { MenuList } from "@/components/pos/menu-list";

export default async function MenuPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Μενού</h1>
          <p className="text-muted-foreground">
            {products.length} προϊόντα σε {categories.length} κατηγορίες
          </p>
        </div>
      </div>
      <MenuList
        initialProducts={products}
        initialCategories={categories}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create MenuList client component**

Create `components/pos/menu-list.tsx`:
```typescript
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toggleProductAvailability } from "@/lib/actions/products";
import { toast } from "sonner";
import type { DbProduct, DbCategory } from "@/lib/types/database";

interface MenuListProps {
  initialProducts: DbProduct[];
  initialCategories: DbCategory[];
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

const stationLabels: Record<string, string> = {
  hot: "Κουζίνα",
  cold: "Κρύα",
  bar: "Μπαρ",
  dessert: "Γλυκά",
};

export function MenuList({
  initialProducts,
  initialCategories,
}: MenuListProps) {
  const [products, setProducts] = useState(initialProducts);
  const categories = initialCategories;

  const handleToggleAvailable = async (product: DbProduct) => {
    // Optimistic update
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, available: !p.available } : p,
      ),
    );

    const result = await toggleProductAvailability(
      product.id,
      !product.available,
    );

    if (!result.success) {
      // Revert on error
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, available: product.available } : p,
        ),
      );
      toast.error(result.error);
    }
  };

  const allCategoryId = "all";

  return (
    <Tabs defaultValue={allCategoryId}>
      <TabsList className="flex-wrap">
        <TabsTrigger value={allCategoryId}>
          Όλα ({products.length})
        </TabsTrigger>
        {categories.map((cat) => {
          const count = products.filter(
            (p) => p.category_id === cat.id,
          ).length;
          return (
            <TabsTrigger key={cat.id} value={cat.id}>
              {cat.name} ({count})
            </TabsTrigger>
          );
        })}
      </TabsList>

      <TabsContent value={allCategoryId} className="mt-4">
        <ProductGrid
          products={products}
          onToggleAvailable={handleToggleAvailable}
        />
      </TabsContent>

      {categories.map((cat) => (
        <TabsContent key={cat.id} value={cat.id} className="mt-4">
          <ProductGrid
            products={products.filter((p) => p.category_id === cat.id)}
            onToggleAvailable={handleToggleAvailable}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function ProductGrid({
  products,
  onToggleAvailable,
}: {
  products: DbProduct[];
  onToggleAvailable: (product: DbProduct) => void;
}) {
  if (products.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        Δεν βρέθηκαν προϊόντα
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <Card
          key={product.id}
          className={!product.available ? "opacity-50" : undefined}
        >
          <CardContent className="flex items-start justify-between p-4">
            <div className="space-y-1">
              <p className="font-medium leading-tight">{product.name}</p>
              {product.code && (
                <p className="text-xs text-muted-foreground">{product.code}</p>
              )}
              <p className="text-lg font-bold text-primary">
                {formatPrice(product.price)}
              </p>
              <div className="flex gap-1">
                <Badge variant="secondary" className="text-xs">
                  {stationLabels[product.station] ?? product.station}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  ΦΠΑ {product.vat_rate}%
                </Badge>
              </div>
            </div>
            <Switch
              checked={product.available}
              onCheckedChange={() => onToggleAvailable(product)}
              aria-label={`${product.name} διαθεσιμότητα`}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(pos\)/menu/page.tsx components/pos/menu-list.tsx
git commit -m "feat: rewrite menu page with Supabase data and server components"
```

---

## Task 12: Verify Full Stack Works

- [ ] **Step 1: Create Supabase project (if not exists)**

Go to https://supabase.com, create a new project, copy URL and anon key to `.env.local`.

- [ ] **Step 2: Run all migrations**

```bash
cd C:/Users/ntont/Desktop/MAURI/mauri_thalasa
npx supabase db push
```

Or manually paste each migration SQL file in Supabase SQL Editor (Dashboard → SQL Editor).

- [ ] **Step 3: Insert seed data**

Run `supabase/migrations/017_seed_data.sql` in Supabase SQL Editor.

- [ ] **Step 4: Start dev server and verify**

```bash
pnpm dev
```

Open `http://localhost:3000`:
- Should redirect to `/login`
- Enter staff PIN → should redirect to POS
- Navigate to `/menu` → should show products from Supabase
- Toggle product availability → should update in database

- [ ] **Step 5: Verify audit log**

In Supabase SQL Editor:
```sql
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 5;
```

Should see entries for any product toggles.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: foundation complete - Supabase, auth, menu module working"
```

---

## Summary

After completing this plan, we have:

| Component | Status |
|-----------|--------|
| Supabase client (browser + server) | Working |
| Auth middleware (redirect unauthenticated) | Working |
| PIN login page | Working |
| POS layout with Supabase provider | Working |
| Database: 20 migrations (original 17 + audit + enhanced + archive) | Deployed |
| Audit logging (automatic triggers) | Working |
| Product queries (server-side) | Working |
| Product mutations (server actions + Zod) | Working |
| Menu page (Server Component + Client interactivity) | Working |
| Type safety (database types + validators) | Working |

**Next plan:** Plan 2 - Core POS (Tables, Orders, Kitchen, Checkout, Realtime)
