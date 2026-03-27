# EatFlow POS — Sub-project 1: Enhanced Core

**Date:** 2026-03-27
**Status:** Approved
**Scope:** UI-only demo with mock data (localStorage), ready for future Supabase backend

## Overview

Enhance the existing EatFlow POS demo with 6 features that upgrade the core POS experience: drag & drop floor plan, modifiers, advanced KDS, courses, and table transfer. Architecture uses a single React Context with custom hooks for clean separation.

## 1. Types & Data Model

### Modified Types

```typescript
// Table — add floor plan positioning + dirty status
interface Table {
  id: string
  number: number
  capacity: number
  status: 'available' | 'occupied' | 'bill-requested' | 'dirty'
  currentOrderId?: string
  zoneId: string
  x: number              // 0-100 (percentage positioning)
  y: number              // 0-100
  shape: 'square' | 'round' | 'rectangle'
  rotation: number       // 0, 90, 180, 270
}

// Product — add station + modifier support
interface Product {
  id: string
  name: string
  price: number
  categoryId: string
  description?: string
  vatRate: 24 | 13
  available: boolean
  station: 'hot' | 'cold' | 'bar' | 'dessert'
  modifierIds: string[]
}

// OrderItem — add modifiers, course, rush, station
interface OrderItem {
  id: string
  productId: string
  productName: string
  price: number
  quantity: number
  notes?: string
  status: 'pending' | 'preparing' | 'ready' | 'served'
  createdAt: string
  modifiers: SelectedModifier[]
  course: number
  station: 'hot' | 'cold' | 'bar' | 'dessert'
}

// Order — add active course tracking
interface Order {
  id: string
  tableId: string
  tableNumber: number
  items: OrderItem[]
  status: 'active' | 'completed' | 'cancelled'
  createdAt: string
  completedAt?: string
  paymentMethod?: 'cash' | 'card'
  total: number
  vatAmount: number
  activeCourse: number
  isRush: boolean
}
```

### New Types

```typescript
interface Zone {
  id: string
  name: string         // "Εσωτερικό", "Βεράντα", "Μπαρ", "VIP"
  color: string        // hex color for visual distinction
  order: number        // display order
}

interface Modifier {
  id: string
  name: string         // "extra τυρί", "well done"
  price: number        // 0 if free, e.g. 1.50 if extra charge
  categoryIds: string[] // which categories this modifier applies to
}

interface SelectedModifier {
  modifierId: string
  name: string
  price: number
}

type Station = 'hot' | 'cold' | 'bar' | 'dessert'
```

### State Additions

```typescript
interface POSState {
  tables: Table[]
  categories: Category[]
  products: Product[]
  orders: Order[]
  zones: Zone[]          // NEW
  modifiers: Modifier[]  // NEW
  isLoaded: boolean
}
```

### Price Calculation

```
itemTotal = (product.price + sum(selectedModifier.prices)) × quantity
```

VAT is calculated on the full itemTotal. Modifiers inherit the product's VAT rate.

## 2. Floor Plan Editor (Drag & Drop)

### Library

`@dnd-kit/core` + `@dnd-kit/utilities` for drag and drop.

### Two Modes

**Edit Mode** — new section in Settings page (`/settings`):
- Zone management: add/edit/delete zones with name + color
- Add tables: select shape (square/round/rectangle), assign to zone
- Drag tables freely on a canvas area
- Positions stored as percentages (0-100) for responsive display
- Table properties: number, capacity, shape, rotation, zone
- Delete table button

**Live Mode** — replaces current `/tables` grid:
- Same spatial layout as edit mode (read-only positions)
- Zone filter tabs at top (with "Όλα" tab)
- Tables colored by status:
  - Green = available
  - Red = occupied (shows current order total)
  - Amber/pulsing = bill-requested
  - Grey = dirty
- Click table → same behavior as current (go to order page)

### Components

- `components/pos/floor-plan-editor.tsx` — Edit mode canvas with dnd-kit
- `components/pos/floor-plan-view.tsx` — Live mode display
- `components/pos/zone-manager.tsx` — Zone CRUD panel
- `components/pos/table-shape.tsx` — Renders table shape (round/square/rect) with status color

### Mock Data

3 default zones:
1. Εσωτερικό (blue, 6 tables)
2. Βεράντα (green, 4 tables)
3. Μπαρ (amber, 2 tables/stools)

12 tables pre-positioned across zones with varied shapes.

## 3. Modifiers System

### Menu Management

New "Modifiers" tab in `/menu` page:
- CRUD modifiers: name, price (0 for free), applicable categories
- Each modifier can apply to multiple categories
- Products inherit available modifiers from their category
- Products can also have explicit `modifierIds` for product-specific modifiers

### Pre-built Mock Modifiers

| Modifier | Price | Categories |
|----------|-------|------------|
| Χωρίς κρεμμύδι | €0 | Κυρίως, Σαλάτες |
| Χωρίς σάλτσα | €0 | Κυρίως |
| Extra τυρί | +€1.50 | Κυρίως, Σαλάτες |
| Extra μπέικον | +€2.00 | Κυρίως |
| Well done | €0 | Κυρίως |
| Medium | €0 | Κυρίως |
| Rare | €0 | Κυρίως |
| Χωρίς γλουτένη | €0 | Κυρίως, Ορεκτικά |
| Χωρίς λακτόζη | €0 | Κυρίως, Ορεκτικά, Επιδόρπια |
| Χωρίς πάγο | €0 | Ποτά |
| Extra σιρόπι | +€0.50 | Ποτά |

### Order Taking Flow

1. Waiter taps a menu item
2. Panel/sheet opens with:
   - Quantity selector (existing)
   - Modifier chips (toggleable) — only modifiers applicable to this product's category
   - Free-text notes field (existing)
   - Item total: `(base + modifiers) × qty`
3. Confirm → item added to order with selected modifiers

### Order Summary Display

```
Μουσακάς ×1                    €13.50
  extra τυρί, well done
Χωριάτικη ×1                    €8.00
  χωρίς κρεμμύδι
```

### KDS Display

Modifiers shown in bold amber text below each item. Prices not shown (kitchen doesn't need pricing).

## 4. Kitchen Display System (KDS) Upgrades

### Color-coded Timers

Based on time since `orderItem.createdAt`:
- **Green** (`#22c55e`): < 5 minutes
- **Amber** (`#f59e0b`): 5-10 minutes
- **Red** (`#ef4444`): > 10 minutes

Color applies to the entire order card border and header background. Timer shows `MM:SS` format, updates every second.

### Multi-Station Tabs

Tabs at top of `/kitchen` page:
- 🔥 Ζεστή Κουζίνα
- ❄️ Κρύα Κουζίνα
- 🍸 Μπαρ
- 🍰 Γλυκά
- 📋 Όλα

Each tab shows a count badge of pending items. Items are routed to stations based on `orderItem.station` (inherited from `product.station`).

"Όλα" tab shows all items across all stations — for small restaurants with a single kitchen.

### RUSH Marking

- Waiter can mark an order as RUSH from the order page (`/orders/[tableId]`)
- RUSH orders in KDS: red border + pulsing animation + 🚨 icon in header
- RUSH is per-order (all items in that order become urgent)
- Implementation: `isRush` flag on Order, toggled via `TOGGLE_RUSH` action

### Order Card Layout

```
┌─────────────────────────────┐
│ [color] Τραπέζι 5    7:15  │  ← header with timer
├─────────────────────────────┤
│ ×2 Μουσακάς       Course 1 │
│   extra τυρί, well done    │  ← modifiers in amber
│ ×1 Σουβλάκι       Course 1 │
│   χωρίς κρεμμύδι           │
├─────────────────────────────┤
│ [Ετοιμάζεται] [Έτοιμο ✓]  │  ← action buttons
└─────────────────────────────┘
```

### Course Display

- KDS shows only items from `order.activeCourse`
- When all items of active course are marked "ready" → notification appears
- "Στείλε Course N" button advances to next course
- Future course items are hidden until activated

## 5. Courses (Σειρά Σερβιρίσματος)

### Order Taking

- Default: all items are Course 1
- "Νέο Course" button in order page → subsequent items go to Course 2, 3, etc.
- Visual separator in order summary: `--- Course 1 ---` / `--- Course 2 ---`
- Each item has a course dropdown to change its course assignment

### KDS Integration

- Only `order.activeCourse` items appear in KDS
- When all items of a course are marked "ready" → notification: "Course 1 Τραπέζι 5 — Έτοιμο!"
- "Στείλε Course 2" button (available to waiter or kitchen) → increments `order.activeCourse`
- New course items then appear in KDS

### Flow Example

1. Waiter creates order: Course 1 = Τζατζίκι + Σαλάτα, Course 2 = Μουσακάς + Σουβλάκι
2. KDS shows only Τζατζίκι + Σαλάτα
3. Kitchen marks both "ready" → notification to waiter
4. Waiter serves, presses "Στείλε Course 2"
5. KDS now shows Μουσακάς + Σουβλάκι

## 6. Table Transfer

### Trigger Points

- Order page (`/orders/[tableId]`) → "Μεταφορά" button in header
- Floor plan live view → right-click/long-press table → context menu → "Μεταφορά σε..."

### Flow

1. Button opens dialog showing available tables (mini floor plan or grid)
2. Only tables with status `available` are selectable
3. Waiter selects target table → confirm dialog
4. Action updates: `order.tableId`, `order.tableNumber`, source table → `available`, target table → `occupied` with `currentOrderId`

### Implementation

Single `TRANSFER_TABLE` action:
```typescript
{ type: 'TRANSFER_TABLE', payload: { orderId: string, fromTableId: string, toTableId: string } }
```

## 7. Custom Hooks Architecture

### Hook Structure

| Hook | File | Responsibility |
|------|------|----------------|
| `useTableLayout()` | `hooks/use-table-layout.ts` | Zone CRUD, table drag positioning, table transfer, filter by zone |
| `useModifiers()` | `hooks/use-modifiers.ts` | Modifier CRUD, get modifiers for product/category, price calculation |
| `useKitchen()` | `hooks/use-kitchen.ts` | Filter by station, timer color logic, RUSH toggle, course advancement |
| `useOrders()` | `hooks/use-orders.ts` | Wraps existing order logic + courses + modifiers in addItem |

### Pattern

Each hook internally calls `usePOS()` and exposes a clean, domain-specific API:

```typescript
function useKitchen() {
  const { state, dispatch } = usePOS()

  const getOrdersByStation = (station: Station) =>
    state.orders.filter(o =>
      o.status === 'active' &&
      o.items.some(i => i.station === station && i.status !== 'served')
    )

  const getTimerColor = (createdAt: string): 'green' | 'amber' | 'red' => {
    const mins = differenceInMinutes(new Date(), new Date(createdAt))
    if (mins < 5) return 'green'
    if (mins < 10) return 'amber'
    return 'red'
  }

  const toggleRush = (orderId: string) =>
    dispatch({ type: 'TOGGLE_RUSH', payload: orderId })

  const advanceCourse = (orderId: string) =>
    dispatch({ type: 'ADVANCE_COURSE', payload: orderId })

  return { getOrdersByStation, getTimerColor, toggleRush, advanceCourse }
}
```

### New Reducer Actions

```typescript
// Zones
| { type: 'ADD_ZONE'; payload: Zone }
| { type: 'UPDATE_ZONE'; payload: Zone }
| { type: 'DELETE_ZONE'; payload: string }

// Modifiers
| { type: 'ADD_MODIFIER'; payload: Modifier }
| { type: 'UPDATE_MODIFIER'; payload: Modifier }
| { type: 'DELETE_MODIFIER'; payload: string }

// Tables (floor plan)
| { type: 'MOVE_TABLE'; payload: { tableId: string; x: number; y: number } }
| { type: 'TRANSFER_TABLE'; payload: { orderId: string; fromTableId: string; toTableId: string } }

// Kitchen
| { type: 'TOGGLE_RUSH'; payload: string }  // orderId
| { type: 'ADVANCE_COURSE'; payload: string }  // orderId
```

## 8. New Dependencies

- `@dnd-kit/core` — drag and drop primitives
- `@dnd-kit/utilities` — CSS transform utilities

No other new dependencies needed. Existing `date-fns` handles timer calculations.

## 9. File Structure (New/Modified)

```
hooks/
  use-table-layout.ts    NEW
  use-modifiers.ts       NEW
  use-kitchen.ts         NEW
  use-orders.ts          NEW

components/pos/
  floor-plan-editor.tsx  NEW — Edit mode canvas
  floor-plan-view.tsx    NEW — Live mode display
  zone-manager.tsx       NEW — Zone CRUD
  table-shape.tsx        NEW — Table shape renderer
  modifier-chips.tsx     NEW — Toggleable modifier chips
  modifier-manager.tsx   NEW — Modifier CRUD in menu
  course-separator.tsx   NEW — Course visual separator in order
  kitchen-order.tsx      MODIFIED — Color timers, RUSH, modifiers, courses

app/(pos)/
  tables/page.tsx        MODIFIED — Replace grid with floor-plan-view
  kitchen/page.tsx       MODIFIED — Station tabs, color logic
  orders/[tableId]/page.tsx  MODIFIED — Modifiers panel, courses, RUSH, transfer
  menu/page.tsx          MODIFIED — Add Modifiers tab
  settings/page.tsx      MODIFIED — Add Floor Plan Editor section

lib/
  types.ts               MODIFIED — All type changes above
  pos-context.tsx         MODIFIED — New actions, state (zones, modifiers)
  mock-data.ts           MODIFIED — Zones, modifiers, updated tables/products
```

## 10. Mock Data Updates

### Zones
- Εσωτερικό (blue `#3b82f6`, 6 tables: T1-T6)
- Βεράντα (green `#22c55e`, 4 tables: T7-T10)
- Μπαρ (amber `#f59e0b`, 2 tables: T11-T12)

### Products
All 33 existing products get `station` assignment:
- Ορεκτικά, Σαλάτες → `cold`
- Κυρίως Πιάτα, Θαλασσινά → `hot`
- Ποτά, Κρασιά → `bar`
- Επιδόρπια → `dessert`

### Tables
All 12 tables get x/y positions, shapes, and zoneId assignments pre-configured to create a realistic restaurant floor plan.
