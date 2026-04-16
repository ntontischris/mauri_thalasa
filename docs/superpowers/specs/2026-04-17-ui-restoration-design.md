# UI/UX Restoration Design — EatFlow POS

**Date:** 2026-04-17
**Author:** Brainstorming session (ntontischris + Claude)
**Status:** Approved, ready for implementation plan
**Production target:** https://mauri-thalasa.vercel.app

---

## 1. Background & Motivation

The EatFlow POS (για Mavri Thalassa seafood restaurant) έχει ολοκληρώσει Phase 1-5 σε λειτουργικό επίπεδο (`main` branch, commit `048adce`). Το τρέχον UI βασίζεται σε ~21 απλοποιημένα `*-panel.tsx` components που δουλεύουν με Supabase.

Η προηγούμενη έκδοση (mock-data based) είχε **~70 rich components** με σημαντικά καλύτερο UX και πολύ περισσότερες λειτουργίες (analytics dashboards, AI, floor plan editor, shift scheduler, κλπ). Αυτά τα components υπάρχουν ακόμα στο git HEAD ως uncommitted deletions — άρα είναι πλήρως recoverable.

**Business context:** Ο ιδιοκτήτης έχει ήδη κάνει demo σε πιθανούς αγοραστές. Χρειάζεται το προϊόν να λειτουργεί πραγματικά σε επίπεδο premium, όχι να φαίνεται απλά καλό.

**Στόχος:** Πλήρης επαναφορά του παλιού UX, αλλά wired στην υπάρχουσα Supabase υποδομή, με νέες migrations για ό,τι λείπει.

---

## 2. Guiding Principles

1. **Stability over speed** — παραγωγικό site πρέπει να παραμείνει σταθερό σε όλη τη διαδικασία.
2. **Phase-by-phase, branch-per-phase** — κάθε φάση είναι mergeable και deploy-able μόνη της.
3. **Real data only** — καθόλου seed/mock data. Ο χρήστης έχει δική του πραγματική πληροφορία.
4. **Server Components first** — client hydration μόνο όπου χρειάζεται interactivity.
5. **Realtime-first** — shared resources (orders, tables, reservations) συγχρονίζονται σε όλα τα tabs/devices.
6. **Type safety end-to-end** — Zod στις boundaries, TypeScript παντού αλλού.
7. **RLS always-on** — κάθε νέος πίνακας έχει policies από την πρώτη στιγμή.

---

## 3. Architecture

### 3.1 Folder conventions per feature

```
app/(pos)/<feature>/page.tsx       → async RSC, initial data fetch
app/(pos)/<feature>/loading.tsx    → skeleton
app/(pos)/<feature>/error.tsx      → error boundary με retry

lib/data/<feature>.ts              → Supabase server queries
lib/actions/<feature>.ts           → Server Actions (mutations)
lib/types/<feature>.ts             → composite types (π.χ. OrderWithItems)

hooks/use-<feature>.ts             → React Query hooks + realtime subs

components/pos/<feature>-*.tsx     → rich UI restored από mock era
```

### 3.2 Stack additions

- `@tanstack/react-query` — already present, used ως default client cache layer
- `recharts` ή `@tremor/react` — για Phase 6 analytics charts
- `@react-pdf/renderer` — PDF fallback για receipts
- `escpos-buffer` ή `node-escpos` — thermal printer (Phase 1)
- `openai` SDK — Phase 8 AI
- `zod` — already present, used παντού στις boundaries

### 3.3 External integrations

| Integration | Approach | Config |
|---|---|---|
| **OpenAI** (Phase 8) | SDK με streaming + function calling | `OPENAI_API_KEY` env |
| **Caller-ID** | Webhook endpoint `/api/webhooks/caller-id` με HMAC verification + Supabase Realtime broadcast | `CALLER_ID_WEBHOOK_SECRET` env |
| **Receipt printer** | ESC/POS lib scaffold + PDF fallback via `@react-pdf/renderer` | `PRINTER_IP`, `PRINTER_PORT` env (optional) |

Για 2 και 3: το code είναι πλήρως λειτουργικό χωρίς real hardware. Η σύνδεση γίνεται με τα σωστά env vars όταν ο χρήστης έχει το hardware/provider.

---

## 4. Phase Breakdown

Για κάθε φάση: components που επαναφέρονται, migrations, data layer, testing scope.

### Phase 1 — POS Enrichment

**Components restored:**
- `menu-item.tsx`, `order-item.tsx`, `modifier-chips.tsx`, `modifier-manager.tsx`
- `course-separator.tsx`, `payment-dialog.tsx`, `receipt-preview.tsx`

**Migrations (`022_phase1_pos_enrichment.sql`):**
- `ALTER TABLE order_items ADD COLUMN course_number int DEFAULT 1`
- `ALTER TABLE order_items ADD COLUMN notes text`
- `ALTER TABLE order_items ADD COLUMN modifiers jsonb DEFAULT '[]'::jsonb`
- (Optional) `CREATE TABLE order_courses (id uuid, order_id uuid FK, course_number int, sent_to_kitchen_at timestamptz)`

**Data layer:**
- `lib/data/orders.ts` — επέκταση ώστε να επιστρέφει modifiers + course grouping
- `lib/actions/orders.ts` — `addItemWithModifiers`, `splitCourses`, `sendCourseToKitchen`

**Integration scaffolding:**
- `lib/printing/escpos.ts` — printer client (gracefully no-op αν δεν υπάρχει IP)
- `lib/printing/pdf-receipt.tsx` — React PDF component
- `app/api/print/receipt/route.ts` — POST endpoint με fallback logic

**Acceptance:**
- Proper modifier UI στο order panel
- Split courses visible in KDS
- Print button → printer (αν config) ή PDF download

---

### Phase 2 — Floor Plan Editor

**Components restored:**
- `floor-plan-editor.tsx`, `floor-plan-view.tsx`, `table-shape.tsx`, `zone-manager.tsx`, `table-transfer-dialog.tsx`

**Migrations (`023_phase2_floor_plan.sql`):**
- `ALTER TABLE tables ADD COLUMN x int DEFAULT 0, y int DEFAULT 0, width int DEFAULT 80, height int DEFAULT 80, shape text DEFAULT 'rect' CHECK (shape IN ('rect','round')), rotation int DEFAULT 0`
- Optional view `table_current_state` που joins tables + active orders για occupancy visualization

**Data layer:**
- `lib/data/floor-plan.ts` — fetch tables με positions ανά zone
- `lib/actions/floor-plan.ts` — `updateTablePosition`, `createZone`, `transferTable`

**Hooks:**
- `use-floor-plan.ts` — realtime subscription στο `tables` channel

**Acceptance:**
- Drag-and-drop τραπεζιών, positions persistent
- Zone management (create/rename/delete/reorder)
- Table transfer (move active order to different table)

---

### Phase 3 — Reservations Suite

**Components restored:**
- `reservation-calendar.tsx`, `reservation-timeline.tsx`, `reservation-form.tsx`
- `waitlist-panel.tsx`, `caller-id-popup.tsx`

**Migrations (`024_phase3_reservations.sql`):**
- `ALTER TABLE reservations ADD COLUMN source text` (phone/walkin/online), `special_requests text`
- `CREATE TABLE waitlist (id, customer_name, phone, party_size, quoted_wait_min, status, created_at, notified_at)`
- `CREATE TABLE caller_id_events (id, phone, caller_name text null, received_at)` (ephemeral log)

**API:**
- `app/api/webhooks/caller-id/route.ts` — HMAC-verified webhook, writes to table + broadcasts via Supabase Realtime

**Hooks:**
- `use-reservations.ts`, `use-waitlist.ts` με realtime subs
- `use-caller-id.ts` — subscribes σε broadcast channel, triggers popup

**Acceptance:**
- Calendar view με drag-to-reschedule
- Timeline view (Gantt-style) για την ημέρα
- Waitlist με εκτιμώμενο χρόνο και SMS-ready triggers (σημειωμένο ως TODO για μελλοντικό SMS provider)
- Caller-ID popup εμφανίζεται όταν φτάνει webhook event

---

### Phase 4 — Operations Depth

**Components restored:**
- `ingredient-table.tsx`, `ingredient-form.tsx`
- `waste-log.tsx`, `waste-form.tsx`
- `food-cost-dashboard.tsx`
- `recipe-card.tsx`, `recipe-editor.tsx`
- `supplier-list.tsx`, `supplier-order-form.tsx`
- `stock-alert-badge.tsx`

**Migrations (`025_phase4_operations.sql`):**
- `CREATE TABLE waste_entries (id, ingredient_id FK, quantity, unit, reason, cost, recorded_by FK staff, recorded_at)`
- `CREATE TABLE supplier_orders (id, supplier_id FK, status, total, ordered_at, received_at, notes)`
- `CREATE TABLE supplier_order_items (order_id FK, ingredient_id FK, quantity, unit_cost)`
- `ALTER TABLE recipes ADD COLUMN yield_qty numeric, prep_time_min int, instructions text`
- `CREATE VIEW food_cost_per_product AS ...` (calculates cost from recipe ingredients)

**Acceptance:**
- Ingredient inventory με stock alerts
- Waste logging με reason categories + cost impact
- Food cost dashboard: ποσοστό cost/sales ανά product
- Recipe editor με ingredients, yield, instructions
- Supplier orders με status tracking

---

### Phase 5 — Staff Operations

**Components restored:**
- `shift-scheduler.tsx`, `staff-checklist.tsx`, `staff-performance.tsx`
- `staff-form.tsx`, `staff-list.tsx`

**Migrations (`026_phase5_staff.sql`):**
- `CREATE TABLE shifts (id, staff_id FK, role, start_at, end_at, status)`
- `CREATE TABLE checklists (id, name, role_required, frequency)`
- `CREATE TABLE checklist_items (checklist_id FK, description, order)`
- `CREATE TABLE checklist_completions (checklist_id FK, staff_id FK, completed_at)`
- `CREATE MATERIALIZED VIEW staff_performance_metrics` (orders served, avg ticket, hours worked)
- RLS policies refined για role-based access (owner/manager/waiter/chef)

**Integration:**
- Role-based sidebar visibility implemented εδώ (`components/pos/sidebar.tsx` reads role από session)

**Acceptance:**
- Drag-to-create shifts σε weekly grid, conflict detection
- Daily/weekly checklists με completion tracking
- Performance dashboard ανά staff member
- Sidebar items filtered βάσει ρόλου

---

### Phase 6 — Analytics Suite

**Components restored:**
- `analytics-dashboard.tsx` (hub)
- `analytics-sales.tsx`, `analytics-kitchen.tsx`, `analytics-food-cost.tsx`
- `analytics-reservations.tsx`, `analytics-product-history.tsx`
- `analytics-export.tsx`

**Migrations (`027_phase6_analytics.sql`):**
- `CREATE MATERIALIZED VIEW daily_sales_mv AS ...` (revenue, tickets, avg ticket per day, grouped by service)
- `CREATE MATERIALIZED VIEW kitchen_performance_mv AS ...` (prep times, station throughput)
- `CREATE MATERIALIZED VIEW product_history_mv AS ...` (units sold, revenue, margin per product over time)
- Supabase scheduled function (pg_cron): `REFRESH MATERIALIZED VIEW CONCURRENTLY` κάθε νύχτα 3am

**Libs:**
- Install `recharts` (lighter) or `@tremor/react` (opinionated, richer)
- Decision σημειωμένη ως open question στο implementation plan

**Export:**
- CSV via `papaparse`
- PDF via `@react-pdf/renderer` (ήδη present από Phase 1)

**Acceptance:**
- 6 διαφορετικά dashboards, interactive charts
- Date range picker, export button σε κάθε ένα
- Drill-down από summary → details

---

### Phase 7 — Loyalty Advanced

**Components restored:**
- `loyalty-rankings.tsx`, `loyalty-winback.tsx`, `loyalty-settings.tsx`

**Migrations (`028_phase7_loyalty.sql`):**
- `CREATE TABLE loyalty_tiers (id, name, min_spend, benefits jsonb)`
- `CREATE TABLE loyalty_rules (id, name, trigger, points, active)`
- `CREATE TABLE winback_campaigns (id, name, segment_criteria jsonb, discount_pct, status, created_at)`
- `CREATE TABLE customer_segments (id, name, criteria jsonb)`
- `CREATE VIEW customer_rankings AS ...` (total spend, visits, last visit)

**Acceptance:**
- Top customers leaderboard
- Winback campaigns με segment criteria (π.χ. "δεν ήρθαν τελευταίους 3 μήνες, spend > 200€")
- Tier management UI

---

### Phase 8 — AI Suite

**Components restored:**
- `ai-chat.tsx`, `ai-forecast.tsx`, `ai-menu-optimization.tsx`, `ai-settings.tsx`

**Migrations (`029_phase8_ai.sql`):**
- `CREATE TABLE ai_chat_sessions (id, user_id FK, title, created_at)`
- `CREATE TABLE ai_chat_messages (session_id FK, role, content, tokens, created_at)`
- `CREATE TABLE ai_forecasts_cache (id, type, input_hash, output jsonb, generated_at, expires_at)`

**Lib:**
- `lib/ai/openai.ts` — OpenAI SDK client με streaming + function calling
- Functions exposed στο chat: `queryOrders`, `queryInventory`, `suggestReorder`, `analyzePrepTimes`

**Features:**
- **Chat:** Context-aware (reads today's orders + low-stock items). Streaming responses.
- **Forecast:** Historical sales → GPT-4 structured output (next 7 days πρόβλεψη ανά service). Cached 24h.
- **Menu optimization:** Food cost + sales data → suggested price changes + underperforming items.

**Feature flag:** `NEXT_PUBLIC_FEATURE_AI=true/false` για emergency disable.

**Acceptance:**
- Chat UI με streaming responses
- Forecast chart με confidence intervals
- Menu optimization suggestions με reasoning

---

## 5. Data Flow & Realtime Strategy

### 5.1 Initial load (Server Components)
```
Browser → /pos/<page>/page.tsx (async RSC)
       → lib/data/<feature>.ts (Supabase server client με cookies)
       → Server renders HTML με initial data
       → Client hydrates React Query cache με prefetched data
```

### 5.2 Mutations (Client → Server Action → DB → Realtime broadcast)
```
Component → useMutation (React Query) → Server Action (lib/actions/*.ts)
         → Supabase mutation
         → Return typed Result<T>
         → Optimistic update in React Query cache
         → Supabase Realtime broadcasts INSERT/UPDATE
         → Other clients receive event → invalidate query → refetch
```

### 5.3 Realtime channels

| Channel | Events | Listeners |
|---|---|---|
| `orders` | INSERT, UPDATE | Tables, Orders, Kitchen, Checkout, Analytics |
| `tables` | UPDATE | Tables, Floor Plan |
| `kitchen_tickets` | INSERT, UPDATE | Kitchen Display |
| `reservations` | INSERT, UPDATE, DELETE | Reservations |
| `waitlist` | INSERT, UPDATE, DELETE | Waitlist panel |
| `waste_entries` | INSERT | Inventory, Food Cost |
| `shifts` | UPDATE | Staff Schedule |
| `caller_id_events` | Broadcast (ephemeral) | Caller-ID Popup |
| `ai_chat_messages` | INSERT | AI Chat |

### 5.4 Caching
- React Query: `staleTime: 30s`, `gcTime: 5min` για list queries
- Materialized views (Phase 6): pg_cron nightly refresh
- AI forecasts: 24h cache στο `ai_forecasts_cache`

---

## 6. Error Handling

### 6.1 Server Actions
Δεν throw — επιστρέφουν:
```ts
type Result<T> = { ok: true; data: T } | { ok: false; error: string }
```

### 6.2 Client errors
- React Query `onError` → toast με friendly message
- RLS denials → "Δεν έχετε δικαίωμα" (όχι raw error)
- Network errors → auto-retry με exponential backoff

### 6.3 RSC errors
- `error.tsx` boundary per route με retry button
- `loading.tsx` για instant perceived performance

### 6.4 Realtime
- Auto-reconnect (Supabase built-in)
- UI badge "Offline" όταν disconnected
- Refetch κρίσιμων queries μετά από reconnect

### 6.5 External integrations
- OpenAI timeout/rate-limit → fallback σε cached response ή friendly error
- Printer fail → auto-fallback σε PDF download
- Caller-ID webhook → HMAC verification, reject αν invalid

### 6.6 Validation
- Zod schemas για όλα τα Server Action inputs + webhook payloads
- TypeScript types για εσωτερικά data passing

---

## 7. Testing Strategy

| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest | Business logic (food cost calc, loyalty rules, shift conflicts, Zod schemas) |
| Integration | Vitest + Supabase local | Server Actions → DB, RLS enforcement |
| E2E (critical paths) | Playwright | Order flow, reservation create, floor plan edit save |
| Manual smoke test | Checklist per phase | Browser verification πριν το merge |

**Coverage targets:**
- Business logic: 80%+
- Auth/payment/order flows: 100%
- UI components: skip (manual + E2E)

**No seed data** — tests χρησιμοποιούν factories + transactional rollback.

---

## 8. Migration Plan & Rollout

### 8.1 Pre-work (one-time prep branch `chore/restoration-prep`)
1. **Stash** τις τρέχουσες deletions ως backup (`git stash push -m "mock-components-backup"` δεν δουλεύει για deletions, οπότε: `git checkout HEAD -- components/pos hooks lib/mock-data.ts lib/pos-context.tsx lib/ai-openai.ts lib/ai-mock-patterns.ts lib/mock-history.ts middleware.ts` — επαναφορά τους ώστε το working tree να καθαρίσει).
2. Commit τα untracked scripts + plans ξεχωριστά:
   - `chore: add migration scripts`
   - `docs: add design plans from previous brainstorming`
3. Commit τα modified config files αν είναι έτοιμα (`package.json`, `next.config.mjs`, `tsconfig.json`, `app/layout.tsx`, `components/pos/staff-header.tsx`).
4. Merge στο `main` πριν ξεκινήσει η Phase 1.

Αυτό φέρνει το working tree clean + όλα τα παλιά components είναι πλέον committed στο `main` ώστε κάθε phase branch να τα "κλέβει" μέσω normal file operations.

### 8.2 Per-phase workflow
1. `git checkout -b feat/restore-phase-N-<topic>` από latest `main`
2. Γράφεται η migration, τεστάρεται σε Supabase local branch
3. Regenerate types (`supabase gen types typescript --linked > lib/types/supabase.ts`)
4. Rewire hooks από mock → Supabase + React Query + realtime
5. Swap απλοποιημένο `*-panel.tsx` με rich components στο αντίστοιχο page
6. Tests written & passing
7. Manual smoke test (checklist per phase)
8. PR → review → merge
9. Vercel auto-deploys → manual verification στο `mauri-thalasa.vercel.app`
10. Apply migration στο production Supabase
11. Post-deploy smoke test με real data

### 8.3 Rollback plan
- Git revert του merge commit → Vercel auto-redeploy
- Down migration παρέχεται ως `<name>_down.sql` ή `-- DOWN` section
- Feature flag env var για Phase 8 AI (instant disable χωρίς deploy)

### 8.4 Per-phase acceptance criteria
- [ ] Όλα τα παλιά mock components του topic restored
- [ ] Wired σε Supabase (καθόλου mock imports)
- [ ] Migration applied + types regenerated
- [ ] RLS policies enforced και tested
- [ ] Realtime verified σε 2+ browser tabs
- [ ] Vitest + integration tests pass
- [ ] Lint clean, typecheck zero errors, build success
- [ ] Manual smoke test σε Chrome desktop + tablet viewport
- [ ] Production verification στο `mauri-thalasa.vercel.app`

### 8.5 Estimated scope

| Phase | Topic | Migrations | Components | Effort |
|---|---|---|---|---|
| 1 | POS Enrichment | 1-2 | 7 | M |
| 2 | Floor Plan | 1 | 5 | M |
| 3 | Reservations | 2 | 5 + webhook | L |
| 4 | Operations | 3 | 10 | XL |
| 5 | Staff | 2 | 5 + RBAC | L |
| 6 | Analytics | 3 (MVs) | 7 + charts | XL |
| 7 | Loyalty | 2 | 3 | M |
| 8 | AI | 2 | 4 + OpenAI | L |

---

## 9. Out of Scope

Τα παρακάτω δεν μπαίνουν στο παρόν project:
- **Offline support** (IndexedDB/Dexie για offline order queue) — μόνο αν το ζητήσει ο χρήστης μετά τα demos.
- **SMS integration** για waitlist notifications — scaffolded ως TODO, actual provider αργότερα.
- **Mobile native app** — όλη η χρήση μέσω web (responsive + tablet-optimized).
- **Elorus invoice integration** — ήδη καλύπτεται εκτός συστήματος.
- **Multi-tenant** — το προϊόν παραμένει single-restaurant deployment.

---

## 10. Open Questions

Ερωτήσεις που θα απαντηθούν στο implementation plan:

1. **Charting library για Phase 6:** `recharts` (lighter, flexible) ή `@tremor/react` (opinionated, richer out-of-box)?
2. **ESC/POS library:** `escpos-buffer` (pure TS, works in Vercel serverless) ή `node-escpos` (node-native, needs self-hosted worker)?
3. **Analytics refresh schedule:** Nightly 3am or more frequent (hourly για real-time-ish)?
4. **AI model:** GPT-4o ή GPT-4o-mini; cost tradeoff;
5. **Role definitions:** Θα ξεκαθαριστούν στο Phase 5 plan (owner/manager/waiter/chef/bartender?)

---

## 11. Success Criteria

Το project θεωρείται επιτυχημένο όταν:

1. Το production URL (`mauri-thalasa.vercel.app`) έχει ΟΛΟ το rich UX της προηγούμενης mock version.
2. Καμία λειτουργία δεν βασίζεται σε mock data — όλα wired σε Supabase.
3. Demo σε πιθανούς αγοραστές καλύπτει ΟΛΑ τα features χωρίς "έρχεται σύντομα" ή broken states.
4. Owner μπορεί να τρέξει real business operations με το σύστημα (orders, reservations, inventory, staff, reports) αντί του SoftOne ERP.
5. Όλες οι 8 φάσεις έχουν merged, deployed, και verified στο production.

---

**Next step:** Invoke writing-plans skill για τη δημιουργία detailed implementation plan της Phase 1 (POS Enrichment).
