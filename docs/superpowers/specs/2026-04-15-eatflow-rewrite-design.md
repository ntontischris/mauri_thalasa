# EatFlow POS - Production Rewrite Design Spec

**Date:** 2026-04-15
**Client:** Mavri Thalassa (Kalamaria, Thessaloniki)
**Type:** Seafood Restaurant + Bar, 101 tables, €10-14M/year revenue
**Stack:** Next.js 16 + Supabase + TypeScript
**Replaces:** SoftOne ERP + proXess POS

---

## 1. PROJECT OVERVIEW

### 1.1 What We're Building

A production-ready restaurant operations system that replaces SoftOne ERP.
The system must handle concurrent users (5+ waiters, kitchen, manager) during peak hours (40+ occupied tables) without any downtime.

### 1.2 What We're NOT Building

- Invoicing / AADE integration (handled by Elorus)
- Accounting / General Ledger (handled by external accountant)
- HR / Payroll (out of scope)

### 1.3 Core Principles

1. **Offline-first**: Works without internet. Always.
2. **Audit everything**: Every action is logged with who/what/when.
3. **Concurrent-safe**: Multiple users, same time, no conflicts.
4. **Data integrity**: Database constraints, not just app validation.
5. **Zero data loss**: Auto-save, transactions, backups.

---

## 2. REUSABLE ASSETS FROM EXISTING CODEBASE

### 2.1 Keep As-Is (0 changes needed)

| Asset | Files | Notes |
|-------|-------|-------|
| shadcn/ui components | 58 files | Button, Dialog, Card, Table, etc. |
| Theme / globals.css | 2 files | Dark-first, OKLch colors, CSS vars |
| components.json | 1 file | shadcn config |
| public/ assets | icons, manifest | PWA ready |
| package.json deps | All Radix, Recharts, etc. | Keep all UI deps |

### 2.2 Keep with Minor Changes

| Asset | Files | Changes Needed |
|-------|-------|----------------|
| lib/types.ts | 1 file | Add legacy_id, source, metadata fields; adjust to match new schema |
| 22 presentational POS components | 22 files | Remove mock-data imports, accept data via props |
| SQL migrations (001-017) | 17 files | Enhance: add audit_log, metadata JSONB, archive schema |

**Reusable POS components (purely presentational):**
- customer-form, customer-allergies, ingredient-form
- pin-login, sidebar, staff-form, staff-header, staff-list, staff-checklist, staff-performance
- table-card, table-shape, table-transfer-dialog
- supplier-list, supplier-order-form
- stock-alert-badge, waitlist-panel, waste-form, waste-log
- zone-manager, course-separator, loyalty-settings

### 2.3 Rewrite Completely

| Asset | Files | Reason |
|-------|-------|--------|
| lib/pos-context.tsx | 1 file (1,287 lines) | Replace localStorage with Supabase |
| lib/mock-data.ts | 1 file (2,740 lines) | Replace with real data |
| 16 hooks | 16 files | Rewrite for Supabase queries + real-time |
| 31 POS feature components | 31 files | Depend on POSContext/mock-data |
| All page files | 18 files | Server Components + proper data fetching |
| app/(pos)/layout.tsx | 1 file | New auth + Supabase provider |

---

## 3. DATABASE ARCHITECTURE

### 3.1 Schema Overview

```
Supabase Project
├── public schema (production data)
│   ├── Core: zones, categories, products, modifiers, tables
│   ├── Orders: orders, order_items, order_item_modifiers
│   ├── Inventory: ingredients, recipes, recipe_ingredients, waste_log
│   ├── Suppliers: suppliers, supplier_orders, supplier_order_items
│   ├── CRM: customers, customer_visits, loyalty_settings
│   ├── Staff: staff_members, shifts, checklist_items, staff_performance
│   ├── Reservations: reservations, waitlist, booking_settings
│   ├── Campaigns: campaigns, message_templates, notification_log
│   ├── AI: chat_messages, ai_settings, daily_summaries
│   ├── System: audit_log, app_settings
│   └── Auth: Supabase Auth (built-in)
│
└── archive schema (read-only historical data)
    ├── archive.softone_customers
    ├── archive.softone_products
    ├── archive.softone_sales
    ├── archive.softone_product_trans
    └── archive.softone_est_sales
```

### 3.2 Key Schema Enhancements (vs existing migrations)

#### Audit Log (NEW - auto-triggered on every table)

```sql
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES auth.users(id),
    staff_member_id UUID REFERENCES staff_members(id),
    staff_name TEXT,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_table ON audit_log(table_name, created_at DESC);
CREATE INDEX idx_audit_log_record ON audit_log(record_id);
CREATE INDEX idx_audit_log_staff ON audit_log(staff_member_id);
```

#### Metadata JSONB on Key Tables (NEW)

Every main entity gets:
```sql
legacy_id INT,                    -- SoftOne ID for migration mapping
source TEXT DEFAULT 'eatflow',    -- 'softone' | 'eatflow'
metadata JSONB DEFAULT '{}',      -- client-specific flexible data
```

#### Optimistic Locking (NEW)

Every mutable table uses `updated_at` for conflict detection:
```sql
-- Server action checks version before update
UPDATE orders 
SET status = 'completed', updated_at = now()
WHERE id = $1 AND updated_at = $2
RETURNING *;
-- 0 rows = someone else changed it = retry
```

### 3.3 Enhanced Customers Table

```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    afm TEXT UNIQUE,
    phone TEXT,
    email TEXT,
    address JSONB DEFAULT '{}',
    -- { street, city, zip, area, country }
    contact JSONB DEFAULT '{}',
    -- { phone2, mobile, fax }
    billing JSONB DEFAULT '{}',
    -- { doy, vat_status, payment_method }
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    is_vip BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    allergies TEXT[] DEFAULT '{}',
    loyalty_points INTEGER DEFAULT 0,
    stamp_count INTEGER DEFAULT 0,
    discount NUMERIC(5,2) DEFAULT 0,
    birthday DATE,
    
    -- Migration fields
    legacy_id INTEGER,
    source TEXT DEFAULT 'eatflow',
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.4 Enhanced Products Table

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT,                                  -- SoftOne product code
    name TEXT NOT NULL,
    name_alt TEXT,                              -- alternative name
    price NUMERIC(10,2) NOT NULL,
    category_id UUID REFERENCES categories(id),
    description TEXT,
    vat_rate NUMERIC(5,2) NOT NULL DEFAULT 24,  -- flexible, not just 13/24
    available BOOLEAN DEFAULT true,
    station station_type NOT NULL DEFAULT 'hot',
    sort_order INTEGER DEFAULT 0,
    
    -- Pricing
    price_wholesale NUMERIC(10,2),              -- for supplier/wholesale
    cost_price NUMERIC(10,2),                   -- for food cost calculation
    
    -- Migration fields
    legacy_id INTEGER,
    source TEXT DEFAULT 'eatflow',
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.5 Enhanced Orders Table (Concurrency-Safe)

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID REFERENCES tables(id),
    table_number INTEGER NOT NULL,
    status order_status NOT NULL DEFAULT 'active',
    payment_method payment_method,
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    vat_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    active_course INTEGER DEFAULT 1,
    is_rush BOOLEAN DEFAULT false,
    notes TEXT,
    
    -- Staff tracking
    created_by UUID REFERENCES staff_members(id),
    completed_by UUID REFERENCES staff_members(id),
    
    -- Customer link (optional)
    customer_id UUID REFERENCES customers(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    
    -- Elorus integration
    elorus_invoice_id TEXT,
    fiscal_mark TEXT
);
```

---

## 4. APPLICATION ARCHITECTURE

### 4.1 Data Flow

```
CLIENT (Tablet/Browser)
│
├── Online Mode:
│   Component → Server Action → Supabase → Realtime → All Clients
│
├── Offline Mode:
│   Component → IndexedDB (local queue) → [when online] → Supabase
│
└── Hybrid (default):
    Component → Server Action → Supabase
                              → IndexedDB (cache)
    Supabase Realtime → Update local cache → Re-render
```

### 4.2 Directory Structure (New)

```
app/
├── (auth)/
│   ├── login/page.tsx              -- PIN login
│   └── layout.tsx                  -- Auth check
├── (pos)/
│   ├── layout.tsx                  -- Sidebar, Supabase provider, Realtime
│   ├── page.tsx                    -- Redirect to /tables
│   ├── tables/page.tsx             -- Floor plan (Server Component)
│   ├── orders/
│   │   ├── page.tsx                -- Order list
│   │   └── [tableId]/page.tsx      -- Table order
│   ├── kitchen/page.tsx            -- KDS (Realtime subscription)
│   ├── checkout/[tableId]/page.tsx -- Payment
│   ├── menu/page.tsx               -- Product management
│   ├── inventory/page.tsx          -- Ingredients + suppliers
│   ├── recipes/page.tsx            -- Recipes + food cost
│   ├── customers/page.tsx          -- CRM
│   ├── loyalty/page.tsx            -- Loyalty program
│   ├── reservations/page.tsx       -- Reservations + waitlist
│   ├── staff/page.tsx              -- Staff management
│   ├── reports/page.tsx            -- Analytics
│   ├── ai/page.tsx                 -- AI assistant
│   ├── campaigns/page.tsx          -- SMS/Email
│   └── settings/page.tsx           -- Configuration
├── booking/page.tsx                -- Public booking (no auth)
├── layout.tsx                      -- Root layout
└── globals.css

lib/
├── supabase/
│   ├── client.ts                   -- Browser Supabase client
│   ├── server.ts                   -- Server Supabase client
│   ├── middleware.ts               -- Auth middleware
│   └── realtime.ts                 -- Realtime subscription helpers
├── actions/                        -- Server Actions (mutations)
│   ├── orders.ts                   -- createOrder, addItem, completeOrder
│   ├── tables.ts                   -- updateTableStatus, transferTable
│   ├── products.ts                 -- CRUD products
│   ├── customers.ts                -- CRUD customers
│   ├── inventory.ts                -- updateStock, recordWaste
│   ├── staff.ts                    -- CRUD staff, clockIn/Out
│   ├── reservations.ts             -- CRUD reservations
│   └── kitchen.ts                  -- updateItemStatus
├── queries/                        -- Data fetching (reads)
│   ├── orders.ts                   -- getOrders, getOrdersByTable
│   ├── products.ts                 -- getProducts, getByCategory
│   ├── customers.ts                -- getCustomers, search
│   ├── analytics.ts                -- getDailySummary, getTopProducts
│   └── ...
├── hooks/                          -- Client-side hooks
│   ├── use-realtime-orders.ts      -- Subscribe to order changes
│   ├── use-realtime-tables.ts      -- Subscribe to table status
│   ├── use-realtime-kitchen.ts     -- Subscribe to kitchen items
│   ├── use-offline-queue.ts        -- Offline mutation queue
│   ├── use-optimistic.ts           -- Optimistic updates helper
│   └── use-auth.ts                 -- Current staff member
├── types.ts                        -- TypeScript types (enhanced)
├── validators.ts                   -- Zod schemas for all inputs
├── utils.ts                        -- Formatting, helpers
└── offline/
    ├── db.ts                       -- IndexedDB setup (Dexie)
    ├── sync.ts                     -- Sync queue logic
    └── cache.ts                    -- Cache management

components/
├── ui/                             -- shadcn/ui (58 files, unchanged)
├── pos/                            -- POS components (reused + rewritten)
├── providers/
│   ├── supabase-provider.tsx       -- Supabase client context
│   ├── auth-provider.tsx           -- Auth state
│   ├── realtime-provider.tsx       -- Realtime subscriptions
│   └── offline-provider.tsx        -- Offline state + sync
└── layouts/
    ├── pos-layout.tsx              -- Main POS layout with sidebar
    └── public-layout.tsx           -- Public pages (booking)

supabase/
└── migrations/
    ├── 001_enums.sql               -- Enhanced enums
    ├── 002_core_tables.sql         -- Zones, categories, modifiers, tables
    ├── 003_products.sql            -- Products + product_modifiers
    ├── 004_orders.sql              -- Orders + items + item_modifiers
    ├── 005_inventory.sql           -- Ingredients, recipes, waste
    ├── 006_suppliers.sql           -- Suppliers + orders
    ├── 007_customers.sql           -- CRM + visits + loyalty
    ├── 008_staff.sql               -- Staff + shifts + checklists
    ├── 009_reservations.sql        -- Reservations + waitlist + booking
    ├── 010_campaigns.sql           -- Campaigns + templates + notifications
    ├── 011_ai.sql                  -- Chat + settings + daily summaries
    ├── 012_audit.sql               -- NEW: audit_log + triggers
    ├── 013_archive.sql             -- NEW: archive schema for SoftOne data
    ├── 014_rls_policies.sql        -- Row Level Security
    ├── 015_indexes.sql             -- Performance indexes
    ├── 016_functions.sql           -- Database functions
    └── 017_seed_data.sql           -- Initial data
```

### 4.3 Auth & Roles

```
Supabase Auth + staff_members table:

PIN Login Flow:
1. Staff enters 4-digit PIN
2. Server Action: lookup staff_members WHERE pin = hash($pin)
3. Set Supabase auth session with custom claims: { role, staff_id, name }
4. RLS policies use auth.jwt() -> role for access control

Roles & Permissions:
┌──────────┬────────┬─────────┬──────────┬─────────┬──────────┐
│ Action   │ Waiter │ Chef    │ Barman   │ Manager │ Admin    │
├──────────┼────────┼─────────┼──────────┼─────────┼──────────┤
│ Orders   │ CRUD   │ Read    │ Read     │ CRUD    │ CRUD     │
│ Kitchen  │ Read   │ Update  │ Update   │ CRUD    │ CRUD     │
│ Menu     │ Read   │ Read    │ Read     │ CRUD    │ CRUD     │
│ Inventory│ --     │ Read    │ Read     │ CRUD    │ CRUD     │
│ Staff    │ --     │ --      │ --       │ CRUD    │ CRUD     │
│ Reports  │ --     │ --      │ --       │ Read    │ CRUD     │
│ Settings │ --     │ --      │ --       │ Read    │ CRUD     │
│ Customers│ Read   │ --      │ --       │ CRUD    │ CRUD     │
│ Checkout │ Create │ --      │ --       │ CRUD    │ CRUD     │
└──────────┴────────┴─────────┴──────────┴─────────┴──────────┘
```

### 4.4 Real-time Architecture

```
Supabase Realtime Channels:

Channel: "tables"
├── Subscribe: All POS clients
├── Events: table status changes
└── Use: Floor plan updates instantly for all waiters

Channel: "orders:{tableId}"
├── Subscribe: Waiter serving that table + Kitchen + Bar
├── Events: new items, status changes, course updates
└── Use: Kitchen sees new orders immediately

Channel: "kitchen"
├── Subscribe: Kitchen display, Bar display
├── Events: order items with status 'pending' or 'preparing'
└── Use: KDS auto-refreshes, no polling

Channel: "notifications"
├── Subscribe: All staff
├── Events: stock alerts, reservation reminders, rush orders
└── Use: Toast notifications on all terminals
```

### 4.5 Offline-First Strategy

```
Technology: Dexie.js (IndexedDB wrapper)

What's cached locally:
├── products (full catalog)          -- changes rarely
├── categories                       -- changes rarely
├── tables + zones                   -- changes rarely
├── current active orders            -- changes frequently
├── staff members                    -- changes rarely
└── modifiers                        -- changes rarely

Offline mutation queue:
├── Each mutation → stored in IndexedDB queue
├── Queue processes when online
├── Conflicts: server timestamp wins, user notified
├── Critical path: order creation works 100% offline

Sync strategy:
├── Online → real-time sync via Supabase Realtime
├── Offline → queue mutations, serve from cache
├── Reconnect → flush queue, pull latest state, reconcile
```

---

## 5. MODULES

### 5.1 Tables & Floor Plan
- Server Component loads tables + zones from Supabase
- Realtime subscription for status changes
- Drag-and-drop editor (manager only) using @dnd-kit
- Table statuses: available → occupied → bill-requested → dirty → available

### 5.2 Orders (Critical Path)
- Create order → DB transaction: INSERT order + UPDATE table status
- Add items → auto-save each item immediately (no "save" button)
- Send to kitchen → UPDATE item status to 'preparing'
- Course management → items grouped by course number
- Rush orders → flagged, prioritized in kitchen display
- Cancel/modify → audit logged, stock adjusted

### 5.3 Kitchen Display (KDS)
- Realtime subscription to order_items WHERE status IN ('pending', 'preparing')
- Grouped by station (hot, cold, bar, dessert)
- Color-coded by wait time (green → yellow → red)
- Touch to update status: pending → preparing → ready
- Ready notification sent to waiter's device

### 5.4 Checkout & Payment
- Calculate totals server-side (DB function)
- Payment methods: cash, card
- Split bill support
- Receipt preview (reusable component)
- Elorus API call for fiscal receipt (queued if Elorus down)
- Complete → DB transaction: UPDATE order, UPDATE table, INSERT daily_summary

### 5.5 Inventory & Recipes
- Ingredients with stock levels and min-stock alerts
- Recipes linked to products with ingredient quantities
- Food cost calculation: SUM(ingredient.cost * recipe.quantity)
- Waste tracking with reason codes
- Stock alert badge on sidebar (realtime)

### 5.6 CRM & Loyalty
- Customer database with search (name, phone, AFM)
- Visit history linked to orders
- Points system: configurable points-per-euro
- Stamp card: configurable stamps-for-free-item
- VIP flagging and discount management

### 5.7 Reservations
- Calendar view with timeline
- Smart table suggestion based on party size + availability
- Status flow: pending → confirmed → seated → completed
- Waitlist with estimated wait times
- Public booking page (no auth required)

### 5.8 Staff Management
- PIN-based authentication
- Shift scheduling (morning/afternoon/off)
- Clock in/out tracking
- Performance metrics from order data
- Opening/closing checklists

### 5.9 Reports & Analytics
- Daily summary: revenue, orders, avg check, payment split
- Top products by quantity and revenue
- Hourly revenue distribution
- Food cost analysis
- Staff performance comparison
- Kitchen performance (avg preparation time)
- Customer analytics (frequency, spending)
- All reports: date range filter, export to CSV

### 5.10 AI Features
- Chat interface with OpenAI
- Demand forecasting (predict quantities needed)
- Menu optimization suggestions
- Configurable: API key in settings, enable/disable

---

## 6. DATA MIGRATION STRATEGY

### 6.1 Approach C: Staged Migration

```
Phase 1 (NOW): Build EatFlow with clean schema, test data only
Phase 2 (WHEN READY): Get fresh .bak from client
Phase 3: Import to staging → validate → client confirms
Phase 4: Import to production, parallel run with SoftOne
Phase 5: SoftOne shutdown after 2 weeks parallel
```

### 6.2 Migration Mapping

```
SoftOne Table          → EatFlow Table
─────────────────────────────────────────
Products               → products (legacy_id = SoftOne.ID)
ProductCategory1/2     → categories
Customers              → customers (legacy_id = SoftOne.ID)
Suppliers              → suppliers
FoodTables             → tables
FoodAreas              → zones
ESTSections            → (config)
SalesMen               → staff_members
PayModes               → (enum)
FPATypes               → (vat_rate field)
DOY                    → (customers.billing.doy)
ESTSalesTrans          → archive.softone_est_sales (read-only)
ESTProductTrans        → archive.softone_est_product_trans (read-only)
CustomerSalesTrans     → archive.softone_sales (read-only)
ProductTrans           → archive.softone_product_trans (read-only)
```

### 6.3 Validation Protocol

For every migrated table:
1. COUNT source = COUNT destination
2. SUM(amounts) source = SUM(amounts) destination
3. Client spot-checks 10 random records
4. All validated before go-live

---

## 7. RELIABILITY & MONITORING

### 7.1 Error Handling

```
Every Server Action:
1. Zod validation on input
2. Auth check (role permission)
3. Try database operation in transaction
4. If error → rollback, log to error_log, return typed error
5. If success → return data, audit_log auto-triggered

Every Client Component:
1. Error boundary catches render errors
2. Toast notification for user-facing errors
3. Retry logic for transient network errors
4. Graceful degradation (show cached data if query fails)
```

### 7.2 Monitoring

```
Built-in:
├── Supabase Dashboard (queries, connections, storage)
├── Vercel Analytics (page loads, web vitals)
└── audit_log table (query for anomalies)

Custom:
├── Daily summary auto-generated (cron or edge function)
├── Stock alert notifications
├── Error rate tracking (error_log table)
└── Uptime check (simple ping endpoint)
```

### 7.3 Backup Strategy

```
Supabase Pro plan:
├── Point-in-time recovery (30 days)
├── Daily automatic backups

Additional:
├── Weekly CSV export of critical tables (automated)
├── audit_log retention: 1 year, then archive
├── Monthly full backup to external storage
```

---

## 8. TESTING STRATEGY

### 8.1 What We Test

```
Unit Tests (Vitest):
├── Validators (Zod schemas)
├── Utility functions (formatPrice, date helpers)
├── Database functions (calculations)
└── Migration scripts (data transformation)

Integration Tests:
├── Server Actions (create order → verify DB state)
├── Auth flow (PIN login → role check → access)
├── Realtime (change → subscription fires)
└── Offline queue (queue → reconnect → sync)

E2E Tests (Playwright):
├── Full order flow: table → order → kitchen → checkout
├── Multi-user scenario: 2 waiters, same time
├── Offline: disconnect → take order → reconnect → synced
└── Payment: complete order → receipt generated
```

---

## 9. DEPLOYMENT

### 9.1 Environments

```
Development:  localhost + Supabase local (supabase start)
Staging:      Vercel Preview + Supabase staging project
Production:   Vercel + Supabase production project
```

### 9.2 CI/CD

```
Push to main:
├── Run type check (tsc --noEmit)
├── Run linter (eslint)
├── Run unit tests (vitest)
├── Build (next build)
├── Deploy to Vercel
└── Run smoke tests against staging
```

---

## 10. TIMELINE

### Week 1: Foundation
- Supabase project setup + enhanced migrations
- Auth system (PIN login + roles + RLS)
- Layout, sidebar, theme (reuse existing)
- Products/Menu module (first working feature)
- Data migration scripts (prepared, not run)

### Week 2-3: Core POS
- Tables + Floor Plan (realtime)
- Orders (create, modify, courses, auto-save)
- Kitchen Display (realtime, stations)
- Checkout + Payment
- Offline foundation (IndexedDB, sync queue)

### Week 4: Operations
- Inventory + Stock alerts
- Recipes + Food cost
- Suppliers
- Customers / CRM

### Week 5: Advanced
- Reservations + Waitlist + Public booking
- Staff management + Scheduling
- Loyalty program

### Week 6: Intelligence
- Reports / Analytics (real data)
- AI features (OpenAI)
- Campaigns (SMS/Email)

### Week 7: Integration & Polish
- Elorus API integration
- Printer support
- Full offline testing
- Multi-user stress testing

### Week 8: Go-Live
- Data migration (fresh .bak from client)
- Client training (3 sessions)
- Parallel run with SoftOne
- Bug fixes
- Sign-off

---

## 11. EXTERNAL INTEGRATIONS

### 11.1 Elorus (Invoicing / AADE)
- API integration for receipt generation
- Queue system: if Elorus API down → store locally → retry
- Fiscal MARK number stored on order record
- Daily reconciliation check

### 11.2 Printers (Future)
- Thermal printer support via browser Web USB API or print server
- Kitchen printer: order items for hot/cold station
- Bar printer: drink orders
- Receipt printer: customer receipts
- Fallback: if printer down → route to another

---

## 12. WHAT WE KEEP FROM EXISTING CODEBASE

### Unchanged (copy as-is):
- `components/ui/*` (58 shadcn components)
- `styles/globals.css` (theme)
- `components.json` (shadcn config)
- `public/*` (assets)
- `postcss.config.mjs`

### Keep with modifications:
- `lib/types.ts` → enhance with migration fields, new types
- `supabase/migrations/*` → enhance with audit, archive, metadata
- 22 presentational POS components → remove mock-data imports
- `components/pos/sidebar.tsx` → update nav links

### Rewrite:
- `lib/pos-context.tsx` → replaced by Supabase + realtime
- `lib/mock-data.ts` → deleted
- All 16 hooks → rewritten for Supabase
- 31 feature POS components → rewritten with Server Actions
- All page files → Server Components + proper data fetching
- `app/(pos)/layout.tsx` → auth + Supabase providers
