# Phase 1: POS Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the rich POS ordering UX (modifier selection, course grouping, payment dialog, receipt preview) from the previous mock version, wired to existing Supabase infrastructure, plus scaffold thermal-printer + PDF receipt integrations.

**Architecture:** Phase 1 requires NO schema changes (order_items already has `course`, `notes`, `station`; `order_item_modifiers` exists as separate table). Work is entirely client-side UI enrichment + printing integration scaffolding. All components are Client Components that call existing server actions from `lib/actions/orders.ts` and `lib/actions/tables.ts`.

**Deviation from spec (section 4 Phase 1):** The spec listed `modifier-manager` as a Phase 1 component. That component was the admin CRUD UI for managing modifier entities (create/edit/delete modifier records). Since it belongs to menu management (admin area), not POS ordering flow, it is deferred to a later phase focused on menu/settings enrichment. The user-facing modifier selection during order taking is handled by the new `modifier-dialog` + `modifier-chips` components (Tasks 5-6).

**Tech Stack:** Next.js 16 (App Router), Supabase (existing), TypeScript, TailwindCSS, shadcn/ui Radix primitives, Zod, `@react-pdf/renderer` (new), `escpos-buffer` (new), Sonner (existing toast), Vitest (new for unit tests).

**Reference spec:** `docs/superpowers/specs/2026-04-17-ui-restoration-design.md`

**Branch:** `feat/restore-phase-1-pos-enrichment` branched from `main`.

---

## File Structure

**New files (11):**
- `components/pos/modifier-chips.tsx` — chip selector for modifier options
- `components/pos/modifier-dialog.tsx` — Dialog wrapping ModifierChips for product-click flow
- `components/pos/menu-item-card.tsx` — rich menu product card with availability + VAT badge
- `components/pos/order-item-card.tsx` — rich order line with status colors, notes indicator
- `components/pos/course-separator.tsx` — visual "Course N" divider
- `components/pos/course-actions.tsx` — "Send course to kitchen" + "Advance course" controls
- `components/pos/payment-dialog.tsx` — modal payment flow (alternative to full-page checkout)
- `components/pos/receipt-preview.tsx` — rich printable receipt with VAT breakdown by rate
- `lib/printing/escpos-client.ts` — thermal printer client with graceful no-op fallback
- `lib/printing/pdf-receipt.tsx` — React PDF document component
- `app/api/print/receipt/route.tsx` — print endpoint with printer→PDF fallback (`.tsx` so JSX works for PDF render)

**Modified files (4):**
- `components/pos/order-panel.tsx` — integrate modifier dialog, course separator, rich OrderItem
- `components/pos/checkout-flow.tsx` — use new ReceiptPreview, add print button
- `lib/actions/orders.ts` — add `sendCourseToKitchen` + `advanceCourse` server actions
- `package.json` — add `@react-pdf/renderer`, `escpos-buffer`, `vitest`, `@vitest/ui`

**New tests (3):**
- `tests/lib/modifier-calc.test.ts` — unit tests for modifier price totals
- `tests/lib/receipt-vat.test.ts` — VAT breakdown by rate logic
- `vitest.config.ts` — Vitest setup

---

## Pre-flight: Repository Preparation (Phase 0)

Before starting Phase 1 proper, clean up the working tree. The current state has ~60 uncommitted changes (50 deletions + 10 modified/untracked). These block clean branching.

### Task 0.1: Create prep branch and commit untracked scripts

**Files:**
- Commit: `scripts/clean-test-data.sql`, `scripts/seed-test-data.sql`, `scripts/migrate-archive.mjs`, `scripts/migrate-customers.mjs`, `scripts/migrate-softone.mjs`, `proxy.ts`, `next-env.d.ts`

- [ ] **Step 1: Create prep branch**

```bash
cd C:/Users/ntont/Desktop/MAURI/mauri_thalasa
git checkout -b chore/restoration-prep main
git status --short
```
Expected: list of ~60 changes.

- [ ] **Step 2: Commit existing plan docs (from previous brainstorming)**

```bash
git add docs/superpowers/plans/2026-04-15-core-pos-plan.md docs/superpowers/plans/2026-04-15-operations-plan.md docs/superpowers/plans/2026-04-15-phase4-plan.md
git commit -m "docs: archive previous phase plans"
```

- [ ] **Step 3: Commit migration scripts**

```bash
git add scripts/migrate-archive.mjs scripts/migrate-customers.mjs scripts/migrate-softone.mjs scripts/clean-test-data.sql scripts/seed-test-data.sql
git commit -m "chore: add legacy migration scripts"
```

- [ ] **Step 4: Commit misc untracked**

```bash
git add proxy.ts next-env.d.ts
git commit -m "chore: track proxy config and next env types"
```

### Task 0.2: Commit deletions and modified configs

- [ ] **Step 1: Commit the component/hook/lib deletions**

```bash
git add -A components/pos/ hooks/ lib/mock-data.ts lib/mock-history.ts lib/pos-context.tsx lib/ai-openai.ts lib/ai-mock-patterns.ts middleware.ts
git status --short
```
Expected: ~50 deletions staged, some modified components (staff-header) also possibly included.

- [ ] **Step 2: Verify nothing critical is deleted**

```bash
git diff --staged --name-only --diff-filter=D | head -60
```
Confirm list matches expected deleted mock-era files. None of the current `*-panel.tsx` should appear.

- [ ] **Step 3: Create deletion commit**

```bash
git commit -m "chore: remove unused mock-era components and hooks

The mock-data-based POSContext architecture has been fully replaced
by Supabase-backed panels. The old rich components remain recoverable
via git history (HEAD~1) as reference material for future UI
restoration phases."
```

- [ ] **Step 4: Commit config/layout adjustments**

```bash
git add app/layout.tsx components/pos/staff-header.tsx next.config.mjs package.json pnpm-lock.yaml tsconfig.json supabase/.temp/
git commit -m "chore: sync config, layout, and staff header changes"
```

- [ ] **Step 5: Verify clean tree**

```bash
git status
```
Expected: `nothing to commit, working tree clean`.

### Task 0.3: Merge prep branch and start Phase 1 branch

- [ ] **Step 1: Merge prep branch to main**

```bash
git checkout main
git merge --no-ff chore/restoration-prep -m "chore: repository cleanup before Phase 1 UI restoration"
```

- [ ] **Step 2: Create Phase 1 feature branch**

```bash
git checkout -b feat/restore-phase-1-pos-enrichment
git status
```
Expected: clean tree, on feat branch.

---

## Task 1: Install New Dependencies

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Install runtime dependencies**

```bash
pnpm add @react-pdf/renderer@^4.0.0 escpos-buffer@^4.1.0
```

- [ ] **Step 2: Install dev dependencies for testing**

```bash
pnpm add -D vitest@^2.1.0 @vitest/ui@^2.1.0 @testing-library/react@^16.1.0 @testing-library/jest-dom@^6.6.0 jsdom@^25.0.0
```

- [ ] **Step 3: Add test scripts to package.json**

Modify `package.json` scripts section:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui"
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install pdf renderer, escpos, and vitest toolchain"
```

---

## Task 2: Vitest Configuration

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`

- [ ] **Step 1: Create Vitest config**

Write `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

- [ ] **Step 2: Install missing Vite plugin**

```bash
pnpm add -D @vitejs/plugin-react@^4.3.0
```

- [ ] **Step 3: Create test setup file**

Write `tests/setup.ts`:

```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 4: Smoke-test Vitest**

Create `tests/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("vitest smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run:

```bash
pnpm test
```
Expected: `1 test passed`.

- [ ] **Step 5: Delete smoke test**

```bash
rm tests/smoke.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts tests/setup.ts package.json pnpm-lock.yaml
git commit -m "test: configure vitest with jsdom and testing-library"
```

---

## Task 3: Modifier Price Calculation — Pure Function (TDD)

Extract pricing logic to a pure function for testability. Current `completeOrder` action has this logic inline; we'll extract it.

**Files:**
- Create: `lib/pricing/order-totals.ts`
- Create: `tests/lib/order-totals.test.ts`

- [ ] **Step 1: Write failing tests**

Write `tests/lib/order-totals.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { calculateLineTotal, calculateOrderSubtotal, calculateVatBreakdown } from "@/lib/pricing/order-totals";

describe("calculateLineTotal", () => {
  it("computes (price + modifiers) * quantity", () => {
    const total = calculateLineTotal({
      price: 10,
      quantity: 2,
      modifiers: [{ price: 1.5 }, { price: 0.5 }],
    });
    expect(total).toBe(24);
  });

  it("handles zero modifiers", () => {
    const total = calculateLineTotal({
      price: 5,
      quantity: 3,
      modifiers: [],
    });
    expect(total).toBe(15);
  });

  it("rounds to 2 decimals", () => {
    const total = calculateLineTotal({
      price: 3.33,
      quantity: 3,
      modifiers: [],
    });
    expect(total).toBe(9.99);
  });
});

describe("calculateOrderSubtotal", () => {
  it("sums line totals across items", () => {
    const subtotal = calculateOrderSubtotal([
      { price: 10, quantity: 2, modifiers: [] },
      { price: 5, quantity: 1, modifiers: [{ price: 1 }] },
    ]);
    expect(subtotal).toBe(26);
  });

  it("returns 0 for empty items", () => {
    expect(calculateOrderSubtotal([])).toBe(0);
  });
});

describe("calculateVatBreakdown", () => {
  it("groups by vat rate and computes net/vat amounts", () => {
    const breakdown = calculateVatBreakdown([
      { price: 10, quantity: 1, modifiers: [], vatRate: 24 },
      { price: 20, quantity: 1, modifiers: [], vatRate: 24 },
      { price: 5, quantity: 2, modifiers: [], vatRate: 13 },
    ]);
    expect(breakdown).toHaveLength(2);
    const vat24 = breakdown.find((b) => b.rate === 24)!;
    expect(vat24.gross).toBe(30);
    expect(vat24.vat).toBeCloseTo(5.806, 2);
    expect(vat24.net).toBeCloseTo(24.194, 2);
    const vat13 = breakdown.find((b) => b.rate === 13)!;
    expect(vat13.gross).toBe(10);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test
```
Expected: FAIL with "Cannot find module @/lib/pricing/order-totals".

- [ ] **Step 3: Implement**

Write `lib/pricing/order-totals.ts`:

```ts
export interface PriceableItem {
  price: number;
  quantity: number;
  modifiers: { price: number }[];
}

export interface VatableItem extends PriceableItem {
  vatRate: number;
}

export interface VatBreakdownRow {
  rate: number;
  gross: number;
  vat: number;
  net: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateLineTotal(item: PriceableItem): number {
  const modifierSum = item.modifiers.reduce((s, m) => s + m.price, 0);
  return round2((item.price + modifierSum) * item.quantity);
}

export function calculateOrderSubtotal(items: PriceableItem[]): number {
  return round2(items.reduce((sum, item) => sum + calculateLineTotal(item), 0));
}

export function calculateVatBreakdown(items: VatableItem[]): VatBreakdownRow[] {
  const byRate = new Map<number, number>();
  for (const item of items) {
    const gross = calculateLineTotal(item);
    byRate.set(item.vatRate, (byRate.get(item.vatRate) ?? 0) + gross);
  }
  return Array.from(byRate.entries())
    .map(([rate, gross]) => {
      const net = gross / (1 + rate / 100);
      const vat = gross - net;
      return { rate, gross: round2(gross), vat: round2(vat), net: round2(net) };
    })
    .sort((a, b) => b.rate - a.rate);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test
```
Expected: `3 tests passed`.

- [ ] **Step 5: Commit**

```bash
git add lib/pricing/order-totals.ts tests/lib/order-totals.test.ts
git commit -m "feat(pricing): extract pure order total helpers with tests"
```

---

## Task 4: CourseSeparator Component

Simple visual divider for grouping items by course.

**Files:**
- Create: `components/pos/course-separator.tsx`

- [ ] **Step 1: Create component**

Write `components/pos/course-separator.tsx`:

```tsx
interface CourseSeparatorProps {
  courseNumber: number;
  itemCount?: number;
  isActive?: boolean;
}

export function CourseSeparator({
  courseNumber,
  itemCount,
  isActive = false,
}: CourseSeparatorProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className={`flex-1 border-t ${
          isActive ? "border-primary/60" : "border-dashed border-border"
        }`}
      />
      <span
        className={`text-xs font-medium uppercase tracking-wide ${
          isActive ? "text-primary" : "text-muted-foreground"
        }`}
      >
        Course {courseNumber}
        {itemCount !== undefined && ` · ${itemCount}`}
      </span>
      <div
        className={`flex-1 border-t ${
          isActive ? "border-primary/60" : "border-dashed border-border"
        }`}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/pos/course-separator.tsx
git commit -m "feat(pos): add course separator component"
```

---

## Task 5: ModifierChips Component

Chip-based modifier selector, used inside ModifierDialog.

**Files:**
- Create: `components/pos/modifier-chips.tsx`

- [ ] **Step 1: Create component**

Write `components/pos/modifier-chips.tsx`:

```tsx
"use client";

import { cn } from "@/lib/utils";
import type { DbModifier } from "@/lib/types/database";

interface ModifierChipsProps {
  modifiers: DbModifier[];
  selectedIds: string[];
  onToggle: (modifierId: string) => void;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

export function ModifierChips({
  modifiers,
  selectedIds,
  onToggle,
}: ModifierChipsProps) {
  if (modifiers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Κανένα modifier διαθέσιμο
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Επιλογές
      </p>
      <div className="flex flex-wrap gap-2">
        {modifiers.map((modifier) => {
          const active = selectedIds.includes(modifier.id);
          return (
            <button
              key={modifier.id}
              type="button"
              onClick={() => onToggle(modifier.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:border-primary/50",
              )}
            >
              {modifier.name}
              {modifier.price > 0 && (
                <span className="ml-1">+{formatPrice(modifier.price)}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/pos/modifier-chips.tsx
git commit -m "feat(pos): add modifier chips selector"
```

---

## Task 6: ModifierDialog Component

Dialog that opens when a menu item is clicked. Fetches applicable modifiers, lets user pick, then adds item to order with modifiers.

**Files:**
- Create: `components/pos/modifier-dialog.tsx`

- [ ] **Step 1: Add server query for product modifiers (already exists in `lib/queries/modifiers.ts`)**

Verify:

```bash
grep -n "getModifiersByProduct" lib/queries/modifiers.ts
```
Expected: line showing function declaration.

- [ ] **Step 2: Create server action to fetch product modifiers client-side**

Modify `lib/actions/orders.ts` — add at bottom of file:

```ts
import { getModifiersByProduct } from "@/lib/queries/modifiers";
import type { DbModifier } from "@/lib/types/database";

export async function fetchProductModifiers(
  productId: string,
): Promise<ActionResult<DbModifier[]>> {
  try {
    const modifiers = await getModifiersByProduct(productId);
    return { success: true, data: modifiers };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: msg };
  }
}
```

- [ ] **Step 3: Create ModifierDialog component**

Write `components/pos/modifier-dialog.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModifierChips } from "./modifier-chips";
import { fetchProductModifiers } from "@/lib/actions/orders";
import type { DbProduct, DbModifier } from "@/lib/types/database";

export interface ModifierSelection {
  modifierId: string;
  name: string;
  price: number;
}

interface ModifierDialogProps {
  product: DbProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (
    product: DbProduct,
    modifiers: ModifierSelection[],
    notes: string,
    course: number,
  ) => void;
  defaultCourse: number;
}

export function ModifierDialog({
  product,
  open,
  onOpenChange,
  onConfirm,
  defaultCourse,
}: ModifierDialogProps) {
  const [modifiers, setModifiers] = useState<DbModifier[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [course, setCourse] = useState(defaultCourse);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!product) return;
    setSelectedIds([]);
    setNotes("");
    setCourse(defaultCourse);
    setLoading(true);
    fetchProductModifiers(product.id).then((result) => {
      setLoading(false);
      if (result.success) setModifiers(result.data ?? []);
      else setModifiers([]);
    });
  }, [product, defaultCourse]);

  const handleToggle = (modifierId: string) => {
    setSelectedIds((prev) =>
      prev.includes(modifierId)
        ? prev.filter((id) => id !== modifierId)
        : [...prev, modifierId],
    );
  };

  const handleConfirm = () => {
    if (!product) return;
    const selected: ModifierSelection[] = selectedIds
      .map((id) => modifiers.find((m) => m.id === id))
      .filter((m): m is DbModifier => Boolean(m))
      .map((m) => ({ modifierId: m.id, name: m.name, price: m.price }));
    onConfirm(product, selected, notes.trim(), course);
    onOpenChange(false);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          {product.description && (
            <DialogDescription>{product.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Φόρτωση...</p>
          ) : (
            <ModifierChips
              modifiers={modifiers}
              selectedIds={selectedIds}
              onToggle={handleToggle}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="item-notes">Σημειώσεις</Label>
            <Input
              id="item-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="π.χ. χωρίς αλάτι"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Πιάτο</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={course === n ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCourse(n)}
                  className="flex-1"
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Ακύρωση
          </Button>
          <Button onClick={handleConfirm}>Προσθήκη</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/pos/modifier-dialog.tsx lib/actions/orders.ts
git commit -m "feat(pos): add modifier dialog with product-specific modifier loading"
```

---

## Task 7: MenuItemCard Component

Rich product card replacing the current inline `ProductGrid` button in OrderPanel.

**Files:**
- Create: `components/pos/menu-item-card.tsx`

- [ ] **Step 1: Create component**

Write `components/pos/menu-item-card.tsx`:

```tsx
"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DbProduct } from "@/lib/types/database";

interface MenuItemCardProps {
  product: DbProduct;
  onClick: (product: DbProduct) => void;
  disabled?: boolean;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

const stationLabel: Record<DbProduct["station"], string> = {
  hot: "Κουζίνα",
  cold: "Κρύα",
  bar: "Μπαρ",
  dessert: "Γλυκά",
};

export function MenuItemCard({
  product,
  onClick,
  disabled = false,
}: MenuItemCardProps) {
  const unavailable = !product.available;
  const isDisabled = disabled || unavailable;

  return (
    <button
      onClick={() => onClick(product)}
      disabled={isDisabled}
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card p-4 text-left transition-all duration-200",
        "hover:border-primary/50 hover:bg-card/80",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
        "active:scale-95",
        isDisabled && "opacity-50 cursor-not-allowed hover:border-border hover:bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground leading-tight">
            {product.name}
          </p>
          {product.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {product.description}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            !isDisabled
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Plus className="size-4" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="text-lg font-semibold text-foreground">
          {formatPrice(product.price)}
        </span>
        <div className="flex items-center gap-1 text-muted-foreground">
          <span>{stationLabel[product.station]}</span>
          <span>·</span>
          <span>ΦΠΑ {product.vat_rate}%</span>
        </div>
      </div>
      {unavailable && (
        <span className="mt-2 text-xs font-medium text-destructive">
          Εξαντλήθηκε
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/pos/menu-item-card.tsx
git commit -m "feat(pos): add rich menu item card with station and VAT info"
```

---

## Task 8: OrderItemCard Component

Rich order line with status colors, modifier list, notes indicator, quantity controls.

**Files:**
- Create: `components/pos/order-item-card.tsx`

- [ ] **Step 1: Create component**

Write `components/pos/order-item-card.tsx`:

```tsx
"use client";

import { Minus, Plus, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderItemWithModifiers } from "@/lib/types/database";

interface OrderItemCardProps {
  item: OrderItemWithModifiers;
  onIncrement: (itemId: string) => void;
  onDecrement: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  disabled?: boolean;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

const statusStyles: Record<OrderItemWithModifiers["status"], string> = {
  pending: "border-border bg-card",
  preparing: "border-amber-500/40 bg-amber-500/10",
  ready: "border-emerald-500/40 bg-emerald-500/10",
  served: "border-border bg-muted/50 opacity-60",
};

const statusLabels: Record<OrderItemWithModifiers["status"], string> = {
  pending: "Εκκρεμεί",
  preparing: "Ετοιμάζεται",
  ready: "Έτοιμο",
  served: "Σερβιρίστηκε",
};

export function OrderItemCard({
  item,
  onIncrement,
  onDecrement,
  onRemove,
  disabled = false,
}: OrderItemCardProps) {
  const modifierTotal = item.order_item_modifiers.reduce(
    (s, m) => s + m.price,
    0,
  );
  const lineTotal = (item.price + modifierTotal) * item.quantity;
  const isEditable = item.status === "pending" && !disabled;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
        statusStyles[item.status],
      )}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm leading-tight truncate">
            {item.product_name}
          </p>
          <p className="font-semibold text-sm whitespace-nowrap">
            {formatPrice(lineTotal)}
          </p>
        </div>

        {item.order_item_modifiers.length > 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            + {item.order_item_modifiers.map((m) => m.name).join(", ")}
          </p>
        )}

        {item.notes && (
          <p className="flex items-start gap-1 text-xs text-muted-foreground italic">
            <MessageSquare className="size-3 mt-0.5 shrink-0" />
            <span>{item.notes}</span>
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            {formatPrice(item.price + modifierTotal)} × {item.quantity}
          </span>

          {isEditable ? (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => onDecrement(item.id)}
                disabled={item.quantity <= 1}
              >
                <Minus className="size-3" />
              </Button>
              <span className="w-6 text-center text-sm font-medium">
                {item.quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => onIncrement(item.id)}
              >
                <Plus className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-destructive"
                onClick={() => onRemove(item.id)}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ) : (
            <Badge variant="outline" className="text-xs">
              {statusLabels[item.status]}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/pos/order-item-card.tsx
git commit -m "feat(pos): add rich order item card with status colors"
```

---

## Task 9: ReceiptPreview Component

Printable receipt with VAT breakdown by rate, myDATA-style receipt number.

**Files:**
- Create: `components/pos/receipt-preview.tsx`
- Create: `tests/lib/receipt-number.test.ts`

- [ ] **Step 1: Write failing test for receipt number generator**

Write `tests/lib/receipt-number.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateReceiptNumber } from "@/lib/pricing/receipt-number";

describe("generateReceiptNumber", () => {
  it("follows ΑΛΠ-YYYY-NNNNNN pattern", () => {
    const num = generateReceiptNumber(new Date("2026-04-17T12:00:00Z"));
    expect(num).toMatch(/^ΑΛΠ-2026-\d{6}$/);
  });

  it("is deterministic for same order id", () => {
    const date = new Date("2026-04-17T12:00:00Z");
    const a = generateReceiptNumber(date, "order-abc");
    const b = generateReceiptNumber(date, "order-abc");
    expect(a).toBe(b);
  });

  it("differs for different order ids", () => {
    const date = new Date("2026-04-17T12:00:00Z");
    const a = generateReceiptNumber(date, "order-abc");
    const b = generateReceiptNumber(date, "order-xyz");
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run test to verify fail**

```bash
pnpm test tests/lib/receipt-number.test.ts
```
Expected: FAIL with module not found.

- [ ] **Step 3: Implement receipt-number helper**

Write `lib/pricing/receipt-number.ts`:

```ts
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateReceiptNumber(date: Date, orderId?: string): string {
  const year = date.getFullYear();
  const seed = orderId ? hashString(orderId) : Math.floor(Math.random() * 1e9);
  const seq = String(seed % 1_000_000).padStart(6, "0");
  return `ΑΛΠ-${year}-${seq}`;
}
```

- [ ] **Step 4: Run test to verify pass**

```bash
pnpm test tests/lib/receipt-number.test.ts
```
Expected: `3 tests passed`.

- [ ] **Step 5: Create ReceiptPreview component**

Write `components/pos/receipt-preview.tsx`:

```tsx
"use client";

import { Separator } from "@/components/ui/separator";
import { calculateVatBreakdown, calculateOrderSubtotal } from "@/lib/pricing/order-totals";
import { generateReceiptNumber } from "@/lib/pricing/receipt-number";
import type { DbOrder, OrderItemWithModifiers, PaymentMethod } from "@/lib/types/database";

interface ReceiptPreviewProps {
  order: DbOrder;
  items: OrderItemWithModifiers[];
  productVatRates: Map<string, number>;
  paymentMethod?: PaymentMethod | null;
  cashGiven?: number;
  issuedAt?: Date;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

export function ReceiptPreview({
  order,
  items,
  productVatRates,
  paymentMethod,
  cashGiven,
  issuedAt,
}: ReceiptPreviewProps) {
  const now = issuedAt ?? new Date();
  const receiptNumber = generateReceiptNumber(now, order.id);

  const vatableItems = items.map((item) => ({
    price: item.price,
    quantity: item.quantity,
    modifiers: item.order_item_modifiers.map((m) => ({ price: m.price })),
    vatRate: productVatRates.get(item.product_id) ?? 24,
  }));

  const subtotal = calculateOrderSubtotal(vatableItems);
  const vatBreakdown = calculateVatBreakdown(vatableItems);
  const change = cashGiven != null ? cashGiven - subtotal : null;

  return (
    <div className="bg-white text-black p-6 rounded-lg font-mono text-sm max-w-sm mx-auto print:shadow-none print:p-4">
      <div className="text-center space-y-0.5 border-b border-dashed border-gray-400 pb-3">
        <h2 className="text-lg font-bold">ΜΑΥΡΗ ΘΑΛΑΣΣΑ</h2>
        <p className="text-xs">Νίκης 3, Καλαμαριά 55132</p>
        <p className="text-xs">ΑΦΜ: 800474837 · ΔΟΥ Καλαμαριάς</p>
      </div>

      <div className="flex justify-between text-xs mt-3">
        <span>{receiptNumber}</span>
        <span>
          {now.toLocaleDateString("el-GR")}{" "}
          {now.toLocaleTimeString("el-GR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      <div className="flex justify-between text-xs mt-1">
        <span>Τραπέζι: {order.table_number}</span>
        <span>Παραγγελία: #{order.id.slice(-6)}</span>
      </div>

      <Separator className="my-3 bg-gray-400" />

      <div className="space-y-1">
        {items.map((item) => {
          const modTotal = item.order_item_modifiers.reduce(
            (s, m) => s + m.price,
            0,
          );
          const lineTotal = (item.price + modTotal) * item.quantity;
          return (
            <div key={item.id}>
              <div className="flex justify-between">
                <span>
                  {item.quantity}× {item.product_name}
                </span>
                <span>{formatPrice(lineTotal)}</span>
              </div>
              {item.order_item_modifiers.length > 0 && (
                <p className="text-xs text-gray-600 ml-4">
                  + {item.order_item_modifiers.map((m) => m.name).join(", ")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Separator className="my-3 bg-gray-400" />

      <div className="space-y-1 text-xs">
        {vatBreakdown.map((row) => (
          <div key={row.rate} className="flex justify-between">
            <span>
              Καθαρή αξία {row.rate}%:
            </span>
            <span>{formatPrice(row.net)}</span>
          </div>
        ))}
        {vatBreakdown.map((row) => (
          <div key={`vat-${row.rate}`} className="flex justify-between">
            <span>ΦΠΑ {row.rate}%:</span>
            <span>{formatPrice(row.vat)}</span>
          </div>
        ))}
      </div>

      <Separator className="my-2 bg-gray-400" />

      <div className="flex justify-between font-bold text-base">
        <span>ΣΥΝΟΛΟ</span>
        <span>{formatPrice(subtotal)}</span>
      </div>

      {paymentMethod && (
        <div className="mt-2 text-xs space-y-0.5">
          <div className="flex justify-between">
            <span>Πληρωμή:</span>
            <span>{paymentMethod === "cash" ? "Μετρητά" : "Κάρτα"}</span>
          </div>
          {paymentMethod === "cash" && cashGiven != null && change != null && change >= 0 && (
            <>
              <div className="flex justify-between">
                <span>Δόθηκαν:</span>
                <span>{formatPrice(cashGiven)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ρέστα:</span>
                <span>{formatPrice(change)}</span>
              </div>
            </>
          )}
        </div>
      )}

      <div className="text-center text-xs mt-4 border-t border-dashed border-gray-400 pt-3">
        <p>Ευχαριστούμε για την προτίμησή σας</p>
        <p className="mt-1">www.mauri-thalasa.gr</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/pricing/receipt-number.ts tests/lib/receipt-number.test.ts components/pos/receipt-preview.tsx
git commit -m "feat(pos): add receipt preview with VAT breakdown by rate"
```

---

## Task 10: PaymentDialog Component

Modal payment flow as an alternative to full-page checkout. Uses ReceiptPreview internally.

**Files:**
- Create: `components/pos/payment-dialog.tsx`

- [ ] **Step 1: Create component**

Write `components/pos/payment-dialog.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Banknote, CreditCard, Printer, Check } from "lucide-react";
import { toast } from "sonner";
import { completeOrder } from "@/lib/actions/orders";
import { calculateOrderSubtotal } from "@/lib/pricing/order-totals";
import { ReceiptPreview } from "./receipt-preview";
import type {
  DbOrder,
  OrderItemWithModifiers,
  PaymentMethod,
} from "@/lib/types/database";

interface PaymentDialogProps {
  order: DbOrder;
  items: OrderItemWithModifiers[];
  tableId: string;
  productVatRates: Map<string, number>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

type Step = "method" | "receipt";

export function PaymentDialog({
  order,
  items,
  tableId,
  productVatRates,
  open,
  onOpenChange,
  onComplete,
}: PaymentDialogProps) {
  const [step, setStep] = useState<Step>("method");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [cashGiven, setCashGiven] = useState("");
  const [isPending, startTransition] = useTransition();

  const subtotal = calculateOrderSubtotal(
    items.map((i) => ({
      price: i.price,
      quantity: i.quantity,
      modifiers: i.order_item_modifiers.map((m) => ({ price: m.price })),
    })),
  );
  const cashGivenNum = parseFloat(cashGiven) || 0;
  const change = cashGivenNum - subtotal;
  const canPay =
    paymentMethod === "card" ||
    (paymentMethod === "cash" && cashGivenNum >= subtotal);

  const handlePay = () => {
    if (!paymentMethod) return;
    startTransition(async () => {
      const result = await completeOrder({
        orderId: order.id,
        tableId,
        paymentMethod,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Πληρωμή ολοκληρώθηκε");
      setStep("receipt");
    });
  };

  const handlePrint = async () => {
    const response = await fetch("/api/print/receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id }),
    });
    if (response.ok) {
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/pdf")) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else {
        toast.success("Εστάλη στον εκτυπωτή");
      }
    } else {
      toast.error("Αποτυχία εκτύπωσης");
    }
  };

  const handleClose = () => {
    setStep("method");
    setPaymentMethod(null);
    setCashGiven("");
    onOpenChange(false);
    if (step === "receipt") onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? handleClose() : onOpenChange(v))}>
      <DialogContent className="max-w-lg">
        {step === "method" && (
          <>
            <DialogHeader>
              <DialogTitle>Πληρωμή — Τραπέζι {order.table_number}</DialogTitle>
              <DialogDescription>
                Σύνολο: <span className="font-bold">{formatPrice(subtotal)}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
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
                    <Label htmlFor="cash-given">Ποσό που δόθηκε</Label>
                    <Input
                      id="cash-given"
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
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCashGiven(amount.toString())}
                      >
                        €{amount}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCashGiven(subtotal.toFixed(2))}
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
                    {formatPrice(subtotal)}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Ακύρωση
              </Button>
              <Button onClick={handlePay} disabled={!canPay || isPending}>
                {isPending ? "Ολοκλήρωση..." : "Ολοκλήρωση Πληρωμής"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "receipt" && (
          <>
            <DialogHeader>
              <DialogTitle>Απόδειξη</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-auto">
              <ReceiptPreview
                order={order}
                items={items}
                productVatRates={productVatRates}
                paymentMethod={paymentMethod}
                cashGiven={paymentMethod === "cash" ? cashGivenNum : undefined}
              />
            </div>
            <Separator />
            <DialogFooter>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 size-4" />
                Εκτύπωση
              </Button>
              <Button onClick={handleClose}>
                <Check className="mr-2 size-4" />
                Κλείσιμο
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/pos/payment-dialog.tsx
git commit -m "feat(pos): add modal payment dialog with inline receipt preview"
```

---

## Task 11: ESC/POS Printer Client Scaffolding

Thermal printer integration with graceful no-op when printer not configured.

**Files:**
- Create: `lib/printing/escpos-client.ts`

- [ ] **Step 1: Create printer client**

Write `lib/printing/escpos-client.ts`:

```ts
import { Printer } from "escpos-buffer";
import type { OrderItemWithModifiers, DbOrder } from "@/lib/types/database";
import { calculateVatBreakdown, calculateOrderSubtotal } from "@/lib/pricing/order-totals";
import { generateReceiptNumber } from "@/lib/pricing/receipt-number";

export interface PrinterConfig {
  ip: string;
  port: number;
}

export function getPrinterConfig(): PrinterConfig | null {
  const ip = process.env.PRINTER_IP;
  const port = process.env.PRINTER_PORT;
  if (!ip) return null;
  return { ip, port: port ? parseInt(port, 10) : 9100 };
}

function formatPrice(price: number): string {
  return `${price.toFixed(2).replace(".", ",")} EUR`;
}

export interface ReceiptPrintPayload {
  order: DbOrder;
  items: OrderItemWithModifiers[];
  productVatRates: Map<string, number>;
  paymentMethod: "cash" | "card" | null;
  cashGiven?: number;
}

export async function printReceipt(payload: ReceiptPrintPayload): Promise<boolean> {
  const config = getPrinterConfig();
  if (!config) {
    console.log("[escpos] no PRINTER_IP configured, skipping real print");
    return false;
  }

  try {
    const net = await import("net");
    const socket = new net.Socket();

    await new Promise<void>((resolve, reject) => {
      socket.connect(config.port, config.ip, () => resolve());
      socket.on("error", reject);
      socket.setTimeout(5000, () => reject(new Error("Printer connect timeout")));
    });

    const buffer = buildReceiptBuffer(payload);
    await new Promise<void>((resolve, reject) => {
      socket.write(buffer, (err) => (err ? reject(err) : resolve()));
    });
    socket.end();
    return true;
  } catch (err) {
    console.error("[escpos] print failed:", err);
    return false;
  }
}

function buildReceiptBuffer(payload: ReceiptPrintPayload): Buffer {
  const printer = new Printer({ encoding: "GB18030" });
  const { order, items, productVatRates, paymentMethod, cashGiven } = payload;
  const now = new Date();
  const receiptNumber = generateReceiptNumber(now, order.id);

  printer.align("center");
  printer.setFontSize(2, 1);
  printer.writeln("MAYPH THALASSA");
  printer.setFontSize(1, 1);
  printer.writeln("Nikis 3, Kalamaria 55132");
  printer.writeln("AFM: 800474837");
  printer.writeln("");

  printer.align("left");
  printer.writeln(receiptNumber);
  printer.writeln(
    `${now.toLocaleDateString("el-GR")} ${now.toLocaleTimeString("el-GR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`,
  );
  printer.writeln(`Trapezi: ${order.table_number}`);
  printer.writeln("--------------------------------");

  for (const item of items) {
    const modTotal = item.order_item_modifiers.reduce((s, m) => s + m.price, 0);
    const lineTotal = (item.price + modTotal) * item.quantity;
    printer.writeln(
      `${item.quantity}x ${item.product_name.slice(0, 20).padEnd(20)} ${formatPrice(lineTotal).padStart(10)}`,
    );
    if (item.order_item_modifiers.length > 0) {
      printer.writeln(`   + ${item.order_item_modifiers.map((m) => m.name).join(", ")}`);
    }
  }

  printer.writeln("--------------------------------");

  const vatableItems = items.map((item) => ({
    price: item.price,
    quantity: item.quantity,
    modifiers: item.order_item_modifiers.map((m) => ({ price: m.price })),
    vatRate: productVatRates.get(item.product_id) ?? 24,
  }));
  const subtotal = calculateOrderSubtotal(vatableItems);
  const vatBreakdown = calculateVatBreakdown(vatableItems);

  for (const row of vatBreakdown) {
    printer.writeln(`Kath. ${row.rate}%: ${formatPrice(row.net).padStart(26)}`);
    printer.writeln(`FPA   ${row.rate}%: ${formatPrice(row.vat).padStart(26)}`);
  }
  printer.writeln("--------------------------------");
  printer.setFontSize(2, 2);
  printer.writeln(`TOTAL: ${formatPrice(subtotal).padStart(20)}`);
  printer.setFontSize(1, 1);

  if (paymentMethod) {
    printer.writeln(`Plirotmi: ${paymentMethod === "cash" ? "Metrita" : "Karta"}`);
    if (paymentMethod === "cash" && cashGiven != null) {
      printer.writeln(`Dothike: ${formatPrice(cashGiven)}`);
      printer.writeln(`Resta:   ${formatPrice(cashGiven - subtotal)}`);
    }
  }

  printer.writeln("");
  printer.align("center");
  printer.writeln("Eyxaristoume!");
  printer.writeln("");
  printer.cut();

  return printer.buffer;
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors. If `Printer` API differs, adjust to match actual `escpos-buffer` v4 API (check `node_modules/escpos-buffer/dist` for exports).

- [ ] **Step 3: Commit**

```bash
git add lib/printing/escpos-client.ts
git commit -m "feat(printing): add escpos thermal printer client with env-based config"
```

---

## Task 12: PDF Receipt Component

Server-renderable PDF receipt for fallback.

**Files:**
- Create: `lib/printing/pdf-receipt.tsx`

- [ ] **Step 1: Create PDF component**

Write `lib/printing/pdf-receipt.tsx`:

```tsx
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { DbOrder, OrderItemWithModifiers, PaymentMethod } from "@/lib/types/database";
import { calculateOrderSubtotal, calculateVatBreakdown } from "@/lib/pricing/order-totals";
import { generateReceiptNumber } from "@/lib/pricing/receipt-number";

export interface PdfReceiptProps {
  order: DbOrder;
  items: OrderItemWithModifiers[];
  productVatRates: Map<string, number>;
  paymentMethod: PaymentMethod | null;
  cashGiven?: number;
  issuedAt?: Date;
}

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 14, fontWeight: "bold", textAlign: "center" },
  subtitle: { textAlign: "center", fontSize: 9, marginBottom: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  separator: { borderBottom: "1pt dashed #666", marginVertical: 6 },
  total: { fontSize: 12, fontWeight: "bold", marginTop: 4 },
  small: { fontSize: 9, color: "#555" },
});

function formatPrice(n: number): string {
  return `${n.toFixed(2)} €`;
}

export function PdfReceipt({
  order,
  items,
  productVatRates,
  paymentMethod,
  cashGiven,
  issuedAt,
}: PdfReceiptProps) {
  const now = issuedAt ?? new Date();
  const receiptNumber = generateReceiptNumber(now, order.id);

  const vatableItems = items.map((item) => ({
    price: item.price,
    quantity: item.quantity,
    modifiers: item.order_item_modifiers.map((m) => ({ price: m.price })),
    vatRate: productVatRates.get(item.product_id) ?? 24,
  }));
  const subtotal = calculateOrderSubtotal(vatableItems);
  const vatBreakdown = calculateVatBreakdown(vatableItems);

  return (
    <Document>
      <Page size={[226, 842]} style={styles.page}>
        <Text style={styles.title}>ΜΑΥΡΗ ΘΑΛΑΣΣΑ</Text>
        <Text style={styles.subtitle}>Νίκης 3, Καλαμαριά 55132</Text>
        <Text style={styles.subtitle}>ΑΦΜ: 800474837</Text>

        <View style={styles.separator} />

        <View style={styles.row}>
          <Text>{receiptNumber}</Text>
          <Text>
            {now.toLocaleDateString("el-GR")} {now.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
        <View style={styles.row}>
          <Text>Τραπέζι: {order.table_number}</Text>
          <Text>#{order.id.slice(-6)}</Text>
        </View>

        <View style={styles.separator} />

        {items.map((item) => {
          const modTotal = item.order_item_modifiers.reduce((s, m) => s + m.price, 0);
          const lineTotal = (item.price + modTotal) * item.quantity;
          return (
            <View key={item.id}>
              <View style={styles.row}>
                <Text>
                  {item.quantity}× {item.product_name}
                </Text>
                <Text>{formatPrice(lineTotal)}</Text>
              </View>
              {item.order_item_modifiers.length > 0 && (
                <Text style={styles.small}>
                  + {item.order_item_modifiers.map((m) => m.name).join(", ")}
                </Text>
              )}
            </View>
          );
        })}

        <View style={styles.separator} />

        {vatBreakdown.map((row) => (
          <View key={row.rate} style={styles.row}>
            <Text>Καθαρή αξία {row.rate}%:</Text>
            <Text>{formatPrice(row.net)}</Text>
          </View>
        ))}
        {vatBreakdown.map((row) => (
          <View key={`vat-${row.rate}`} style={styles.row}>
            <Text>ΦΠΑ {row.rate}%:</Text>
            <Text>{formatPrice(row.vat)}</Text>
          </View>
        ))}

        <View style={styles.separator} />

        <View style={styles.row}>
          <Text style={styles.total}>ΣΥΝΟΛΟ</Text>
          <Text style={styles.total}>{formatPrice(subtotal)}</Text>
        </View>

        {paymentMethod && (
          <>
            <View style={styles.row}>
              <Text>Πληρωμή:</Text>
              <Text>{paymentMethod === "cash" ? "Μετρητά" : "Κάρτα"}</Text>
            </View>
            {paymentMethod === "cash" && cashGiven != null && (
              <>
                <View style={styles.row}>
                  <Text>Δόθηκαν:</Text>
                  <Text>{formatPrice(cashGiven)}</Text>
                </View>
                <View style={styles.row}>
                  <Text>Ρέστα:</Text>
                  <Text>{formatPrice(cashGiven - subtotal)}</Text>
                </View>
              </>
            )}
          </>
        )}

        <Text style={[styles.subtitle, { marginTop: 10 }]}>
          Ευχαριστούμε για την προτίμησή σας
        </Text>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/printing/pdf-receipt.tsx
git commit -m "feat(printing): add PDF receipt component for print fallback"
```

---

## Task 13: Print Receipt API Route

Endpoint that tries thermal printer first, falls back to PDF stream.

**Files:**
- Create: `app/api/print/receipt/route.tsx`

- [ ] **Step 1: Create route handler**

Write `app/api/print/receipt/route.tsx` (note `.tsx` extension because we render JSX for the PDF):

```ts
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrderById, getOrderItems } from "@/lib/queries/orders";
import { printReceipt, getPrinterConfig } from "@/lib/printing/escpos-client";
import { PdfReceipt } from "@/lib/printing/pdf-receipt";

const requestSchema = z.object({
  orderId: z.string().uuid(),
  paymentMethod: z.enum(["cash", "card"]).nullable().optional(),
  cashGiven: z.number().nonnegative().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }
  const { orderId, paymentMethod, cashGiven } = parsed.data;

  const order = await getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const items = await getOrderItems(orderId);

  // Load VAT rates per product in this order
  const productIds = Array.from(new Set(items.map((i) => i.product_id)));
  const supabase = await createServerSupabaseClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, vat_rate")
    .in("id", productIds);
  const productVatRates = new Map<string, number>();
  for (const p of products ?? []) {
    productVatRates.set(p.id, p.vat_rate);
  }

  // Try thermal printer first
  if (getPrinterConfig()) {
    const ok = await printReceipt({
      order,
      items,
      productVatRates,
      paymentMethod: paymentMethod ?? order.payment_method ?? null,
      cashGiven,
    });
    if (ok) {
      return NextResponse.json({ ok: true, method: "thermal" });
    }
    // fall through to PDF
  }

  // PDF fallback
  const pdfBuffer = await renderToBuffer(
    <PdfReceipt
      order={order}
      items={items}
      productVatRates={productVatRates}
      paymentMethod={paymentMethod ?? order.payment_method ?? null}
      cashGiven={cashGiven}
    />,
  );

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="receipt-${orderId.slice(-6)}.pdf"`,
    },
  });
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/print/receipt/route.tsx
git commit -m "feat(api): add /api/print/receipt with thermal→PDF fallback"
```

---

## Task 14: Extend Order Actions with Course Operations

Add `sendCourseToKitchen` and `advanceCourse` server actions.

**Files:**
- Modify: `lib/actions/orders.ts`
- Modify: `lib/validators/orders.ts`

- [ ] **Step 1: Add validator schemas**

Read current `lib/validators/orders.ts` then append:

```ts
import { z } from "zod";

export const sendCourseSchema = z.object({
  orderId: z.string().uuid(),
  courseNumber: z.number().int().min(1).max(10),
});
export type SendCourseInput = z.infer<typeof sendCourseSchema>;

export const advanceCourseSchema = z.object({
  orderId: z.string().uuid(),
  newActiveCourse: z.number().int().min(1).max(10),
});
export type AdvanceCourseInput = z.infer<typeof advanceCourseSchema>;
```

(If file already defines `z` import at top, reuse it — don't duplicate.)

- [ ] **Step 2: Add server actions**

Append to `lib/actions/orders.ts`:

```ts
import {
  sendCourseSchema,
  advanceCourseSchema,
  type SendCourseInput,
  type AdvanceCourseInput,
} from "@/lib/validators/orders";

export async function sendCourseToKitchen(
  input: SendCourseInput,
): Promise<ActionResult<{ count: number }>> {
  const parsed = sendCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("order_items")
    .update({ status: "preparing" })
    .eq("order_id", parsed.data.orderId)
    .eq("course", parsed.data.courseNumber)
    .eq("status", "pending")
    .select("id");

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/kitchen");
  revalidatePath("/orders");
  return { success: true, data: { count: data?.length ?? 0 } };
}

export async function advanceCourse(
  input: AdvanceCourseInput,
): Promise<ActionResult> {
  const parsed = advanceCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("orders")
    .update({ active_course: parsed.data.newActiveCourse })
    .eq("id", parsed.data.orderId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/orders");
  return { success: true };
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/orders.ts lib/validators/orders.ts
git commit -m "feat(orders): add course send-to-kitchen and advance actions"
```

---

## Task 15: Integrate Rich Components into OrderPanel

Replace the inline `ProductGrid` + order items loop with the new rich components, add course grouping + send-to-kitchen.

**Files:**
- Modify: `components/pos/order-panel.tsx`

- [ ] **Step 1: Read current OrderPanel**

```bash
wc -l components/pos/order-panel.tsx
```
Confirm ~380 lines.

- [ ] **Step 2: Replace OrderPanel with rich version**

Overwrite `components/pos/order-panel.tsx` entirely:

```tsx
"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ChefHat, UtensilsCrossed, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useRealtimeOrder } from "@/lib/hooks/use-realtime-orders";
import {
  createOrder,
  addOrderItem,
  updateItemQuantity,
  removeOrderItem,
  sendCourseToKitchen,
} from "@/lib/actions/orders";
import { updateTableStatus } from "@/lib/actions/tables";
import { calculateOrderSubtotal } from "@/lib/pricing/order-totals";
import { MenuItemCard } from "./menu-item-card";
import { OrderItemCard } from "./order-item-card";
import { CourseSeparator } from "./course-separator";
import { ModifierDialog, type ModifierSelection } from "./modifier-dialog";
import { PaymentDialog } from "./payment-dialog";
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

  const [modifierProduct, setModifierProduct] = useState<DbProduct | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const productVatRates = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) map.set(p.id, p.vat_rate);
    return map;
  }, [products]);

  const activeCourse = order?.active_course ?? 1;

  const ensureOrder = async (): Promise<string | null> => {
    if (order?.id) return order.id;
    const result = await createOrder(table.id, table.number);
    if (!result.success) {
      toast.error(result.error);
      return null;
    }
    const newId = result.data!.id;
    setOrder({
      id: newId,
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
    return newId;
  };

  const handleProductClick = (product: DbProduct) => {
    setModifierProduct(product);
  };

  const handleConfirmAdd = async (
    product: DbProduct,
    modifiers: ModifierSelection[],
    notes: string,
    course: number,
  ) => {
    const orderId = await ensureOrder();
    if (!orderId) return;

    const result = await addOrderItem({
      orderId,
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      station: product.station,
      course,
      notes: notes || undefined,
      modifiers: modifiers.length > 0 ? modifiers : undefined,
    });

    if (!result.success) {
      toast.error(result.error);
    }
  };

  const handleIncrement = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    startTransition(async () => {
      const r = await updateItemQuantity({
        itemId,
        quantity: item.quantity + 1,
      });
      if (!r.success) toast.error(r.error);
    });
  };

  const handleDecrement = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || item.quantity <= 1) return;
    startTransition(async () => {
      const r = await updateItemQuantity({
        itemId,
        quantity: item.quantity - 1,
      });
      if (!r.success) toast.error(r.error);
    });
  };

  const handleRemove = (itemId: string) => {
    startTransition(async () => {
      const r = await removeOrderItem(itemId);
      if (!r.success) toast.error(r.error);
    });
  };

  const handleSendCourse = (courseNumber: number) => {
    if (!order?.id) return;
    startTransition(async () => {
      const r = await sendCourseToKitchen({
        orderId: order.id,
        courseNumber,
      });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success(`Course ${courseNumber}: ${r.data?.count ?? 0} είδη στην κουζίνα`);
    });
  };

  const handleRequestBill = async () => {
    if (!order) return;
    await updateTableStatus(table.id, "bill-requested");
    setPaymentOpen(true);
  };

  const subtotal = calculateOrderSubtotal(
    items.map((i) => ({
      price: i.price,
      quantity: i.quantity,
      modifiers: i.order_item_modifiers.map((m) => ({ price: m.price })),
    })),
  );

  // Group items by course
  const itemsByCourse = useMemo(() => {
    const grouped = new Map<number, OrderItemWithModifiers[]>();
    for (const item of items) {
      const list = grouped.get(item.course) ?? [];
      list.push(item);
      grouped.set(item.course, list);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => a - b);
  }, [items]);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 lg:flex-row">
      {/* Left: Menu Browser */}
      <div className="flex-1 overflow-hidden rounded-lg border">
        <div className="flex items-center gap-2 border-b p-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/tables")}>
            <ArrowLeft className="size-4" />
          </Button>
          <h2 className="font-semibold">Τραπέζι {table.number}</h2>
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
                onClick={handleProductClick}
                isPending={isPending}
              />
            </TabsContent>
            {categories.map((cat) => (
              <TabsContent key={cat.id} value={cat.id} className="mt-3">
                <ProductGrid
                  products={products.filter((p) => p.category_id === cat.id)}
                  onClick={handleProductClick}
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
            {items.length > 0 && <Badge variant="secondary">{items.length}</Badge>}
          </h3>
        </div>

        <ScrollArea className="flex-1 p-3">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Επιλέξτε προϊόντα από το μενού
            </p>
          ) : (
            <div className="space-y-2">
              {itemsByCourse.map(([courseNumber, courseItems]) => {
                const hasPending = courseItems.some((i) => i.status === "pending");
                return (
                  <div key={courseNumber} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <CourseSeparator
                        courseNumber={courseNumber}
                        itemCount={courseItems.length}
                        isActive={courseNumber === activeCourse}
                      />
                      {hasPending && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendCourse(courseNumber)}
                          disabled={isPending}
                          className="shrink-0"
                        >
                          <ChefHat className="mr-1 size-3" />
                          Αποστολή
                        </Button>
                      )}
                    </div>
                    {courseItems.map((item) => (
                      <OrderItemCard
                        key={item.id}
                        item={item}
                        onIncrement={handleIncrement}
                        onDecrement={handleDecrement}
                        onRemove={handleRemove}
                        disabled={isPending}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {items.length > 0 && order && (
          <div className="border-t p-3 space-y-3">
            <Separator />
            <div className="flex justify-between text-sm">
              <span>Σύνολο</span>
              <span className="text-lg font-bold">{formatPrice(subtotal)}</span>
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

      {/* Modifier dialog */}
      <ModifierDialog
        product={modifierProduct}
        open={modifierProduct !== null}
        onOpenChange={(open) => !open && setModifierProduct(null)}
        onConfirm={handleConfirmAdd}
        defaultCourse={activeCourse}
      />

      {/* Payment dialog */}
      {order && (
        <PaymentDialog
          order={order}
          items={items}
          tableId={table.id}
          productVatRates={productVatRates}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          onComplete={() => router.push("/tables")}
        />
      )}
    </div>
  );
}

function ProductGrid({
  products,
  onClick,
  isPending,
}: {
  products: DbProduct[];
  onClick: (product: DbProduct) => void;
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
        <MenuItemCard
          key={product.id}
          product={product}
          onClick={onClick}
          disabled={isPending}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/pos/order-panel.tsx
git commit -m "feat(pos): integrate rich order panel with modifier dialog and course grouping"
```

---

## Task 16: Wire Print Button into CheckoutFlow

The full-page `/checkout` flow keeps working but now uses the shared `ReceiptPreview` and calls the print API.

**Files:**
- Modify: `components/pos/checkout-flow.tsx`

- [ ] **Step 1: Read current file to confirm structure**

Already read above (325 lines).

- [ ] **Step 2: Overwrite with updated version**

Write `components/pos/checkout-flow.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { calculateOrderSubtotal } from "@/lib/pricing/order-totals";
import { ReceiptPreview } from "./receipt-preview";
import type {
  DbTable,
  DbOrder,
  DbProduct,
  OrderItemWithModifiers,
  PaymentMethod,
} from "@/lib/types/database";

interface CheckoutFlowProps {
  table: DbTable;
  order: DbOrder;
  items: OrderItemWithModifiers[];
  products: DbProduct[];
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

type CheckoutStep = "payment" | "receipt";

export function CheckoutFlow({ table, order, items, products }: CheckoutFlowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<CheckoutStep>("payment");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [cashGiven, setCashGiven] = useState("");

  const productVatRates = new Map<string, number>();
  for (const p of products) productVatRates.set(p.id, p.vat_rate);

  const subtotal = calculateOrderSubtotal(
    items.map((i) => ({
      price: i.price,
      quantity: i.quantity,
      modifiers: i.order_item_modifiers.map((m) => ({ price: m.price })),
    })),
  );
  const cashGivenNum = parseFloat(cashGiven) || 0;
  const change = cashGivenNum - subtotal;

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

  const handlePrint = async () => {
    const response = await fetch("/api/print/receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: order.id,
        paymentMethod,
        cashGiven: paymentMethod === "cash" ? cashGivenNum : undefined,
      }),
    });
    if (!response.ok) {
      toast.error("Αποτυχία εκτύπωσης");
      return;
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/pdf")) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } else {
      toast.success("Εστάλη στον εκτυπωτή");
    }
  };

  if (step === "receipt") {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <ReceiptPreview
          order={order}
          items={items}
          productVatRates={productVatRates}
          paymentMethod={paymentMethod}
          cashGiven={paymentMethod === "cash" ? cashGivenNum : undefined}
        />

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handlePrint}>
            <Printer className="mr-2 size-4" />
            Εκτύπωση
          </Button>
          <Button className="flex-1" onClick={() => router.push("/tables")}>
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Σύνοψη παραγγελίας</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {items.map((item) => {
            const modTotal = item.order_item_modifiers.reduce((s, m) => s + m.price, 0);
            const lineTotal = (item.price + modTotal) * item.quantity;
            return (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.quantity}× {item.product_name}
                  {item.order_item_modifiers.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ( + {item.order_item_modifiers.map((m) => m.name).join(", ")})
                    </span>
                  )}
                </span>
                <span className="font-medium">{formatPrice(lineTotal)}</span>
              </div>
            );
          })}
          <Separator className="my-2" />
          <div className="flex justify-between font-bold text-lg">
            <span>Σύνολο</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
        </CardContent>
      </Card>

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
                  onClick={() => setCashGiven(subtotal.toFixed(2))}
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
                {formatPrice(subtotal)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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

- [ ] **Step 3: Update checkout page to pass products**

Read `app/(pos)/checkout/[tableId]/page.tsx` and ensure `products` are fetched and passed to `CheckoutFlow`. If the page file path differs, locate with:

```bash
find app -path "*checkout*page.tsx"
```

Example modification pattern (keep existing fetch, add products):

```tsx
import { getProducts } from "@/lib/queries/products";

// inside the async page component:
const [table, order, items, products] = await Promise.all([
  getTableById(params.tableId),
  getActiveOrderByTable(params.tableId),
  order ? getOrderItems(order.id) : [],
  getProducts(),
]);

// pass to component:
<CheckoutFlow table={table} order={order} items={items} products={products} />
```

Update the page file accordingly, matching its current async structure.

- [ ] **Step 4: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/pos/checkout-flow.tsx app/\(pos\)/checkout/
git commit -m "feat(checkout): use shared receipt preview and print API"
```

---

## Task 17: Manual Smoke Test

**Files:** none (testing only)

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```
Expected: server starts on http://localhost:3000 without errors.

- [ ] **Step 2: Test: create order with modifiers**

Navigate to `/tables`, click an available table → go to `/orders/<tableId>`. Click a product. Modifier dialog should open. Select 1-2 modifiers if available, add notes, pick course 2, click "Προσθήκη". Item should appear in order panel under "Course 2" section.

- [ ] **Step 3: Test: course grouping and send-to-kitchen**

Add a second item on course 1. Confirm two course sections visible with separators. Click "Αποστολή" on course 1 — items change status to "preparing" (amber), open `/kitchen` in another tab, confirm items appear there.

- [ ] **Step 4: Test: payment dialog**

Click "Λογαριασμός". Payment dialog opens. Pick "Μετρητά", enter cash amount, click "Ολοκλήρωση Πληρωμής". Receipt should render inline in dialog with VAT breakdown. Click "Εκτύπωση" — since no PRINTER_IP configured, PDF should open in new tab. Close.

- [ ] **Step 5: Test: realtime sync**

Open order page in two browser tabs. Add item in tab 1 — should appear in tab 2 within 1-2s.

- [ ] **Step 6: Test: build succeeds**

```bash
pnpm build
```
Expected: `Compiled successfully` with no errors.

- [ ] **Step 7: Run all tests**

```bash
pnpm test
```
Expected: all tests pass.

- [ ] **Step 8: Lint**

```bash
pnpm lint
```
Expected: no warnings.

---

## Task 18: Open PR and Merge

**Files:** none

- [ ] **Step 1: Push branch**

```bash
git push -u origin feat/restore-phase-1-pos-enrichment
```

- [ ] **Step 2: Verify Vercel preview**

Wait for Vercel preview URL (shown in GitHub PR checks) and manually test the preview site end-to-end — same checklist as Task 17 Steps 2-5.

- [ ] **Step 3: Create PR**

```bash
gh pr create --title "feat: Phase 1 — POS enrichment (modifiers, courses, payment, receipt)" --body "$(cat <<'EOF'
## Summary
- Restore rich modifier selection dialog from mock-era UX
- Add course grouping in order panel with send-to-kitchen per course
- New PaymentDialog component (modal flow) + richer ReceiptPreview with VAT breakdown
- Scaffold thermal printer (escpos-buffer) + PDF fallback (@react-pdf/renderer) via /api/print/receipt
- Extract order total/VAT calculations to pure testable functions
- Add Vitest toolchain

## Test plan
- [ ] Create order with modifiers, notes, custom course
- [ ] Course grouping renders with separators
- [ ] Send-to-kitchen updates item status to preparing
- [ ] Payment dialog completes cash/card payment
- [ ] Receipt preview shows correct VAT breakdown by rate
- [ ] Print button returns PDF when no thermal printer configured
- [ ] Realtime sync works across two tabs
- [ ] pnpm build succeeds
- [ ] pnpm test passes
- [ ] pnpm lint passes

Implements Phase 1 of docs/superpowers/specs/2026-04-17-ui-restoration-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: After approval, merge**

```bash
gh pr merge --squash --auto
```

- [ ] **Step 5: Update memory with phase progress**

After merge, update `C:\Users\ntont\.claude\projects\C--Users-ntont-Desktop-MAURI\memory\project_eatflow_status.md` with Phase 1 restoration complete.

---

## Completion Criteria

- [ ] All 18 tasks committed
- [ ] All tests pass (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Lint clean (`pnpm lint`)
- [ ] Manual smoke test checklist complete in both local dev AND Vercel preview
- [ ] PR merged to `main`
- [ ] Production URL verified: `https://mauri-thalasa.vercel.app`
- [ ] Memory file updated with progress

Next plan to write: `2026-04-??-phase2-floor-plan-plan.md` (Floor Plan Editor restoration).
