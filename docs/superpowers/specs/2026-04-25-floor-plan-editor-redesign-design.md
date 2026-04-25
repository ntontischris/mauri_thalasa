# Floor Plan Editor Redesign — Design Spec

**Date:** 2026-04-25
**Topic:** Redesign of `/settings/floor-plan` editor (MAURI POS / EatFlow)
**Status:** Brainstorm complete, awaiting user review

---

## 1. Problem

The current floor-plan editor at `components/pos/floor-plan-editor.tsx` (≈800 lines) works but is "πολύ δύσκολο και παράζωνο" to use. The runtime tables view (`components/pos/tables-view.tsx`) is fine and stays out of scope.

User-confirmed pain points (multi-select):

1. **Drag precision** — no alignment guides, no snap to neighbors, hard to make straight rows.
2. **Zone management** — moving tables between zones, deleting zones with tables, copying zones is awkward.
3. **Floor setup** — width/height in pixels, no presets (small bar, terrace, etc).
4. **Overlaps/out-of-bounds** — nothing prevents placing tables on top of each other or outside the floor.

User-confirmed context:

- Layout changes **frequently** — seasonal (summer terrace / winter inside), events, rearrangements.
- No need for blueprint/background image (rejected after consideration).
- Pain points NOT to address: bulk add, page reload during add (we'll fix it as side-effect), shape variety, table numbering, separate preview.

## 2. Approach

**Approach B (chosen): Palette + Smart Canvas + Saved Layouts.**

A three-pane editor:

- **Left palette** — drag pre-made table types onto the canvas.
- **Center canvas** — SVG with smart alignment guides, collision detection, bounds clamping, multi-select, keyboard nav.
- **Right panel** — tabs for Zones, Saved Layouts, and Selection properties.

Saved layouts let the user store named snapshots (Καλοκαίρι/Χειμώνας/Event) and switch with one click.

Rejected alternatives:

- **Approach A (Figma-style Pro Editor)** — too steep a learning curve for managers.
- **Approach C (Quick Setup Wizard)** — too rigid for the user's frequent rearrangements.

## 3. Architecture

### 3.1 Component decomposition

The current 800-line monolith splits into:

```
components/pos/floor-plan-editor/
├── editor-shell.tsx          # orchestrator, URL state (?floor=&layout=)
├── palette-rail.tsx          # left rail, HTML5 DnD source
├── canvas.tsx                # SVG canvas, drag, snap, guides, collision
├── selection-panel.tsx       # right panel: properties of selected table(s)
├── zones-panel.tsx           # right panel: zone list with drop targets
├── layouts-panel.tsx         # right panel: saved layouts switcher
└── floor-presets-dialog.tsx  # new floor wizard
```

Each component has a single responsibility and well-defined props. The shell owns the canvas state through hooks (no prop drilling beyond two levels).

### 3.2 State and persistence

- `lib/hooks/use-canvas-state.ts` — local optimistic state for selected tables, drag preview, multi-selection. Holds an in-memory undo/redo stack (session-only).
- Persistence is **debounced 300ms** through `moveTable` server action; subsequent calls within the window batch.
- Page reload after add/delete is removed; mutations update local state and call `revalidatePath` server-side.

### 3.3 Pure helpers

- `lib/canvas/alignment.ts` — given drag delta and other tables, returns snap target + guide lines to draw.
- `lib/canvas/collision.ts` — bounding box overlap check, bounds clamp.
- `lib/canvas/snap.ts` — grid snap (20px), with 1px/10px keyboard nudge.

These are pure functions, unit-testable without React.

## 4. Data model

### 4.1 New tables (migration `030_floor_layouts.sql`)

```sql
CREATE TABLE floor_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- "Καλοκαίρι", "Χειμώνας", "Event"
  is_active BOOLEAN DEFAULT false,       -- exactly one active per floor
  icon TEXT,                              -- optional emoji
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX one_active_layout_per_floor
  ON floor_layouts (floor_id) WHERE is_active = true;

CREATE TABLE floor_layout_positions (
  layout_id UUID NOT NULL REFERENCES floor_layouts(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  rotation INTEGER DEFAULT 0 CHECK (rotation >= 0 AND rotation < 360),
  zone_id UUID REFERENCES zones(id),
  is_visible BOOLEAN DEFAULT true,        -- table hidden in this layout
  PRIMARY KEY (layout_id, table_id)
);

CREATE INDEX idx_layout_positions_layout ON floor_layout_positions(layout_id);
CREATE INDEX idx_layout_positions_table ON floor_layout_positions(table_id);
```

### 4.2 Existing tables

- `tables` keeps identity columns (`number`, `capacity`, `shape`, `width`, `height`, `label`, `is_active`).
- `tables.x`, `tables.y`, `tables.rotation`, `tables.zone_id` become a **denormalized cache** of the currently active layout's positions, so the runtime tables view stays fast.
- A trigger on `floor_layout_positions` updates `tables.x/y/rotation/zone_id` when the row's `layout_id` matches the active layout.

### 4.3 Backfill

For **every** existing floor (with or without tables), the migration creates one layout named `"Κύρια Διάταξη"` with `is_active = true`. For each `tables` row whose `zone_id` belongs to that floor, a corresponding `floor_layout_positions` row is inserted from current `tables.x/y/rotation/zone_id`. No data is lost; the old setup becomes the default layout.

### 4.4 Sync trigger

Two triggers keep `tables.x/y/rotation/zone_id` in sync with the active layout:

- **Trigger A** on `floor_layout_positions` (AFTER INSERT/UPDATE): if the row's `layout_id` is `is_active=true`, copy `x/y/rotation/zone_id` to the matching `tables` row.
- **Trigger B** on `floor_layouts` (AFTER UPDATE OF `is_active`): when a layout becomes active, bulk-copy all its `floor_layout_positions` to the corresponding `tables` rows.

This guarantees the runtime tables view (`tables-view.tsx`) sees consistent positions without joining the layout tables.

## 5. Server actions

### 5.1 New

| Action | Purpose | Notes |
|---|---|---|
| `createLayout(floorId, name, fromCurrent)` | Create layout; if `fromCurrent=true`, snapshots current positions | Validates name 1–60 chars; uniqueness on (floor_id, name) |
| `activateLayout(layoutId)` | Sets `is_active=true` for this layout, others false; trigger updates `tables.x/y/...` | Transactional |
| `deleteLayout(layoutId)` | Deletes layout | Rejects if `is_active` |
| `renameLayout(layoutId, name)` | Rename | Validates name |
| `bulkUpdateZone(tableIds, zoneId)` | Bulk reassign tables to a zone | Validates IDs |
| `cascadeDeleteZone(zoneId, moveToZoneId)` | Move all tables to target zone, then delete | Rejects if `moveToZoneId` is the same |

### 5.2 Changed

- `moveTable(id, x, y, rotation)` — writes to `floor_layout_positions` for the active layout; `tables.x/y/...` updates via trigger.
- `upsertTable()` — UI no longer triggers `window.location.reload()`. The shell updates local state from the action's returned row.

### 5.3 Validation

All actions use Zod schemas. Coordinates are clamped to `[0, floor.width|height - table dimension]` server-side as a safety net (client also clamps).

## 6. Interactions

| Feature | How it works |
|---|---|
| **Alignment guides** | On drag, find tables sharing x/y center or edge within ±4px. Render pink line, snap to it. |
| **Collision detection** | Bounding box check vs all visible tables in the active layout. Red outline while overlapping; on release, if still overlapping, snap back to last valid position. |
| **Bounds clamp** | Drag clamps `x ∈ [0, floor.width - tableWidth]`, same for `y`. |
| **Multi-select** | Shift+click adds; drag rectangle on empty canvas selects all enclosed. |
| **Keyboard** | Arrow keys nudge 1px (Shift=10px); `Delete` removes; `Ctrl+D` duplicates with +20/+20 offset; `Ctrl+Z/Y` undo/redo. |
| **Drag from palette** | HTML5 DnD from rail → drop on canvas → creates table at snap point with preset's defaults. |
| **No reload** | Optimistic UI, debounced (300ms) `moveTable`, error rollback to last server-confirmed state. |

## 7. UI flows

### 7.1 First-time floor creation

1. User clicks "+ Νέος όροφος".
2. Dialog shows 4 cards: **Small Bar** (800×600), **Standard** (1200×800), **Terrace** (1600×1000), **Custom**. Plus "Clone from..." dropdown listing existing floors.
3. On submit, floor is created with one default layout `"Κύρια Διάταξη"` (active).

### 7.2 Saved layouts

- Right panel "Layouts" tab shows the floor's layouts as a list with active highlighted. Each row shows optional emoji `icon` + name.
- "+ Νέα διάταξη" → modal asks name, optional emoji icon, + checkbox "Ξεκίνα από την τωρινή διάταξη". On confirm: creates layout (cloned from current if checked, else empty), activates it.
- Click an inactive layout → confirmation modal "Εφαρμογή της διάταξης Χ; Οι τωρινές θέσεις θα αντικατασταθούν." → on confirm activates it.

### 7.3 Zone management

- Right panel "Zones" tab lists zones with name, color swatch, table count.
- Each row is a drop target: drag a table from canvas onto a zone row → zone change.
- Multi-select on canvas + "Assign to zone..." button → bulk update.
- Delete zone: modal "Move tables to zone..." dropdown is **required** if zone has tables.

## 8. Testing

- Unit tests for `lib/canvas/alignment.ts`, `lib/canvas/collision.ts`, `lib/canvas/snap.ts` (pure functions).
- Server-action tests for `createLayout`, `activateLayout`, `cascadeDeleteZone`, `bulkUpdateZone` against a real Supabase test schema (per project rule: integration tests hit real DB, not mocks).
- Component tests for `editor-shell` covering: drag-drop from palette, multi-select, layout switch.

## 9. Out of scope (YAGNI)

- Background blueprint image upload.
- Free rotation slider (15° steps remain).
- Cross-session undo/redo.
- Custom shapes beyond `square`/`round`/`rectangle`.
- Real-time collaborative editing.
- Layout scheduling (auto-switch by date/time).

## 10. Migration / rollout

1. Ship migration `030_floor_layouts.sql` with backfill in one deploy.
2. Ship UI changes in a follow-up PR; until then, the trigger keeps `tables.x/y/...` in sync so the existing editor and runtime view continue to work.
3. After the new editor is verified, the old `floor-plan-editor.tsx` file is removed.

## 11. Decisions (defaulted under auto mode — open to revision)

- **Floor presets:** Small Bar 800×600 / Standard 1200×800 / Terrace 1600×1000 / Custom. The "Custom" option covers larger setups; presets are seeds, not limits.
- **Layout switching during service:** **Blocked** when any table on the floor has status `occupied` or `bill-requested`. The activate action returns a typed error listing blocking tables; the UI surfaces it as a warning with "Force switch" only behind a confirmation. This avoids surprising staff mid-service.
- **`is_visible` per layout:** **Exposed** in the selection panel as "Εμφάνιση τραπεζιού σ'αυτή τη διάταξη" toggle. Hiding a table in a layout (e.g. terrace tables in winter layout) is the natural use case for saved layouts; the UI cost is one toggle.
