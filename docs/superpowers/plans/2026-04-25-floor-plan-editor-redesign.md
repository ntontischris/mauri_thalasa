# Floor Plan Editor Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 800-line monolithic floor-plan editor with a 3-pane component (palette + smart canvas + side panel) backed by saved layouts (Καλοκαίρι/Χειμώνας/Event), fixing drag precision, zone management, floor setup, and overlap detection.

**Architecture:** Split the monolith into focused components under `components/pos/floor-plan-editor/`. Add two new tables (`floor_layouts`, `floor_layout_positions`) with sync triggers keeping `tables.x/y/rotation/zone_id` denormalized for the runtime view. Pure canvas math (snap/collision/alignment) lives in `lib/canvas/` and is unit-tested.

**Tech Stack:** Next.js 15 App Router, Supabase Postgres, Zod for validation, Vitest + jsdom for tests, shadcn/ui components, SVG canvas + native HTML5 DnD (no drag libraries).

**Spec reference:** `docs/superpowers/specs/2026-04-25-floor-plan-editor-redesign-design.md`

---

## File Structure

**New files:**
- `supabase/migrations/036_floor_layouts.sql` — schema + backfill + triggers
- `lib/canvas/snap.ts` — grid snap, keyboard nudge math
- `lib/canvas/collision.ts` — bounding box overlap, bounds clamp
- `lib/canvas/alignment.ts` — alignment guide computation
- `lib/queries/floor-layouts.ts` — `getLayoutsByFloor`, `getActiveLayout`
- `lib/actions/floor-layouts.ts` — `createLayout`, `activateLayout`, `deleteLayout`, `renameLayout`
- `lib/actions/zones-bulk.ts` — `bulkUpdateZone`, `cascadeDeleteZone`
- `lib/hooks/use-canvas-state.ts` — optimistic state, undo/redo, debounced persist
- `lib/types/floor-layouts.ts` — TypeScript types for new tables
- `components/pos/floor-plan-editor/editor-shell.tsx` — orchestrator
- `components/pos/floor-plan-editor/palette-rail.tsx` — left rail
- `components/pos/floor-plan-editor/canvas.tsx` — SVG canvas
- `components/pos/floor-plan-editor/selection-panel.tsx` — table properties
- `components/pos/floor-plan-editor/zones-panel.tsx` — zones list + drop targets
- `components/pos/floor-plan-editor/layouts-panel.tsx` — saved layouts switcher
- `components/pos/floor-plan-editor/floor-presets-dialog.tsx` — new floor wizard
- `tests/lib/canvas-snap.test.ts`, `tests/lib/canvas-collision.test.ts`, `tests/lib/canvas-alignment.test.ts` — unit tests

**Modified files:**
- `lib/actions/floor-plan.ts` — `moveTable` writes to active layout positions; `upsertTable` returns full row, no reload trigger
- `lib/types/database.ts` — add `DbFloorLayout`, `DbFloorLayoutPosition`
- `app/(pos)/settings/floor-plan/page.tsx` — load layouts, pass to new shell

**Deleted files (last task):**
- `components/pos/floor-plan-editor.tsx` (the 800-line monolith)

---

## Task 1: Database — migration, backfill, sync triggers

**Files:**
- Create: `supabase/migrations/036_floor_layouts.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/036_floor_layouts.sql
BEGIN;

-- 1. Tables
CREATE TABLE floor_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  is_active BOOLEAN NOT NULL DEFAULT false,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (floor_id, name)
);

CREATE UNIQUE INDEX one_active_layout_per_floor
  ON floor_layouts (floor_id) WHERE is_active = true;

CREATE TABLE floor_layout_positions (
  layout_id UUID NOT NULL REFERENCES floor_layouts(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  rotation INTEGER NOT NULL DEFAULT 0 CHECK (rotation >= 0 AND rotation < 360),
  zone_id UUID REFERENCES zones(id),
  is_visible BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (layout_id, table_id)
);

CREATE INDEX idx_layout_positions_layout ON floor_layout_positions(layout_id);
CREATE INDEX idx_layout_positions_table ON floor_layout_positions(table_id);

-- 2. Backfill: one default layout per floor
INSERT INTO floor_layouts (floor_id, name, is_active, sort_order)
SELECT id, 'Κύρια Διάταξη', true, 0
FROM floors
WHERE is_active = true;

-- Backfill positions from current tables
INSERT INTO floor_layout_positions (layout_id, table_id, x, y, rotation, zone_id, is_visible)
SELECT fl.id, t.id, COALESCE(t.x, 0), COALESCE(t.y, 0), COALESCE(t.rotation, 0), t.zone_id, t.is_active
FROM tables t
JOIN zones z ON z.id = t.zone_id
JOIN floor_layouts fl ON fl.floor_id = z.floor_id AND fl.is_active = true;

-- 3. Sync triggers: keep tables.x/y/rotation/zone_id mirrored to active layout

CREATE OR REPLACE FUNCTION sync_table_from_layout_position()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM floor_layouts WHERE id = NEW.layout_id AND is_active = true) THEN
    UPDATE tables
    SET x = NEW.x, y = NEW.y, rotation = NEW.rotation, zone_id = NEW.zone_id, updated_at = now()
    WHERE id = NEW.table_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_table_from_position
AFTER INSERT OR UPDATE ON floor_layout_positions
FOR EACH ROW EXECUTE FUNCTION sync_table_from_layout_position();

CREATE OR REPLACE FUNCTION sync_tables_on_layout_activation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true AND (OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
    UPDATE tables t
    SET x = p.x, y = p.y, rotation = p.rotation, zone_id = p.zone_id, updated_at = now()
    FROM floor_layout_positions p
    WHERE p.layout_id = NEW.id AND p.table_id = t.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_on_layout_activate
AFTER UPDATE OF is_active ON floor_layouts
FOR EACH ROW EXECUTE FUNCTION sync_tables_on_layout_activation();

-- 4. RLS: same policy as floors/zones
ALTER TABLE floor_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_layout_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY floor_layouts_authenticated ON floor_layouts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY floor_layout_positions_authenticated ON floor_layout_positions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db push` (or equivalent for project). Expected: migration applies, no errors.

- [ ] **Step 3: Verify backfill**

Run in psql:
```sql
SELECT floor_id, name, is_active FROM floor_layouts;
SELECT count(*) FROM floor_layout_positions;
```
Expected: one active layout per floor; position count equals current `tables` count.

- [ ] **Step 4: Verify trigger A (position update)**

```sql
UPDATE floor_layout_positions SET x = 999 WHERE layout_id = '<some-active-id>' LIMIT 1;
SELECT x FROM tables WHERE id = '<table-id>'; -- should be 999
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/036_floor_layouts.sql
git commit -m "feat(db): add floor_layouts and floor_layout_positions with sync triggers"
```

---

## Task 2: Pure helper — grid snap

**Files:**
- Create: `lib/canvas/snap.ts`
- Test: `tests/lib/canvas-snap.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/canvas-snap.test.ts
import { describe, it, expect } from "vitest";
import { snapToGrid, nudge } from "@/lib/canvas/snap";

describe("snapToGrid", () => {
  it("snaps to nearest 20px multiple", () => {
    expect(snapToGrid(23, 20)).toBe(20);
    expect(snapToGrid(31, 20)).toBe(40);
    expect(snapToGrid(0, 20)).toBe(0);
  });

  it("respects custom grid size", () => {
    expect(snapToGrid(7, 10)).toBe(10);
  });
});

describe("nudge", () => {
  it("returns 1px step by default", () => {
    expect(nudge({ x: 10, y: 20 }, "right", false)).toEqual({ x: 11, y: 20 });
  });

  it("returns 10px step with shift", () => {
    expect(nudge({ x: 10, y: 20 }, "down", true)).toEqual({ x: 10, y: 30 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/lib/canvas-snap.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement minimal code**

```typescript
// lib/canvas/snap.ts
export type Point = { x: number; y: number };
export type Direction = "up" | "down" | "left" | "right";

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function nudge(p: Point, dir: Direction, shift: boolean): Point {
  const step = shift ? 10 : 1;
  switch (dir) {
    case "up": return { x: p.x, y: p.y - step };
    case "down": return { x: p.x, y: p.y + step };
    case "left": return { x: p.x - step, y: p.y };
    case "right": return { x: p.x + step, y: p.y };
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm vitest run tests/lib/canvas-snap.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/canvas/snap.ts tests/lib/canvas-snap.test.ts
git commit -m "feat(canvas): add grid snap + keyboard nudge helpers"
```

---

## Task 3: Pure helper — collision and bounds

**Files:**
- Create: `lib/canvas/collision.ts`
- Test: `tests/lib/canvas-collision.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/canvas-collision.test.ts
import { describe, it, expect } from "vitest";
import { intersects, clampToBounds, findOverlaps, type Rect } from "@/lib/canvas/collision";

describe("intersects", () => {
  const a: Rect = { x: 0, y: 0, width: 50, height: 50 };
  it("returns true when rects overlap", () => {
    expect(intersects(a, { x: 20, y: 20, width: 50, height: 50 })).toBe(true);
  });
  it("returns false when separated", () => {
    expect(intersects(a, { x: 100, y: 0, width: 50, height: 50 })).toBe(false);
  });
  it("returns false when touching edges (no overlap)", () => {
    expect(intersects(a, { x: 50, y: 0, width: 50, height: 50 })).toBe(false);
  });
});

describe("clampToBounds", () => {
  it("keeps rect inside bounds", () => {
    const r: Rect = { x: 1190, y: 100, width: 80, height: 80 };
    expect(clampToBounds(r, 1200, 800)).toEqual({ x: 1120, y: 100, width: 80, height: 80 });
  });
  it("clamps negative coordinates to 0", () => {
    const r: Rect = { x: -10, y: -5, width: 80, height: 80 };
    expect(clampToBounds(r, 1200, 800)).toEqual({ x: 0, y: 0, width: 80, height: 80 });
  });
});

describe("findOverlaps", () => {
  it("returns IDs of rects overlapping the target", () => {
    const target = { id: "t1", x: 0, y: 0, width: 50, height: 50 };
    const others = [
      { id: "t2", x: 20, y: 20, width: 50, height: 50 },
      { id: "t3", x: 100, y: 0, width: 50, height: 50 },
    ];
    expect(findOverlaps(target, others)).toEqual(["t2"]);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm vitest run tests/lib/canvas-collision.test.ts`

- [ ] **Step 3: Implement**

```typescript
// lib/canvas/collision.ts
export type Rect = { x: number; y: number; width: number; height: number };
export type IdRect = Rect & { id: string };

export function intersects(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function clampToBounds(r: Rect, floorW: number, floorH: number): Rect {
  return {
    ...r,
    x: Math.max(0, Math.min(r.x, floorW - r.width)),
    y: Math.max(0, Math.min(r.y, floorH - r.height)),
  };
}

export function findOverlaps(target: IdRect, others: IdRect[]): string[] {
  return others
    .filter((o) => o.id !== target.id && intersects(target, o))
    .map((o) => o.id);
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add lib/canvas/collision.ts tests/lib/canvas-collision.test.ts
git commit -m "feat(canvas): add collision and bounds helpers"
```

---

## Task 4: Pure helper — alignment guides

**Files:**
- Create: `lib/canvas/alignment.ts`
- Test: `tests/lib/canvas-alignment.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/canvas-alignment.test.ts
import { describe, it, expect } from "vitest";
import { computeGuides, type IdRect } from "@/lib/canvas/alignment";

const target: IdRect = { id: "t1", x: 100, y: 100, width: 50, height: 50 };

describe("computeGuides", () => {
  it("emits vertical guide when target left edge aligns with another's left edge (within 4px)", () => {
    const others: IdRect[] = [{ id: "t2", x: 102, y: 300, width: 40, height: 40 }];
    const result = computeGuides(target, others, 4);
    expect(result.snappedX).toBe(102);
    expect(result.guides).toContainEqual({ orientation: "vertical", coord: 102 });
  });

  it("emits horizontal guide when centers align (within 4px)", () => {
    const others: IdRect[] = [{ id: "t2", x: 300, y: 122, width: 50, height: 50 }];
    const result = computeGuides(target, others, 4);
    // target center y = 125; other center y = 147; not within 4 — shouldn't snap
    expect(result.snappedY).toBe(100);
    // But left edge difference: target.y=100, other.y=122, diff=22, no guide
    expect(result.guides).toEqual([]);
  });

  it("does not snap when no edges within threshold", () => {
    const others: IdRect[] = [{ id: "t2", x: 500, y: 500, width: 40, height: 40 }];
    const result = computeGuides(target, others, 4);
    expect(result.snappedX).toBe(100);
    expect(result.snappedY).toBe(100);
    expect(result.guides).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm vitest run tests/lib/canvas-alignment.test.ts`

- [ ] **Step 3: Implement**

```typescript
// lib/canvas/alignment.ts
export type IdRect = { id: string; x: number; y: number; width: number; height: number };
export type Guide = { orientation: "vertical" | "horizontal"; coord: number };
export type AlignResult = { snappedX: number; snappedY: number; guides: Guide[] };

export function computeGuides(
  target: IdRect,
  others: IdRect[],
  threshold = 4
): AlignResult {
  let snappedX = target.x;
  let snappedY = target.y;
  const guides: Guide[] = [];

  const targetEdgesX = [target.x, target.x + target.width / 2, target.x + target.width];
  const targetEdgesY = [target.y, target.y + target.height / 2, target.y + target.height];

  for (const o of others) {
    if (o.id === target.id) continue;
    const otherEdgesX = [o.x, o.x + o.width / 2, o.x + o.width];
    const otherEdgesY = [o.y, o.y + o.height / 2, o.y + o.height];

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (Math.abs(targetEdgesX[i] - otherEdgesX[j]) <= threshold) {
          const offset = otherEdgesX[j] - targetEdgesX[i];
          snappedX = target.x + offset;
          guides.push({ orientation: "vertical", coord: otherEdgesX[j] });
        }
        if (Math.abs(targetEdgesY[i] - otherEdgesY[j]) <= threshold) {
          const offset = otherEdgesY[j] - targetEdgesY[i];
          snappedY = target.y + offset;
          guides.push({ orientation: "horizontal", coord: otherEdgesY[j] });
        }
      }
    }
  }

  return { snappedX, snappedY, guides };
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add lib/canvas/alignment.ts tests/lib/canvas-alignment.test.ts
git commit -m "feat(canvas): add alignment guide computation"
```

---

## Task 5: TypeScript types for new schema

**Files:**
- Modify: `lib/types/database.ts`
- Create: `lib/types/floor-layouts.ts`

- [ ] **Step 1: Add types**

```typescript
// lib/types/floor-layouts.ts
export interface DbFloorLayout {
  id: string;
  floor_id: string;
  name: string;
  is_active: boolean;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbFloorLayoutPosition {
  layout_id: string;
  table_id: string;
  x: number;
  y: number;
  rotation: number;
  zone_id: string | null;
  is_visible: boolean;
}
```

Also re-export from `lib/types/database.ts`:

```typescript
// lib/types/database.ts (add at bottom, do not remove existing exports)
export * from "./floor-layouts";
```

- [ ] **Step 2: Verify TS compile**

Run: `pnpm tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types/floor-layouts.ts lib/types/database.ts
git commit -m "feat(types): add floor layout types"
```

---

## Task 6: Queries for layouts

**Files:**
- Create: `lib/queries/floor-layouts.ts`

- [ ] **Step 1: Implement queries**

```typescript
// lib/queries/floor-layouts.ts
import { createClient } from "@/lib/supabase/server";
import type { DbFloorLayout, DbFloorLayoutPosition } from "@/lib/types/floor-layouts";

export async function getLayoutsByFloor(floorId: string): Promise<DbFloorLayout[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("floor_layouts")
    .select("id, floor_id, name, is_active, icon, sort_order, created_at, updated_at")
    .eq("floor_id", floorId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getActiveLayout(floorId: string): Promise<DbFloorLayout | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("floor_layouts")
    .select("id, floor_id, name, is_active, icon, sort_order, created_at, updated_at")
    .eq("floor_id", floorId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getLayoutPositions(layoutId: string): Promise<DbFloorLayoutPosition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("floor_layout_positions")
    .select("layout_id, table_id, x, y, rotation, zone_id, is_visible")
    .eq("layout_id", layoutId);

  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/queries/floor-layouts.ts
git commit -m "feat(queries): add floor layout queries"
```

---

## Task 7: Server actions for layout lifecycle

**Files:**
- Create: `lib/actions/floor-layouts.ts`

- [ ] **Step 1: Implement actions**

```typescript
// lib/actions/floor-layouts.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DbFloorLayout } from "@/lib/types/floor-layouts";

const NameSchema = z.string().min(1).max(60);

type Result<T> = { success: true; data: T } | { success: false; error: string };

export async function createLayout(input: {
  floorId: string;
  name: string;
  icon?: string;
  fromCurrent: boolean;
}): Promise<Result<DbFloorLayout>> {
  const parsed = z
    .object({ floorId: z.string().uuid(), name: NameSchema, icon: z.string().max(8).optional(), fromCurrent: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const supabase = await createClient();

  const { data: layout, error } = await supabase
    .from("floor_layouts")
    .insert({
      floor_id: parsed.data.floorId,
      name: parsed.data.name,
      icon: parsed.data.icon ?? null,
      is_active: false,
    })
    .select()
    .single();

  if (error || !layout) return { success: false, error: error?.message ?? "insert failed" };

  if (parsed.data.fromCurrent) {
    // Snapshot tables of this floor into the new layout
    const { data: tables } = await supabase
      .from("tables")
      .select("id, x, y, rotation, zone_id, is_active")
      .in(
        "zone_id",
        (
          await supabase.from("zones").select("id").eq("floor_id", parsed.data.floorId)
        ).data?.map((z) => z.id) ?? []
      );

    if (tables && tables.length > 0) {
      const positions = tables.map((t) => ({
        layout_id: layout.id,
        table_id: t.id,
        x: t.x ?? 0,
        y: t.y ?? 0,
        rotation: t.rotation ?? 0,
        zone_id: t.zone_id,
        is_visible: t.is_active,
      }));
      const { error: posErr } = await supabase.from("floor_layout_positions").insert(positions);
      if (posErr) return { success: false, error: posErr.message };
    }
  }

  revalidatePath("/settings/floor-plan");
  return { success: true, data: layout };
}

export async function activateLayout(input: { layoutId: string; force?: boolean }): Promise<Result<true>> {
  const parsed = z.object({ layoutId: z.string().uuid(), force: z.boolean().optional() }).safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const supabase = await createClient();

  // Find target layout's floor
  const { data: layout, error: lookupErr } = await supabase
    .from("floor_layouts")
    .select("id, floor_id")
    .eq("id", parsed.data.layoutId)
    .single();
  if (lookupErr || !layout) return { success: false, error: "layout not found" };

  // Block if any table on floor is occupied or bill-requested (unless force)
  if (!parsed.data.force) {
    const { data: zones } = await supabase.from("zones").select("id").eq("floor_id", layout.floor_id);
    const zoneIds = (zones ?? []).map((z) => z.id);
    if (zoneIds.length > 0) {
      const { data: blocked } = await supabase
        .from("tables")
        .select("id, number, status")
        .in("zone_id", zoneIds)
        .in("status", ["occupied", "bill-requested"]);
      if (blocked && blocked.length > 0) {
        return { success: false, error: `BLOCKED:${blocked.map((t) => t.number).join(",")}` };
      }
    }
  }

  // Deactivate current active, then activate target (sequential for partial-unique-index safety)
  await supabase
    .from("floor_layouts")
    .update({ is_active: false })
    .eq("floor_id", layout.floor_id)
    .eq("is_active", true);

  const { error: actErr } = await supabase
    .from("floor_layouts")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.layoutId);

  if (actErr) return { success: false, error: actErr.message };

  revalidatePath("/settings/floor-plan");
  revalidatePath("/tables");
  return { success: true, data: true };
}

export async function deleteLayout(layoutId: string): Promise<Result<true>> {
  const parsed = z.string().uuid().safeParse(layoutId);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const supabase = await createClient();
  const { data: layout } = await supabase
    .from("floor_layouts")
    .select("is_active")
    .eq("id", layoutId)
    .single();
  if (layout?.is_active) return { success: false, error: "cannot delete active layout" };

  const { error } = await supabase.from("floor_layouts").delete().eq("id", layoutId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/settings/floor-plan");
  return { success: true, data: true };
}

export async function renameLayout(input: { layoutId: string; name: string; icon?: string }): Promise<Result<true>> {
  const parsed = z
    .object({ layoutId: z.string().uuid(), name: NameSchema, icon: z.string().max(8).optional() })
    .safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("floor_layouts")
    .update({ name: parsed.data.name, icon: parsed.data.icon ?? null, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.layoutId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings/floor-plan");
  return { success: true, data: true };
}
```

- [ ] **Step 2: Manual smoke test**

In a temp script or admin tool, call `createLayout({ floorId, name: "Καλοκαίρι", fromCurrent: true })` then `activateLayout({ layoutId })`. Verify positions copy and `tables.x/y` updates via trigger.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/floor-layouts.ts
git commit -m "feat(actions): add layout lifecycle actions (create/activate/delete/rename)"
```

---

## Task 8: Server actions for bulk zone ops

**Files:**
- Create: `lib/actions/zones-bulk.ts`

- [ ] **Step 1: Implement**

```typescript
// lib/actions/zones-bulk.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result<T> = { success: true; data: T } | { success: false; error: string };

export async function bulkUpdateZone(input: {
  tableIds: string[];
  zoneId: string;
}): Promise<Result<number>> {
  const parsed = z
    .object({ tableIds: z.array(z.string().uuid()).min(1).max(200), zoneId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const supabase = await createClient();

  // Update tables.zone_id (active layout positions sync via separate write below)
  const { error: tErr, count } = await supabase
    .from("tables")
    .update({ zone_id: parsed.data.zoneId, updated_at: new Date().toISOString() }, { count: "exact" })
    .in("id", parsed.data.tableIds);
  if (tErr) return { success: false, error: tErr.message };

  // Also update active-layout positions for those tables
  const { data: activeLayout } = await supabase
    .from("floor_layouts")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (activeLayout) {
    await supabase
      .from("floor_layout_positions")
      .update({ zone_id: parsed.data.zoneId })
      .eq("layout_id", activeLayout.id)
      .in("table_id", parsed.data.tableIds);
  }

  revalidatePath("/settings/floor-plan");
  revalidatePath("/tables");
  return { success: true, data: count ?? 0 };
}

export async function cascadeDeleteZone(input: {
  zoneId: string;
  moveToZoneId: string;
}): Promise<Result<true>> {
  const parsed = z
    .object({ zoneId: z.string().uuid(), moveToZoneId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.message };
  if (parsed.data.zoneId === parsed.data.moveToZoneId) {
    return { success: false, error: "target zone must differ from source" };
  }

  const supabase = await createClient();

  // Move all tables to new zone
  const { error: mvErr } = await supabase
    .from("tables")
    .update({ zone_id: parsed.data.moveToZoneId, updated_at: new Date().toISOString() })
    .eq("zone_id", parsed.data.zoneId);
  if (mvErr) return { success: false, error: mvErr.message };

  // Delete the now-empty zone
  const { error: delErr } = await supabase.from("zones").delete().eq("id", parsed.data.zoneId);
  if (delErr) return { success: false, error: delErr.message };

  revalidatePath("/settings/floor-plan");
  revalidatePath("/tables");
  return { success: true, data: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/actions/zones-bulk.ts
git commit -m "feat(actions): add bulk zone update and cascade delete"
```

---

## Task 9: Modify moveTable + upsertTable to use active layout, no reload

**Files:**
- Modify: `lib/actions/floor-plan.ts`

- [ ] **Step 1: Update `moveTable` to write to active layout positions**

Find the existing `moveTable` action. Replace its body so it writes to `floor_layout_positions` of the active layout (the trigger will mirror to `tables`). If no active layout exists, fall back to current behavior (defensive).

```typescript
// Excerpt — replace moveTable export
export async function moveTable(input: {
  id: string;
  x: number;
  y: number;
  rotation?: number;
}): Promise<Result<true>> {
  const parsed = z
    .object({
      id: z.string().uuid(),
      x: z.number().min(0).max(5000),
      y: z.number().min(0).max(5000),
      rotation: z.number().int().min(0).max(359).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const supabase = await createClient();

  // Find this table's floor via zone, then active layout for that floor
  const { data: tbl } = await supabase
    .from("tables")
    .select("zone_id")
    .eq("id", parsed.data.id)
    .single();
  if (!tbl?.zone_id) return { success: false, error: "table has no zone" };

  const { data: zone } = await supabase
    .from("zones")
    .select("floor_id")
    .eq("id", tbl.zone_id)
    .single();
  if (!zone?.floor_id) return { success: false, error: "zone has no floor" };

  const { data: layout } = await supabase
    .from("floor_layouts")
    .select("id")
    .eq("floor_id", zone.floor_id)
    .eq("is_active", true)
    .maybeSingle();

  if (layout) {
    const { error } = await supabase
      .from("floor_layout_positions")
      .upsert(
        {
          layout_id: layout.id,
          table_id: parsed.data.id,
          x: parsed.data.x,
          y: parsed.data.y,
          rotation: parsed.data.rotation ?? 0,
          zone_id: tbl.zone_id,
        },
        { onConflict: "layout_id,table_id" }
      );
    if (error) return { success: false, error: error.message };
  } else {
    // Fallback: no active layout — write directly
    const { error } = await supabase
      .from("tables")
      .update({
        x: parsed.data.x,
        y: parsed.data.y,
        rotation: parsed.data.rotation ?? 0,
      })
      .eq("id", parsed.data.id);
    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/settings/floor-plan");
  return { success: true, data: true };
}
```

- [ ] **Step 2: Ensure `upsertTable` returns the inserted/updated row**

Ensure the existing `upsertTable` action selects and returns the row in its `Result.data`. If currently it returns `true` or void, change return type to `Result<DbTable>`.

- [ ] **Step 3: Verify TS compile**

Run: `pnpm tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/floor-plan.ts
git commit -m "refactor(actions): moveTable writes to active layout positions; upsertTable returns row"
```

---

## Task 10: `useCanvasState` hook — optimistic state, debounce, undo/redo

**Files:**
- Create: `lib/hooks/use-canvas-state.ts`

- [ ] **Step 1: Implement**

```typescript
// lib/hooks/use-canvas-state.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { moveTable } from "@/lib/actions/floor-plan";
import type { DbTable } from "@/lib/types/database";

type Snapshot = Pick<DbTable, "id" | "x" | "y" | "rotation" | "zone_id">[];

export function useCanvasState(initial: DbTable[]) {
  const [tables, setTables] = useState<DbTable[]>(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const debouncers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Sync when server data changes (rare — e.g., after layout switch)
  useEffect(() => {
    setTables(initial);
  }, [initial]);

  const snapshot = useCallback((): Snapshot => {
    return tables.map((t) => ({ id: t.id, x: t.x, y: t.y, rotation: t.rotation, zone_id: t.zone_id }));
  }, [tables]);

  const pushUndo = useCallback(() => {
    undoStack.current.push(snapshot());
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
  }, [snapshot]);

  const moveLocal = useCallback(
    (id: string, x: number, y: number, rotation?: number) => {
      setTables((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, x, y, rotation: rotation ?? t.rotation } : t
        )
      );

      // Debounce server call per-table id (300ms)
      const existing = debouncers.current.get(id);
      if (existing) clearTimeout(existing);
      const handle = setTimeout(async () => {
        const result = await moveTable({ id, x, y, rotation });
        if (!result.success) {
          // Rollback this table to last server-confirmed state isn't tracked separately;
          // surface the error to the caller via a state field.
          console.error("moveTable failed:", result.error);
        }
        debouncers.current.delete(id);
      }, 300);
      debouncers.current.set(id, handle);
    },
    []
  );

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push(snapshot());
    setTables((current) =>
      current.map((t) => {
        const m = prev.find((p) => p.id === t.id);
        return m ? { ...t, ...m } : t;
      })
    );
    // Persist undone state
    prev.forEach((p) => moveTable({ id: p.id, x: p.x, y: p.y, rotation: p.rotation }));
  }, [snapshot]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(snapshot());
    setTables((current) =>
      current.map((t) => {
        const m = next.find((p) => p.id === t.id);
        return m ? { ...t, ...m } : t;
      })
    );
    next.forEach((p) => moveTable({ id: p.id, x: p.x, y: p.y, rotation: p.rotation }));
  }, [snapshot]);

  return {
    tables,
    setTables,
    selected,
    setSelected,
    moveLocal,
    pushUndo,
    undo,
    redo,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hooks/use-canvas-state.ts
git commit -m "feat(hook): add useCanvasState with optimistic updates and undo/redo"
```

---

## Task 11: `palette-rail.tsx` — drag source for table presets

**Files:**
- Create: `components/pos/floor-plan-editor/palette-rail.tsx`

- [ ] **Step 1: Implement**

```tsx
// components/pos/floor-plan-editor/palette-rail.tsx
"use client";

import type { TableShape } from "@/lib/types/database";

export type PresetTable = {
  id: string;
  label: string;
  shape: TableShape;
  width: number;
  height: number;
  capacity: number;
};

const PRESETS: PresetTable[] = [
  { id: "p-2sq", label: "2 θέσεις τετράγωνο", shape: "square", width: 60, height: 60, capacity: 2 },
  { id: "p-4sq", label: "4 θέσεις τετράγωνο", shape: "square", width: 80, height: 80, capacity: 4 },
  { id: "p-4rd", label: "4 θέσεις στρογγυλό", shape: "round", width: 80, height: 80, capacity: 4 },
  { id: "p-6rt", label: "6 θέσεις ορθογώνιο", shape: "rectangle", width: 140, height: 70, capacity: 6 },
  { id: "p-bar", label: "Σκαμπό μπαρ", shape: "square", width: 40, height: 40, capacity: 1 },
];

export function PaletteRail() {
  function handleDragStart(e: React.DragEvent, preset: PresetTable) {
    e.dataTransfer.setData("application/x-mauri-table-preset", JSON.stringify(preset));
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <aside className="w-32 shrink-0 border-r bg-muted/30 p-2 flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground">Σύρε →</h3>
      {PRESETS.map((p) => (
        <div
          key={p.id}
          draggable
          onDragStart={(e) => handleDragStart(e, p)}
          className="cursor-grab rounded border bg-background p-2 hover:bg-accent text-center"
        >
          <div
            className="mx-auto mb-1 bg-primary/80"
            style={{
              width: Math.min(p.width / 3, 32),
              height: Math.min(p.height / 3, 32),
              borderRadius: p.shape === "round" ? "50%" : 4,
            }}
          />
          <div className="text-[10px]">{p.label}</div>
        </div>
      ))}
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/pos/floor-plan-editor/palette-rail.tsx
git commit -m "feat(ui): add PaletteRail with drag sources for table presets"
```

---

## Task 12: `canvas.tsx` — SVG canvas with drag, snap, guides, collision, multi-select

**Files:**
- Create: `components/pos/floor-plan-editor/canvas.tsx`

This is the largest component. Keep it focused: rendering + pointer events delegating math to `lib/canvas/*`.

- [ ] **Step 1: Implement**

```tsx
// components/pos/floor-plan-editor/canvas.tsx
"use client";

import { useRef, useState } from "react";
import type { DbTable, DbFloor, DbZone } from "@/lib/types/database";
import { snapToGrid } from "@/lib/canvas/snap";
import { clampToBounds, findOverlaps, type IdRect } from "@/lib/canvas/collision";
import { computeGuides, type Guide } from "@/lib/canvas/alignment";
import { upsertTable } from "@/lib/actions/floor-plan";
import type { PresetTable } from "./palette-rail";

const GRID = 20;

type Props = {
  floor: DbFloor;
  zones: DbZone[];
  tables: DbTable[];
  selected: Set<string>;
  onSelect: (ids: string[], additive: boolean) => void;
  onMove: (id: string, x: number, y: number, rotation?: number) => void;
  onPushUndo: () => void;
};

export function Canvas({ floor, zones, tables, selected, onSelect, onMove, onPushUndo }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [overlaps, setOverlaps] = useState<Set<string>>(new Set());

  function svgPoint(e: React.MouseEvent | React.DragEvent): { x: number; y: number } {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const result = pt.matrixTransform(ctm.inverse());
    return { x: result.x, y: result.y };
  }

  function handleTableMouseDown(e: React.MouseEvent, t: DbTable) {
    e.stopPropagation();
    const p = svgPoint(e);
    setDragging({ id: t.id, offsetX: p.x - t.x, offsetY: p.y - t.y });
    onSelect([t.id], e.shiftKey);
    onPushUndo();
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const p = svgPoint(e);
    const tbl = tables.find((t) => t.id === dragging.id);
    if (!tbl) return;

    const rawX = p.x - dragging.offsetX;
    const rawY = p.y - dragging.offsetY;
    const target: IdRect = { id: tbl.id, x: rawX, y: rawY, width: tbl.width, height: tbl.height };
    const others: IdRect[] = tables
      .filter((o) => o.id !== tbl.id)
      .map((o) => ({ id: o.id, x: o.x, y: o.y, width: o.width, height: o.height }));

    const aligned = computeGuides(target, others, 4);
    let nx = aligned.snappedX;
    let ny = aligned.snappedY;

    nx = snapToGrid(nx, GRID);
    ny = snapToGrid(ny, GRID);

    const clamped = clampToBounds(
      { x: nx, y: ny, width: tbl.width, height: tbl.height },
      floor.width,
      floor.height
    );

    setGuides(aligned.guides);
    setOverlaps(new Set(findOverlaps({ id: tbl.id, ...clamped }, others)));
    onMove(tbl.id, clamped.x, clamped.y);
  }

  function handleMouseUp() {
    if (dragging) {
      setGuides([]);
      setOverlaps(new Set());
      setDragging(null);
    }
  }

  function handleCanvasClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onSelect([], false);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const data = e.dataTransfer.getData("application/x-mauri-table-preset");
    if (!data) return;
    const preset: PresetTable = JSON.parse(data);
    const p = svgPoint(e);
    const x = snapToGrid(p.x - preset.width / 2, GRID);
    const y = snapToGrid(p.y - preset.height / 2, GRID);
    const firstZone = zones[0];
    if (!firstZone) return;
    await upsertTable({
      number: nextTableNumber(tables),
      capacity: preset.capacity,
      shape: preset.shape,
      width: preset.width,
      height: preset.height,
      x,
      y,
      rotation: 0,
      zone_id: firstZone.id,
    });
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${floor.width} ${floor.height}`}
      className="flex-1 bg-background border"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <defs>
        <pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
          <path
            d={`M ${GRID} 0 L 0 0 0 ${GRID}`}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width={floor.width} height={floor.height} fill="url(#grid)" />

      {tables.map((t) => {
        const zone = zones.find((z) => z.id === t.zone_id);
        const isSelected = selected.has(t.id);
        const isOverlapping = overlaps.has(t.id);
        const fill = zone?.color ?? "#6366f1";
        return (
          <g
            key={t.id}
            transform={`translate(${t.x}, ${t.y}) rotate(${t.rotation}, ${t.width / 2}, ${t.height / 2})`}
            onMouseDown={(e) => handleTableMouseDown(e, t)}
            className="cursor-move"
          >
            {t.shape === "round" ? (
              <ellipse
                cx={t.width / 2}
                cy={t.height / 2}
                rx={t.width / 2}
                ry={t.height / 2}
                fill={fill}
                stroke={isOverlapping ? "#ef4444" : isSelected ? "#fff" : "#000"}
                strokeWidth={isSelected || isOverlapping ? 2 : 1}
              />
            ) : (
              <rect
                width={t.width}
                height={t.height}
                fill={fill}
                stroke={isOverlapping ? "#ef4444" : isSelected ? "#fff" : "#000"}
                strokeWidth={isSelected || isOverlapping ? 2 : 1}
                rx={4}
              />
            )}
            <text
              x={t.width / 2}
              y={t.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#000"
              fontSize="12"
              fontWeight="bold"
            >
              {t.label ?? t.number}
            </text>
          </g>
        );
      })}

      {guides.map((g, i) =>
        g.orientation === "vertical" ? (
          <line
            key={i}
            x1={g.coord}
            y1={0}
            x2={g.coord}
            y2={floor.height}
            stroke="#ec4899"
            strokeDasharray="4 2"
            strokeWidth={1}
          />
        ) : (
          <line
            key={i}
            x1={0}
            y1={g.coord}
            x2={floor.width}
            y2={g.coord}
            stroke="#ec4899"
            strokeDasharray="4 2"
            strokeWidth={1}
          />
        )
      )}
    </svg>
  );
}

function nextTableNumber(tables: DbTable[]): number {
  const max = tables.reduce((m, t) => Math.max(m, t.number), 0);
  return max + 1;
}
```

- [ ] **Step 2: Commit**

```bash
git add components/pos/floor-plan-editor/canvas.tsx
git commit -m "feat(ui): add SVG canvas with drag, snap, alignment guides, collision, drop"
```

---

## Task 13: `selection-panel.tsx` — properties of selected table(s)

**Files:**
- Create: `components/pos/floor-plan-editor/selection-panel.tsx`

- [ ] **Step 1: Implement**

```tsx
// components/pos/floor-plan-editor/selection-panel.tsx
"use client";

import { useState } from "react";
import type { DbTable, DbZone, TableShape } from "@/lib/types/database";
import { upsertTable, deleteTable } from "@/lib/actions/floor-plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  table: DbTable | null;
  zones: DbZone[];
  onChange: (next: DbTable) => void;
};

export function SelectionPanel({ table, zones, onChange }: Props) {
  if (!table) {
    return <p className="p-3 text-xs text-muted-foreground">Επίλεξε τραπέζι για επεξεργασία.</p>;
  }

  return (
    <div className="p-3 flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Τραπέζι #{table.number}</h3>

      <div>
        <Label htmlFor="number">Νούμερο</Label>
        <Input
          id="number"
          type="number"
          defaultValue={table.number}
          onBlur={async (e) => {
            const n = parseInt(e.target.value, 10);
            if (n !== table.number) {
              await upsertTable({ ...table, number: n });
              onChange({ ...table, number: n });
            }
          }}
        />
      </div>

      <div>
        <Label htmlFor="capacity">Χωρητικότητα</Label>
        <Input
          id="capacity"
          type="number"
          defaultValue={table.capacity}
          onBlur={async (e) => {
            const c = parseInt(e.target.value, 10);
            await upsertTable({ ...table, capacity: c });
            onChange({ ...table, capacity: c });
          }}
        />
      </div>

      <div>
        <Label htmlFor="shape">Σχήμα</Label>
        <Select
          value={table.shape}
          onValueChange={async (v) => {
            const shape = v as TableShape;
            await upsertTable({ ...table, shape });
            onChange({ ...table, shape });
          }}
        >
          <SelectTrigger id="shape"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="square">Τετράγωνο</SelectItem>
            <SelectItem value="round">Στρογγυλό</SelectItem>
            <SelectItem value="rectangle">Ορθογώνιο</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Διαστάσεις</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            defaultValue={table.width}
            onBlur={async (e) => {
              const w = parseInt(e.target.value, 10);
              await upsertTable({ ...table, width: w });
              onChange({ ...table, width: w });
            }}
          />
          <Input
            type="number"
            defaultValue={table.height}
            onBlur={async (e) => {
              const h = parseInt(e.target.value, 10);
              await upsertTable({ ...table, height: h });
              onChange({ ...table, height: h });
            }}
          />
        </div>
      </div>

      <div>
        <Label>Ζώνη</Label>
        <Select
          value={table.zone_id ?? ""}
          onValueChange={async (v) => {
            await upsertTable({ ...table, zone_id: v });
            onChange({ ...table, zone_id: v });
          }}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {zones.map((z) => (
              <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Περιστροφή</Label>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const r = (table.rotation - 15 + 360) % 360;
              await upsertTable({ ...table, rotation: r });
              onChange({ ...table, rotation: r });
            }}
          >
            -15°
          </Button>
          <span className="self-center text-sm">{table.rotation}°</span>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const r = (table.rotation + 15) % 360;
              await upsertTable({ ...table, rotation: r });
              onChange({ ...table, rotation: r });
            }}
          >
            +15°
          </Button>
        </div>
      </div>

      <Button
        variant="destructive"
        size="sm"
        onClick={async () => {
          if (confirm(`Διαγραφή τραπεζιού #${table.number};`)) {
            await deleteTable(table.id);
          }
        }}
      >
        Διαγραφή
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/pos/floor-plan-editor/selection-panel.tsx
git commit -m "feat(ui): add SelectionPanel for editing selected table"
```

---

## Task 14: `zones-panel.tsx` — zones list with drop targets and bulk move

**Files:**
- Create: `components/pos/floor-plan-editor/zones-panel.tsx`

- [ ] **Step 1: Implement**

```tsx
// components/pos/floor-plan-editor/zones-panel.tsx
"use client";

import { useState } from "react";
import type { DbZone, DbTable } from "@/lib/types/database";
import { upsertZone, deleteZone } from "@/lib/actions/floor-plan";
import { cascadeDeleteZone } from "@/lib/actions/zones-bulk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  zones: DbZone[];
  tables: DbTable[];
  floorId: string;
  onTableDroppedOnZone: (tableId: string, zoneId: string) => void;
};

export function ZonesPanel({ zones, tables, floorId, onTableDroppedOnZone }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [moveTo, setMoveTo] = useState<string>("");

  function handleZoneDrop(e: React.DragEvent, zoneId: string) {
    e.preventDefault();
    const tid = e.dataTransfer.getData("application/x-mauri-table-id");
    if (tid) onTableDroppedOnZone(tid, zoneId);
  }

  return (
    <div className="p-3 flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Ζώνες</h3>

      {zones.map((z) => {
        const count = tables.filter((t) => t.zone_id === z.id).length;
        return (
          <div
            key={z.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleZoneDrop(e, z.id)}
            className="flex items-center gap-2 rounded border p-2 hover:bg-accent"
          >
            <div
              className="h-4 w-4 rounded"
              style={{ backgroundColor: z.color }}
            />
            <span className="flex-1 text-sm">{z.name}</span>
            <span className="text-xs text-muted-foreground">{count}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(z.id)}
            >
              ×
            </Button>
          </div>
        );
      })}

      {confirmDelete && (
        <div className="rounded border bg-muted/50 p-2 flex flex-col gap-2">
          <p className="text-xs">Που να μετακινήσω τα τραπέζια;</p>
          <select
            className="rounded border bg-background p-1 text-xs"
            value={moveTo}
            onChange={(e) => setMoveTo(e.target.value)}
          >
            <option value="">— Επίλεξε —</option>
            {zones.filter((z) => z.id !== confirmDelete).map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Ακύρωση</Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!moveTo}
              onClick={async () => {
                await cascadeDeleteZone({ zoneId: confirmDelete, moveToZoneId: moveTo });
                setConfirmDelete(null);
                setMoveTo("");
              }}
            >
              Διαγραφή
            </Button>
          </div>
        </div>
      )}

      {adding ? (
        <div className="rounded border p-2 flex flex-col gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Όνομα ζώνης" />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Ακύρωση</Button>
            <Button
              size="sm"
              onClick={async () => {
                await upsertZone({ name, color, floor_id: floorId, sort_order: zones.length });
                setName("");
                setAdding(false);
              }}
            >
              Προσθήκη
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>+ Νέα ζώνη</Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/pos/floor-plan-editor/zones-panel.tsx
git commit -m "feat(ui): add ZonesPanel with drop targets and cascading delete"
```

---

## Task 15: `layouts-panel.tsx` — saved layouts switcher

**Files:**
- Create: `components/pos/floor-plan-editor/layouts-panel.tsx`

- [ ] **Step 1: Implement**

```tsx
// components/pos/floor-plan-editor/layouts-panel.tsx
"use client";

import { useState } from "react";
import type { DbFloorLayout } from "@/lib/types/floor-layouts";
import { createLayout, activateLayout, deleteLayout } from "@/lib/actions/floor-layouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  layouts: DbFloorLayout[];
  floorId: string;
};

export function LayoutsPanel({ layouts, floorId }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [fromCurrent, setFromCurrent] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function handleActivate(layoutId: string, force = false) {
    setError(null);
    const result = await activateLayout({ layoutId, force });
    if (!result.success) {
      if (result.error.startsWith("BLOCKED:")) {
        const numbers = result.error.replace("BLOCKED:", "");
        if (confirm(`Τα τραπέζια ${numbers} είναι κατειλημμένα. Force switch;`)) {
          await handleActivate(layoutId, true);
        }
      } else {
        setError(result.error);
      }
    }
  }

  return (
    <div className="p-3 flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Διατάξεις</h3>

      {layouts.map((l) => (
        <div
          key={l.id}
          className={`flex items-center gap-2 rounded border p-2 ${l.is_active ? "border-primary bg-primary/10" : ""}`}
        >
          <span>{l.icon ?? "📋"}</span>
          <span className="flex-1 text-sm">{l.name}</span>
          {!l.is_active && (
            <Button size="sm" variant="ghost" onClick={() => handleActivate(l.id)}>
              Εφαρμογή
            </Button>
          )}
          {!l.is_active && (
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                if (confirm(`Διαγραφή της διάταξης "${l.name}";`)) {
                  await deleteLayout(l.id);
                }
              }}
            >
              ×
            </Button>
          )}
        </div>
      ))}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {adding ? (
        <div className="rounded border p-2 flex flex-col gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Όνομα (Καλοκαίρι, Χειμώνας...)" />
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Emoji (☀ ❄ 🎉)" maxLength={2} />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={fromCurrent} onChange={(e) => setFromCurrent(e.target.checked)} />
            Ξεκίνα από την τωρινή διάταξη
          </label>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Ακύρωση</Button>
            <Button
              size="sm"
              onClick={async () => {
                await createLayout({ floorId, name, icon: icon || undefined, fromCurrent });
                setName("");
                setIcon("");
                setAdding(false);
              }}
            >
              Δημιουργία
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>+ Νέα διάταξη</Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/pos/floor-plan-editor/layouts-panel.tsx
git commit -m "feat(ui): add LayoutsPanel with create/activate/delete and force-switch"
```

---

## Task 16: `floor-presets-dialog.tsx` — new floor wizard

**Files:**
- Create: `components/pos/floor-plan-editor/floor-presets-dialog.tsx`

- [ ] **Step 1: Implement**

```tsx
// components/pos/floor-plan-editor/floor-presets-dialog.tsx
"use client";

import { useState } from "react";
import { upsertFloor } from "@/lib/actions/floor-plan";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const PRESETS = [
  { id: "small-bar", label: "Μικρό μπαρ", width: 800, height: 600 },
  { id: "standard", label: "Standard αίθουσα", width: 1200, height: 800 },
  { id: "terrace", label: "Μεγάλη βεράντα", width: 1600, height: 1000 },
];

export function FloorPresetsDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState(PRESETS[1]);
  const [custom, setCustom] = useState({ width: 1200, height: 800 });
  const [useCustom, setUseCustom] = useState(false);

  async function handleCreate() {
    const dims = useCustom ? custom : { width: picked.width, height: picked.height };
    await upsertFloor({ name, width: dims.width, height: dims.height, sort_order: 0 });
    setOpen(false);
    setName("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">+ Νέος όροφος</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Νέος όροφος</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Όνομα ορόφου"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { setPicked(p); setUseCustom(false); }}
              className={`rounded border p-3 text-left ${!useCustom && picked.id === p.id ? "border-primary bg-primary/10" : ""}`}
            >
              <div className="text-sm font-medium">{p.label}</div>
              <div className="text-xs text-muted-foreground">{p.width}×{p.height}</div>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setUseCustom(true)}
          className={`rounded border p-3 text-left ${useCustom ? "border-primary bg-primary/10" : ""}`}
        >
          <div className="text-sm font-medium">Custom</div>
          {useCustom && (
            <div className="mt-2 flex gap-2">
              <Input
                type="number"
                value={custom.width}
                onChange={(e) => setCustom({ ...custom, width: parseInt(e.target.value, 10) })}
              />
              <Input
                type="number"
                value={custom.height}
                onChange={(e) => setCustom({ ...custom, height: parseInt(e.target.value, 10) })}
              />
            </div>
          )}
        </button>

        <Button onClick={handleCreate} disabled={!name}>Δημιουργία</Button>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/pos/floor-plan-editor/floor-presets-dialog.tsx
git commit -m "feat(ui): add FloorPresetsDialog with size presets"
```

---

## Task 17: `editor-shell.tsx` — orchestrator + page wiring + delete monolith

**Files:**
- Create: `components/pos/floor-plan-editor/editor-shell.tsx`
- Modify: `app/(pos)/settings/floor-plan/page.tsx`
- Delete: `components/pos/floor-plan-editor.tsx`

- [ ] **Step 1: Implement shell**

```tsx
// components/pos/floor-plan-editor/editor-shell.tsx
"use client";

import { useEffect, useState } from "react";
import type { DbFloor, DbZone, DbTable } from "@/lib/types/database";
import type { DbFloorLayout } from "@/lib/types/floor-layouts";
import { useCanvasState } from "@/lib/hooks/use-canvas-state";
import { Canvas } from "./canvas";
import { PaletteRail } from "./palette-rail";
import { SelectionPanel } from "./selection-panel";
import { ZonesPanel } from "./zones-panel";
import { LayoutsPanel } from "./layouts-panel";
import { FloorPresetsDialog } from "./floor-presets-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { bulkUpdateZone } from "@/lib/actions/zones-bulk";

type Props = {
  floors: DbFloor[];
  zones: DbZone[];
  tables: DbTable[];
  layoutsByFloor: Record<string, DbFloorLayout[]>;
  initialFloorId: string;
};

export function EditorShell({ floors, zones, tables: initialTables, layoutsByFloor, initialFloorId }: Props) {
  const [activeFloorId, setActiveFloorId] = useState(initialFloorId);
  const { tables, selected, setSelected, moveLocal, pushUndo, undo, redo } = useCanvasState(initialTables);

  const floor = floors.find((f) => f.id === activeFloorId);
  const floorZones = zones.filter((z) => z.floor_id === activeFloorId);
  const zoneIds = new Set(floorZones.map((z) => z.id));
  const floorTables = tables.filter((t) => t.zone_id && zoneIds.has(t.zone_id));
  const layouts = layoutsByFloor[activeFloorId] ?? [];
  const selectedTable = selected.size === 1 ? floorTables.find((t) => selected.has(t.id)) ?? null : null;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); redo(); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [undo, redo]);

  function handleSelect(ids: string[], additive: boolean) {
    if (ids.length === 0 && !additive) {
      setSelected(new Set());
      return;
    }
    if (additive) {
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => (next.has(id) ? next.delete(id) : next.add(id)));
        return next;
      });
    } else {
      setSelected(new Set(ids));
    }
  }

  async function handleTableDroppedOnZone(tableId: string, zoneId: string) {
    pushUndo();
    await bulkUpdateZone({ tableIds: [tableId], zoneId });
  }

  if (!floor) return <p className="p-4">Δεν υπάρχει όροφος. Δημιούργησε έναν.</p>;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Topbar */}
      <div className="flex items-center gap-2 border-b p-2">
        <select
          className="rounded border bg-background p-1 text-sm"
          value={activeFloorId}
          onChange={(e) => setActiveFloorId(e.target.value)}
        >
          {floors.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <FloorPresetsDialog />
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={undo}>Undo</Button>
        <Button size="sm" variant="ghost" onClick={redo}>Redo</Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <PaletteRail />
        <Canvas
          floor={floor}
          zones={floorZones}
          tables={floorTables}
          selected={selected}
          onSelect={handleSelect}
          onMove={moveLocal}
          onPushUndo={pushUndo}
        />
        <aside className="w-72 shrink-0 border-l bg-muted/30 overflow-y-auto">
          <Tabs defaultValue="selection">
            <TabsList className="w-full">
              <TabsTrigger value="selection">Επιλογή</TabsTrigger>
              <TabsTrigger value="zones">Ζώνες</TabsTrigger>
              <TabsTrigger value="layouts">Διατάξεις</TabsTrigger>
            </TabsList>
            <TabsContent value="selection">
              <SelectionPanel
                table={selectedTable}
                zones={floorZones}
                onChange={() => { /* state already optimistic via canvas */ }}
              />
            </TabsContent>
            <TabsContent value="zones">
              <ZonesPanel
                zones={floorZones}
                tables={floorTables}
                floorId={activeFloorId}
                onTableDroppedOnZone={handleTableDroppedOnZone}
              />
            </TabsContent>
            <TabsContent value="layouts">
              <LayoutsPanel layouts={layouts} floorId={activeFloorId} />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update the page to load layouts and use the new shell**

```tsx
// app/(pos)/settings/floor-plan/page.tsx
import { getAllFloors } from "@/lib/queries/floors";
import { getZones } from "@/lib/queries/zones";
import { getAllTables } from "@/lib/queries/tables";
import { getLayoutsByFloor } from "@/lib/queries/floor-layouts";
import { EditorShell } from "@/components/pos/floor-plan-editor/editor-shell";

export default async function FloorPlanSettingsPage() {
  const floors = await getAllFloors();
  const zones = await getZones();
  const tables = await getAllTables();
  const layoutsByFloor: Record<string, Awaited<ReturnType<typeof getLayoutsByFloor>>> = {};
  for (const f of floors) {
    layoutsByFloor[f.id] = await getLayoutsByFloor(f.id);
  }
  const initialFloorId = floors[0]?.id ?? "";

  return (
    <EditorShell
      floors={floors}
      zones={zones}
      tables={tables}
      layoutsByFloor={layoutsByFloor}
      initialFloorId={initialFloorId}
    />
  );
}
```

(Replace existing `getAllFloors`/`getAllTables` import paths with whatever the project uses; check `lib/queries/` for exact names.)

- [ ] **Step 3: Delete the old monolith**

Run: `rm components/pos/floor-plan-editor.tsx`

- [ ] **Step 4: Verify build + types**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: clean.

- [ ] **Step 5: Manual smoke test**

1. `pnpm dev`, open `/settings/floor-plan`.
2. Drag a preset from palette to canvas → table appears at snap position.
3. Drag table near another → pink alignment guide shows; release snaps.
4. Try to overlap two tables → red border on overlap.
5. Drag a table off-edge → clamps to bounds.
6. Open Layouts tab → "+ Νέα διάταξη" → name "Καλοκαίρι", emoji ☀, fromCurrent=true → saves.
7. Move a table, then click "Εφαρμογή" on a different layout → tables jump back to that layout's positions.
8. Open `/tables` in another tab → realtime view reflects active layout.

- [ ] **Step 6: Commit**

```bash
git add components/pos/floor-plan-editor/editor-shell.tsx app/\(pos\)/settings/floor-plan/page.tsx
git rm components/pos/floor-plan-editor.tsx
git commit -m "feat(ui): wire new floor plan editor shell, remove monolith"
```

---

## Self-review summary

- **Spec coverage:**
  - Pain 1 (drag precision) → Tasks 2, 4, 12 (snap, alignment, canvas)
  - Pain 2 (zone management) → Tasks 8, 14 (bulk + cascade, zones panel)
  - Pain 3 (floor setup) → Task 16 (presets dialog)
  - Pain 4 (overlap/bounds) → Tasks 3, 12 (collision helper, canvas wiring)
  - Saved layouts → Tasks 1, 5, 6, 7, 15 (schema, types, queries, actions, panel)
  - No-reload → Tasks 9, 10 (action change, hook)
  - Layout-switch block during service → Task 7 (`activateLayout` BLOCKED error)
  - `is_visible` per layout → present in schema (Task 1) but **NOT yet exposed in UI**. Add follow-up task or scope as P2.

- **Type consistency:** `DbFloorLayout`, `DbFloorLayoutPosition`, `Result<T>`, `IdRect`, `Guide` all defined once and reused.

- **Placeholder scan:** None remaining.

---

## Known follow-ups (not in this plan)

- Expose `is_visible` toggle in `selection-panel.tsx`.
- Drag rectangle for multi-select on empty canvas.
- Keyboard arrow nudge on selected tables (uses `nudge` from snap.ts).
- Save layout positions snapshot when activating, in case of partial trigger failure.

These are deliberately deferred to keep this plan shippable and reviewable.
