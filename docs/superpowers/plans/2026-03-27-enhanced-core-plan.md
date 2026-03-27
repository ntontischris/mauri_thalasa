# Enhanced Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add drag & drop floor plan, modifiers, advanced KDS (color timers, multi-station, RUSH), courses, and table transfer to the EatFlow POS demo — all UI-only with localStorage.

**Architecture:** Single React Context (`pos-context.tsx`) extended with new actions/state for zones, modifiers, courses, rush, and table positioning. Four custom hooks (`useTableLayout`, `useModifiers`, `useKitchen`, `useOrders`) wrap the context and expose domain-specific APIs. Components are small and focused.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.7, Tailwind 4, Shadcn/UI, @dnd-kit/core, date-fns, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-03-27-enhanced-core-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `hooks/use-table-layout.ts` | Zone CRUD, drag positioning, table transfer, zone filtering |
| `hooks/use-modifiers.ts` | Modifier CRUD, get applicable modifiers, price calculation |
| `hooks/use-kitchen.ts` | Station filtering, timer color, RUSH toggle, course advancement |
| `hooks/use-orders.ts` | Order creation/items with modifiers + courses, send to kitchen |
| `components/pos/floor-plan-editor.tsx` | Edit mode: drag tables on canvas, manage zones |
| `components/pos/floor-plan-view.tsx` | Live mode: spatial table layout with status colors |
| `components/pos/table-shape.tsx` | Renders a single table (round/square/rect) with status color |
| `components/pos/zone-manager.tsx` | Zone CRUD panel (add/edit/delete zones) |
| `components/pos/modifier-chips.tsx` | Toggleable modifier chips for order taking |
| `components/pos/modifier-manager.tsx` | Modifier CRUD in menu management |
| `components/pos/course-separator.tsx` | Visual course divider in order summary |
| `components/pos/table-transfer-dialog.tsx` | Dialog to pick destination table for transfer |

### Modified Files
| File | Changes |
|------|---------|
| `lib/types.ts` | Add Zone, Modifier, SelectedModifier, Station. Extend Table, Product, OrderItem, Order |
| `lib/mock-data.ts` | Add initialZones, initialModifiers. Update tables (positions, zones, shapes) and products (stations, modifierIds) |
| `lib/pos-context.tsx` | Add zones/modifiers to state, new actions (zone/modifier CRUD, MOVE_TABLE, TRANSFER_TABLE, TOGGLE_RUSH, ADVANCE_COURSE), update calculateTotal for modifiers, persist zones/modifiers |
| `app/(pos)/tables/page.tsx` | Replace grid with FloorPlanView |
| `app/(pos)/kitchen/page.tsx` | Add station tabs, use color timers, show courses |
| `app/(pos)/orders/[tableId]/page.tsx` | Add modifier selection, course management, RUSH button, transfer button |
| `app/(pos)/menu/page.tsx` | Add "Modifiers" tab |
| `app/(pos)/settings/page.tsx` | Add "Floor Plan" section with editor |
| `components/pos/kitchen-order.tsx` | Rewrite: color-coded borders, MM:SS timer, station routing, RUSH styling, modifier display, course filtering |

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install @dnd-kit packages**

Run:
```bash
cd C:/Users/ntont/Desktop/mauri_thalasa && pnpm add @dnd-kit/core @dnd-kit/utilities
```

- [ ] **Step 2: Verify installation**

Run:
```bash
cd C:/Users/ntont/Desktop/mauri_thalasa && pnpm ls @dnd-kit/core @dnd-kit/utilities
```

Expected: Both packages listed with versions.

- [ ] **Step 3: Verify dev server still starts**

Run:
```bash
cd C:/Users/ntont/Desktop/mauri_thalasa && pnpm dev &
sleep 5 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

Expected: HTTP 200 (or 307 redirect). Kill the dev server after.

---

## Task 2: Update Types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Replace entire `lib/types.ts`**

```typescript
// EatFlow POS - Type Definitions

export type Station = 'hot' | 'cold' | 'bar' | 'dessert'

export interface Zone {
  id: string
  name: string
  color: string
  order: number
}

export interface Modifier {
  id: string
  name: string
  price: number
  categoryIds: string[]
}

export interface SelectedModifier {
  modifierId: string
  name: string
  price: number
}

export interface Table {
  id: string
  number: number
  capacity: number
  status: 'available' | 'occupied' | 'bill-requested' | 'dirty'
  currentOrderId?: string
  zoneId: string
  x: number
  y: number
  shape: 'square' | 'round' | 'rectangle'
  rotation: number
}

export interface Category {
  id: string
  name: string
  order: number
}

export interface Product {
  id: string
  name: string
  price: number
  categoryId: string
  description?: string
  vatRate: 24 | 13
  available: boolean
  station: Station
  modifierIds: string[]
}

export interface OrderItem {
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
  station: Station
}

export interface Order {
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

export interface DailySummary {
  date: string
  totalRevenue: number
  orderCount: number
  averageCheck: number
  cashPayments: number
  cardPayments: number
  topProducts: { productId: string; productName: string; quantity: number; revenue: number }[]
  hourlyRevenue: { hour: number; revenue: number }[]
}

// Helper types
export type TableStatus = Table['status']
export type OrderStatus = Order['status']
export type OrderItemStatus = OrderItem['status']
```

- [ ] **Step 2: Verify no TypeScript errors in the types file itself**

Run:
```bash
cd C:/Users/ntont/Desktop/mauri_thalasa && npx tsc --noEmit lib/types.ts 2>&1 | head -20
```

Note: This will show errors in other files that import from types — that's expected and fixed in subsequent tasks.

---

## Task 3: Update Mock Data

**Files:**
- Modify: `lib/mock-data.ts`

- [ ] **Step 1: Replace entire `lib/mock-data.ts`**

```typescript
// EatFlow POS - Mock Data for Greek Restaurant

import type { Table, Category, Product, Order, Zone, Modifier } from './types'

// === Zones ===
export const initialZones: Zone[] = [
  { id: 'zone1', name: 'Εσωτερικό', color: '#3b82f6', order: 1 },
  { id: 'zone2', name: 'Βεράντα', color: '#22c55e', order: 2 },
  { id: 'zone3', name: 'Μπαρ', color: '#f59e0b', order: 3 },
]

// === Tables (with positions for floor plan) ===
export const initialTables: Table[] = [
  // Εσωτερικό (zone1) - 6 tables
  { id: 't1', number: 1, capacity: 2, status: 'available', zoneId: 'zone1', x: 10, y: 15, shape: 'round', rotation: 0 },
  { id: 't2', number: 2, capacity: 2, status: 'available', zoneId: 'zone1', x: 30, y: 15, shape: 'round', rotation: 0 },
  { id: 't3', number: 3, capacity: 4, status: 'available', zoneId: 'zone1', x: 10, y: 45, shape: 'square', rotation: 0 },
  { id: 't4', number: 4, capacity: 4, status: 'available', zoneId: 'zone1', x: 30, y: 45, shape: 'square', rotation: 0 },
  { id: 't5', number: 5, capacity: 4, status: 'available', zoneId: 'zone1', x: 10, y: 75, shape: 'square', rotation: 0 },
  { id: 't6', number: 6, capacity: 6, status: 'available', zoneId: 'zone1', x: 30, y: 75, shape: 'rectangle', rotation: 0 },
  // Βεράντα (zone2) - 4 tables
  { id: 't7', number: 7, capacity: 6, status: 'available', zoneId: 'zone2', x: 60, y: 15, shape: 'rectangle', rotation: 0 },
  { id: 't8', number: 8, capacity: 2, status: 'available', zoneId: 'zone2', x: 80, y: 15, shape: 'round', rotation: 0 },
  { id: 't9', number: 9, capacity: 4, status: 'available', zoneId: 'zone2', x: 60, y: 50, shape: 'square', rotation: 0 },
  { id: 't10', number: 10, capacity: 4, status: 'available', zoneId: 'zone2', x: 80, y: 50, shape: 'square', rotation: 0 },
  // Μπαρ (zone3) - 2 tables
  { id: 't11', number: 11, capacity: 6, status: 'available', zoneId: 'zone3', x: 60, y: 80, shape: 'rectangle', rotation: 0 },
  { id: 't12', number: 12, capacity: 8, status: 'available', zoneId: 'zone3', x: 80, y: 80, shape: 'rectangle', rotation: 0 },
]

// === Categories ===
export const initialCategories: Category[] = [
  { id: 'cat1', name: 'Ορεκτικά', order: 1 },
  { id: 'cat2', name: 'Σαλάτες', order: 2 },
  { id: 'cat3', name: 'Κυρίως Πιάτα', order: 3 },
  { id: 'cat4', name: 'Θαλασσινά', order: 4 },
  { id: 'cat5', name: 'Ποτά', order: 5 },
  { id: 'cat6', name: 'Κρασιά', order: 6 },
  { id: 'cat7', name: 'Επιδόρπια', order: 7 },
]

// === Modifiers ===
export const initialModifiers: Modifier[] = [
  { id: 'mod1', name: 'Χωρίς κρεμμύδι', price: 0, categoryIds: ['cat3', 'cat2'] },
  { id: 'mod2', name: 'Χωρίς σάλτσα', price: 0, categoryIds: ['cat3'] },
  { id: 'mod3', name: 'Extra τυρί', price: 1.50, categoryIds: ['cat3', 'cat2'] },
  { id: 'mod4', name: 'Extra μπέικον', price: 2.00, categoryIds: ['cat3'] },
  { id: 'mod5', name: 'Well done', price: 0, categoryIds: ['cat3'] },
  { id: 'mod6', name: 'Medium', price: 0, categoryIds: ['cat3'] },
  { id: 'mod7', name: 'Rare', price: 0, categoryIds: ['cat3'] },
  { id: 'mod8', name: 'Χωρίς γλουτένη', price: 0, categoryIds: ['cat3', 'cat1'] },
  { id: 'mod9', name: 'Χωρίς λακτόζη', price: 0, categoryIds: ['cat3', 'cat1', 'cat7'] },
  { id: 'mod10', name: 'Χωρίς πάγο', price: 0, categoryIds: ['cat5'] },
  { id: 'mod11', name: 'Extra σιρόπι', price: 0.50, categoryIds: ['cat5'] },
]

// === Products (with station + modifierIds) ===
export const initialProducts: Product[] = [
  // Ορεκτικά (cold station)
  { id: 'p1', name: 'Τζατζίκι', price: 4.50, categoryId: 'cat1', description: 'Παραδοσιακό τζατζίκι με σκόρδο', vatRate: 13, available: true, station: 'cold', modifierIds: [] },
  { id: 'p2', name: 'Ταραμοσαλάτα', price: 5.00, categoryId: 'cat1', description: 'Σπιτική ταραμοσαλάτα', vatRate: 13, available: true, station: 'cold', modifierIds: [] },
  { id: 'p3', name: 'Μελιτζανοσαλάτα', price: 5.00, categoryId: 'cat1', description: 'Καπνιστή μελιτζάνα', vatRate: 13, available: true, station: 'cold', modifierIds: [] },
  { id: 'p4', name: 'Φέτα Ψητή', price: 6.50, categoryId: 'cat1', description: 'Φέτα στο φούρνο με πιπεριά και ντομάτα', vatRate: 13, available: true, station: 'hot', modifierIds: [] },
  { id: 'p5', name: 'Σαγανάκι', price: 7.00, categoryId: 'cat1', description: 'Τηγανητό τυρί κεφαλογραβιέρα', vatRate: 13, available: true, station: 'hot', modifierIds: [] },
  { id: 'p6', name: 'Κολοκυθοκεφτέδες', price: 6.00, categoryId: 'cat1', description: 'Σπιτικοί κολοκυθοκεφτέδες', vatRate: 13, available: true, station: 'hot', modifierIds: [] },

  // Σαλάτες (cold station)
  { id: 'p7', name: 'Χωριάτικη', price: 8.00, categoryId: 'cat2', description: 'Ντομάτα, αγγούρι, πιπεριά, κρεμμύδι, ελιές, φέτα', vatRate: 13, available: true, station: 'cold', modifierIds: [] },
  { id: 'p8', name: 'Σαλάτα του Σεφ', price: 9.50, categoryId: 'cat2', description: 'Μαρούλι, ρόκα, ντοματίνια, παρμεζάνα', vatRate: 13, available: true, station: 'cold', modifierIds: [] },
  { id: 'p9', name: 'Σαλάτα Κρητική', price: 8.50, categoryId: 'cat2', description: 'Παξιμάδι, ντομάτα, ξυνομυζήθρα', vatRate: 13, available: true, station: 'cold', modifierIds: [] },

  // Κυρίως Πιάτα (hot station)
  { id: 'p10', name: 'Μουσακάς', price: 12.00, categoryId: 'cat3', description: 'Παραδοσιακός μουσακάς', vatRate: 13, available: true, station: 'hot', modifierIds: [] },
  { id: 'p11', name: 'Παστίτσιο', price: 11.00, categoryId: 'cat3', description: 'Κλασικό παστίτσιο με κιμά', vatRate: 13, available: true, station: 'hot', modifierIds: [] },
  { id: 'p12', name: 'Σουβλάκι Χοιρινό', price: 10.00, categoryId: 'cat3', description: 'Δύο καλαμάκια με πίτα και πατάτες', vatRate: 13, available: true, station: 'hot', modifierIds: [] },
  { id: 'p13', name: 'Μπιφτέκι', price: 11.50, categoryId: 'cat3', description: 'Χειροποίητο μπιφτέκι με φέτα', vatRate: 13, available: true, station: 'hot', modifierIds: [] },
  { id: 'p14', name: 'Κοτόπουλο Σχάρας', price: 10.50, categoryId: 'cat3', description: 'Φιλέτο κοτόπουλο με λαχανικά', vatRate: 13, available: true, station: 'hot', modifierIds: [] },
  { id: 'p15', name: 'Αρνίσια Παϊδάκια', price: 16.00, categoryId: 'cat3', description: 'Παϊδάκια στα κάρβουνα', vatRate: 13, available: true, station: 'hot', modifierIds: [] },

  // Θαλασσινά (hot station)
  { id: 'p16', name: 'Καλαμαράκια Τηγανητά', price: 12.00, categoryId: 'cat4', description: 'Τραγανά καλαμαράκια', vatRate: 13, available: true, station: 'hot', modifierIds: [] },
  { id: 'p17', name: 'Γαρίδες Σαγανάκι', price: 14.00, categoryId: 'cat4', description: 'Γαρίδες με σάλτσα φέτας', vatRate: 13, available: true, station: 'hot', modifierIds: [] },
  { id: 'p18', name: 'Τσιπούρα Σχάρας', price: 18.00, categoryId: 'cat4', description: 'Φρέσκια τσιπούρα', vatRate: 13, available: true, station: 'hot', modifierIds: [] },

  // Ποτά (bar station)
  { id: 'p19', name: 'Νερό 500ml', price: 1.00, categoryId: 'cat5', vatRate: 24, available: true, station: 'bar', modifierIds: [] },
  { id: 'p20', name: 'Νερό 1L', price: 1.50, categoryId: 'cat5', vatRate: 24, available: true, station: 'bar', modifierIds: [] },
  { id: 'p21', name: 'Coca-Cola', price: 2.50, categoryId: 'cat5', vatRate: 24, available: true, station: 'bar', modifierIds: [] },
  { id: 'p22', name: 'Πορτοκαλάδα', price: 2.50, categoryId: 'cat5', vatRate: 24, available: true, station: 'bar', modifierIds: [] },
  { id: 'p23', name: 'Μπύρα Μύθος', price: 4.00, categoryId: 'cat5', vatRate: 24, available: true, station: 'bar', modifierIds: [] },
  { id: 'p24', name: 'Μπύρα Fix', price: 4.00, categoryId: 'cat5', vatRate: 24, available: true, station: 'bar', modifierIds: [] },
  { id: 'p25', name: 'Ούζο 200ml', price: 8.00, categoryId: 'cat5', vatRate: 24, available: true, station: 'bar', modifierIds: [] },
  { id: 'p26', name: 'Τσίπουρο', price: 6.00, categoryId: 'cat5', vatRate: 24, available: true, station: 'bar', modifierIds: [] },

  // Κρασιά (bar station)
  { id: 'p27', name: 'Κρασί Λευκό (500ml)', price: 8.00, categoryId: 'cat6', description: 'Χύμα λευκό κρασί', vatRate: 24, available: true, station: 'bar', modifierIds: [] },
  { id: 'p28', name: 'Κρασί Κόκκινο (500ml)', price: 8.00, categoryId: 'cat6', description: 'Χύμα κόκκινο κρασί', vatRate: 24, available: true, station: 'bar', modifierIds: [] },
  { id: 'p29', name: 'Κρασί Ροζέ (500ml)', price: 8.50, categoryId: 'cat6', description: 'Χύμα ροζέ κρασί', vatRate: 24, available: true, station: 'bar', modifierIds: [] },

  // Επιδόρπια (dessert station)
  { id: 'p30', name: 'Γαλακτομπούρεκο', price: 5.00, categoryId: 'cat7', description: 'Σπιτικό γαλακτομπούρεκο', vatRate: 13, available: true, station: 'dessert', modifierIds: [] },
  { id: 'p31', name: 'Μπακλαβάς', price: 5.00, categoryId: 'cat7', description: 'Παραδοσιακός μπακλαβάς', vatRate: 13, available: true, station: 'dessert', modifierIds: [] },
  { id: 'p32', name: 'Παγωτό', price: 4.50, categoryId: 'cat7', description: 'Δύο μπάλες της επιλογής σας', vatRate: 13, available: true, station: 'dessert', modifierIds: [] },
  { id: 'p33', name: 'Φρέσκα Φρούτα', price: 6.00, categoryId: 'cat7', description: 'Εποχιακά φρούτα', vatRate: 13, available: true, station: 'dessert', modifierIds: [] },
]

export const initialOrders: Order[] = []

// Helper function to generate unique IDs
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

// Helper to format price in Greek format
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

// Helper to format date/time in Greek
export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('el-GR', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(dateString))
}

export function formatTime(dateString: string): string {
  return new Intl.DateTimeFormat('el-GR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}
```

- [ ] **Step 2: Commit types + mock data**

```bash
cd C:/Users/ntont/Desktop/mauri_thalasa
git add lib/types.ts lib/mock-data.ts
git commit -m "feat(types): add Zone, Modifier, Station types and update Table/Product/Order/OrderItem"
```

---

## Task 4: Update Context (pos-context.tsx)

**Files:**
- Modify: `lib/pos-context.tsx`

This is the largest single change. The context needs new state fields, new actions, and updated helper functions.

- [ ] **Step 1: Replace entire `lib/pos-context.tsx`**

```typescript
'use client'

import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react'
import type { Table, Category, Product, Order, OrderItem, Zone, Modifier, SelectedModifier, Station } from './types'
import { initialTables, initialCategories, initialProducts, initialOrders, initialZones, initialModifiers, generateId } from './mock-data'

// State interface
interface POSState {
  tables: Table[]
  categories: Category[]
  products: Product[]
  orders: Order[]
  zones: Zone[]
  modifiers: Modifier[]
  isLoaded: boolean
}

// Action types
type POSAction =
  | { type: 'LOAD_STATE'; payload: Partial<POSState> }
  | { type: 'SET_LOADED' }
  | { type: 'RESET_STATE' }
  // Table actions
  | { type: 'UPDATE_TABLE'; payload: Table }
  | { type: 'ADD_TABLE'; payload: Table }
  | { type: 'DELETE_TABLE'; payload: string }
  | { type: 'SET_TABLE_STATUS'; payload: { tableId: string; status: Table['status']; orderId?: string } }
  | { type: 'MOVE_TABLE'; payload: { tableId: string; x: number; y: number } }
  | { type: 'TRANSFER_TABLE'; payload: { orderId: string; fromTableId: string; toTableId: string } }
  // Zone actions
  | { type: 'ADD_ZONE'; payload: Zone }
  | { type: 'UPDATE_ZONE'; payload: Zone }
  | { type: 'DELETE_ZONE'; payload: string }
  // Category actions
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  // Product actions
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'TOGGLE_PRODUCT_AVAILABILITY'; payload: string }
  // Modifier actions
  | { type: 'ADD_MODIFIER'; payload: Modifier }
  | { type: 'UPDATE_MODIFIER'; payload: Modifier }
  | { type: 'DELETE_MODIFIER'; payload: string }
  // Order actions
  | { type: 'CREATE_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'ADD_ORDER_ITEM'; payload: { orderId: string; item: OrderItem } }
  | { type: 'UPDATE_ORDER_ITEM'; payload: { orderId: string; item: OrderItem } }
  | { type: 'REMOVE_ORDER_ITEM'; payload: { orderId: string; itemId: string } }
  | { type: 'UPDATE_ITEM_STATUS'; payload: { orderId: string; itemId: string; status: OrderItem['status'] } }
  | { type: 'COMPLETE_ORDER'; payload: { orderId: string; paymentMethod: 'cash' | 'card' } }
  | { type: 'CANCEL_ORDER'; payload: string }
  | { type: 'TOGGLE_RUSH'; payload: string }
  | { type: 'ADVANCE_COURSE'; payload: string }

// Helper functions
function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => {
    const modifierTotal = item.modifiers.reduce((ms, m) => ms + m.price, 0)
    return sum + (item.price + modifierTotal) * item.quantity
  }, 0)
}

function calculateVAT(items: OrderItem[], products: Product[]): number {
  return items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId)
    const vatRate = product?.vatRate || 24
    const modifierTotal = item.modifiers.reduce((ms, m) => ms + m.price, 0)
    const itemTotal = (item.price + modifierTotal) * item.quantity
    return sum + (itemTotal * vatRate / (100 + vatRate))
  }, 0)
}

// Reducer
function posReducer(state: POSState, action: POSAction): POSState {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...state, ...action.payload }

    case 'SET_LOADED':
      return { ...state, isLoaded: true }

    case 'RESET_STATE':
      return { ...initialState, isLoaded: true }

    // === Table actions ===
    case 'UPDATE_TABLE':
      return {
        ...state,
        tables: state.tables.map(t => t.id === action.payload.id ? action.payload : t)
      }

    case 'ADD_TABLE':
      return { ...state, tables: [...state.tables, action.payload] }

    case 'DELETE_TABLE':
      return { ...state, tables: state.tables.filter(t => t.id !== action.payload) }

    case 'SET_TABLE_STATUS':
      return {
        ...state,
        tables: state.tables.map(t =>
          t.id === action.payload.tableId
            ? { ...t, status: action.payload.status, currentOrderId: action.payload.orderId }
            : t
        )
      }

    case 'MOVE_TABLE':
      return {
        ...state,
        tables: state.tables.map(t =>
          t.id === action.payload.tableId
            ? { ...t, x: action.payload.x, y: action.payload.y }
            : t
        )
      }

    case 'TRANSFER_TABLE': {
      const order = state.orders.find(o => o.id === action.payload.orderId)
      const toTable = state.tables.find(t => t.id === action.payload.toTableId)
      if (!order || !toTable) return state

      return {
        ...state,
        orders: state.orders.map(o =>
          o.id === action.payload.orderId
            ? { ...o, tableId: action.payload.toTableId, tableNumber: toTable.number }
            : o
        ),
        tables: state.tables.map(t => {
          if (t.id === action.payload.fromTableId) {
            return { ...t, status: 'available' as const, currentOrderId: undefined }
          }
          if (t.id === action.payload.toTableId) {
            return { ...t, status: 'occupied' as const, currentOrderId: action.payload.orderId }
          }
          return t
        })
      }
    }

    // === Zone actions ===
    case 'ADD_ZONE':
      return { ...state, zones: [...state.zones, action.payload] }

    case 'UPDATE_ZONE':
      return {
        ...state,
        zones: state.zones.map(z => z.id === action.payload.id ? action.payload : z)
      }

    case 'DELETE_ZONE':
      return {
        ...state,
        zones: state.zones.filter(z => z.id !== action.payload)
      }

    // === Category actions ===
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] }

    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map(c => c.id === action.payload.id ? action.payload : c)
      }

    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(c => c.id !== action.payload)
      }

    // === Product actions ===
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] }

    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p => p.id === action.payload.id ? action.payload : p)
      }

    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(p => p.id !== action.payload)
      }

    case 'TOGGLE_PRODUCT_AVAILABILITY':
      return {
        ...state,
        products: state.products.map(p =>
          p.id === action.payload ? { ...p, available: !p.available } : p
        )
      }

    // === Modifier actions ===
    case 'ADD_MODIFIER':
      return { ...state, modifiers: [...state.modifiers, action.payload] }

    case 'UPDATE_MODIFIER':
      return {
        ...state,
        modifiers: state.modifiers.map(m => m.id === action.payload.id ? action.payload : m)
      }

    case 'DELETE_MODIFIER':
      return {
        ...state,
        modifiers: state.modifiers.filter(m => m.id !== action.payload)
      }

    // === Order actions ===
    case 'CREATE_ORDER':
      return { ...state, orders: [...state.orders, action.payload] }

    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map(o => o.id === action.payload.id ? action.payload : o)
      }

    case 'ADD_ORDER_ITEM': {
      return {
        ...state,
        orders: state.orders.map(o => {
          if (o.id === action.payload.orderId) {
            const newItems = [...o.items, action.payload.item]
            return {
              ...o,
              items: newItems,
              total: calculateTotal(newItems),
              vatAmount: calculateVAT(newItems, state.products)
            }
          }
          return o
        })
      }
    }

    case 'UPDATE_ORDER_ITEM': {
      return {
        ...state,
        orders: state.orders.map(o => {
          if (o.id === action.payload.orderId) {
            const newItems = o.items.map(i =>
              i.id === action.payload.item.id ? action.payload.item : i
            )
            return {
              ...o,
              items: newItems,
              total: calculateTotal(newItems),
              vatAmount: calculateVAT(newItems, state.products)
            }
          }
          return o
        })
      }
    }

    case 'REMOVE_ORDER_ITEM': {
      return {
        ...state,
        orders: state.orders.map(o => {
          if (o.id === action.payload.orderId) {
            const newItems = o.items.filter(i => i.id !== action.payload.itemId)
            return {
              ...o,
              items: newItems,
              total: calculateTotal(newItems),
              vatAmount: calculateVAT(newItems, state.products)
            }
          }
          return o
        })
      }
    }

    case 'UPDATE_ITEM_STATUS':
      return {
        ...state,
        orders: state.orders.map(o => {
          if (o.id === action.payload.orderId) {
            return {
              ...o,
              items: o.items.map(i =>
                i.id === action.payload.itemId ? { ...i, status: action.payload.status } : i
              )
            }
          }
          return o
        })
      }

    case 'COMPLETE_ORDER': {
      const order = state.orders.find(o => o.id === action.payload.orderId)
      if (!order) return state

      return {
        ...state,
        orders: state.orders.map(o =>
          o.id === action.payload.orderId
            ? {
                ...o,
                status: 'completed',
                paymentMethod: action.payload.paymentMethod,
                completedAt: new Date().toISOString()
              }
            : o
        ),
        tables: state.tables.map(t =>
          t.id === order.tableId
            ? { ...t, status: 'available' as const, currentOrderId: undefined }
            : t
        )
      }
    }

    case 'CANCEL_ORDER': {
      const order = state.orders.find(o => o.id === action.payload)
      if (!order) return state

      return {
        ...state,
        orders: state.orders.map(o =>
          o.id === action.payload ? { ...o, status: 'cancelled' } : o
        ),
        tables: state.tables.map(t =>
          t.id === order.tableId
            ? { ...t, status: 'available' as const, currentOrderId: undefined }
            : t
        )
      }
    }

    case 'TOGGLE_RUSH':
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id === action.payload ? { ...o, isRush: !o.isRush } : o
        )
      }

    case 'ADVANCE_COURSE':
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id === action.payload ? { ...o, activeCourse: o.activeCourse + 1 } : o
        )
      }

    default:
      return state
  }
}

// Initial state
const initialState: POSState = {
  tables: initialTables,
  categories: initialCategories,
  products: initialProducts,
  orders: initialOrders,
  zones: initialZones,
  modifiers: initialModifiers,
  isLoaded: false
}

// Context
interface POSContextType {
  state: POSState
  dispatch: React.Dispatch<POSAction>
  getTable: (id: string) => Table | undefined
  getCategory: (id: string) => Category | undefined
  getProduct: (id: string) => Product | undefined
  getOrder: (id: string) => Order | undefined
  getActiveOrderForTable: (tableId: string) => Order | undefined
  getProductsByCategory: (categoryId: string) => Product[]
  getKitchenOrders: () => Order[]
  createNewOrder: (tableId: string, tableNumber: number) => string
  addItemToOrder: (orderId: string, product: Product, options?: { quantity?: number; notes?: string; modifiers?: SelectedModifier[]; course?: number }) => void
}

const POSContext = createContext<POSContextType | undefined>(undefined)

const STORAGE_KEY = 'eatflow-pos-state'

export function POSProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(posReducer, initialState)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        dispatch({ type: 'LOAD_STATE', payload: parsed })
      }
    } catch (e) {
      console.error('Failed to load state from localStorage:', e)
    }
    dispatch({ type: 'SET_LOADED' })
  }, [])

  useEffect(() => {
    if (state.isLoaded) {
      try {
        const toStore = {
          tables: state.tables,
          categories: state.categories,
          products: state.products,
          orders: state.orders,
          zones: state.zones,
          modifiers: state.modifiers
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
      } catch (e) {
        console.error('Failed to save state to localStorage:', e)
      }
    }
  }, [state])

  const getTable = (id: string) => state.tables.find(t => t.id === id)
  const getCategory = (id: string) => state.categories.find(c => c.id === id)
  const getProduct = (id: string) => state.products.find(p => p.id === id)
  const getOrder = (id: string) => state.orders.find(o => o.id === id)

  const getActiveOrderForTable = (tableId: string) =>
    state.orders.find(o => o.tableId === tableId && o.status === 'active')

  const getProductsByCategory = (categoryId: string) =>
    state.products.filter(p => p.categoryId === categoryId)

  const getKitchenOrders = () =>
    state.orders.filter(o =>
      o.status === 'active' &&
      o.items.some(i => i.status !== 'served')
    )

  const createNewOrder = (tableId: string, tableNumber: number): string => {
    const orderId = generateId()
    const newOrder: Order = {
      id: orderId,
      tableId,
      tableNumber,
      items: [],
      status: 'active',
      createdAt: new Date().toISOString(),
      total: 0,
      vatAmount: 0,
      activeCourse: 1,
      isRush: false
    }
    dispatch({ type: 'CREATE_ORDER', payload: newOrder })
    dispatch({ type: 'SET_TABLE_STATUS', payload: { tableId, status: 'occupied', orderId } })
    return orderId
  }

  const addItemToOrder = (
    orderId: string,
    product: Product,
    options: { quantity?: number; notes?: string; modifiers?: SelectedModifier[]; course?: number } = {}
  ) => {
    const { quantity = 1, notes, modifiers = [], course = 1 } = options
    const order = getOrder(orderId)
    if (!order) return

    // Only merge items if no modifiers and no notes (simple add)
    if (modifiers.length === 0 && !notes) {
      const existingItem = order.items.find(
        i => i.productId === product.id && i.status === 'pending' && !i.notes && i.modifiers.length === 0 && i.course === course
      )
      if (existingItem) {
        dispatch({
          type: 'UPDATE_ORDER_ITEM',
          payload: {
            orderId,
            item: { ...existingItem, quantity: existingItem.quantity + quantity }
          }
        })
        return
      }
    }

    const newItem: OrderItem = {
      id: generateId(),
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity,
      notes,
      status: 'pending',
      createdAt: new Date().toISOString(),
      modifiers,
      course,
      station: product.station
    }
    dispatch({ type: 'ADD_ORDER_ITEM', payload: { orderId, item: newItem } })
  }

  return (
    <POSContext.Provider value={{
      state,
      dispatch,
      getTable,
      getCategory,
      getProduct,
      getOrder,
      getActiveOrderForTable,
      getProductsByCategory,
      getKitchenOrders,
      createNewOrder,
      addItemToOrder
    }}>
      {children}
    </POSContext.Provider>
  )
}

export function usePOS() {
  const context = useContext(POSContext)
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider')
  }
  return context
}
```

- [ ] **Step 2: Clear localStorage and verify app loads**

Since types changed, old localStorage data will have the wrong shape. The user should clear browser localStorage or click "Επαναφορά Δεδομένων" in settings after this change.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/ntont/Desktop/mauri_thalasa
git add lib/pos-context.tsx
git commit -m "feat(context): add zones, modifiers, RUSH, courses, table transfer actions"
```

---

## Task 5: Create Custom Hooks

**Files:**
- Create: `hooks/use-table-layout.ts`
- Create: `hooks/use-modifiers.ts`
- Create: `hooks/use-kitchen.ts`
- Create: `hooks/use-orders.ts`

- [ ] **Step 1: Create `hooks/use-table-layout.ts`**

```typescript
import { usePOS } from '@/lib/pos-context'
import { generateId } from '@/lib/mock-data'
import type { Table, Zone } from '@/lib/types'

export function useTableLayout() {
  const { state, dispatch } = usePOS()

  const getTablesByZone = (zoneId: string) =>
    state.tables.filter(t => t.zoneId === zoneId)

  const getAvailableTables = () =>
    state.tables.filter(t => t.status === 'available')

  const addZone = (name: string, color: string) => {
    const zone: Zone = {
      id: generateId(),
      name,
      color,
      order: state.zones.length + 1
    }
    dispatch({ type: 'ADD_ZONE', payload: zone })
    return zone.id
  }

  const updateZone = (zone: Zone) => {
    dispatch({ type: 'UPDATE_ZONE', payload: zone })
  }

  const deleteZone = (zoneId: string) => {
    dispatch({ type: 'DELETE_ZONE', payload: zoneId })
  }

  const addTable = (zoneId: string, shape: Table['shape'] = 'square') => {
    const maxNumber = state.tables.reduce((max, t) => Math.max(max, t.number), 0)
    const table: Table = {
      id: generateId(),
      number: maxNumber + 1,
      capacity: 4,
      status: 'available',
      zoneId,
      x: 50,
      y: 50,
      shape,
      rotation: 0
    }
    dispatch({ type: 'ADD_TABLE', payload: table })
    return table.id
  }

  const moveTable = (tableId: string, x: number, y: number) => {
    dispatch({ type: 'MOVE_TABLE', payload: { tableId, x, y } })
  }

  const deleteTable = (tableId: string) => {
    dispatch({ type: 'DELETE_TABLE', payload: tableId })
  }

  const transferTable = (orderId: string, fromTableId: string, toTableId: string) => {
    dispatch({ type: 'TRANSFER_TABLE', payload: { orderId, fromTableId, toTableId } })
  }

  return {
    zones: state.zones,
    tables: state.tables,
    getTablesByZone,
    getAvailableTables,
    addZone,
    updateZone,
    deleteZone,
    addTable,
    moveTable,
    deleteTable,
    transferTable
  }
}
```

- [ ] **Step 2: Create `hooks/use-modifiers.ts`**

```typescript
import { usePOS } from '@/lib/pos-context'
import { generateId } from '@/lib/mock-data'
import type { Modifier, Product, SelectedModifier } from '@/lib/types'

export function useModifiers() {
  const { state, dispatch } = usePOS()

  const getModifiersForProduct = (product: Product): Modifier[] => {
    // Get modifiers that apply to this product's category
    const categoryModifiers = state.modifiers.filter(m =>
      m.categoryIds.includes(product.categoryId)
    )
    // Also get product-specific modifiers
    const productModifiers = state.modifiers.filter(m =>
      product.modifierIds.includes(m.id)
    )
    // Combine and dedupe
    const allIds = new Set<string>()
    const result: Modifier[] = []
    for (const mod of [...categoryModifiers, ...productModifiers]) {
      if (!allIds.has(mod.id)) {
        allIds.add(mod.id)
        result.push(mod)
      }
    }
    return result
  }

  const calculateItemPrice = (basePrice: number, selectedModifiers: SelectedModifier[], quantity: number): number => {
    const modifierTotal = selectedModifiers.reduce((sum, m) => sum + m.price, 0)
    return (basePrice + modifierTotal) * quantity
  }

  const addModifier = (name: string, price: number, categoryIds: string[]) => {
    const modifier: Modifier = {
      id: generateId(),
      name,
      price,
      categoryIds
    }
    dispatch({ type: 'ADD_MODIFIER', payload: modifier })
    return modifier.id
  }

  const updateModifier = (modifier: Modifier) => {
    dispatch({ type: 'UPDATE_MODIFIER', payload: modifier })
  }

  const deleteModifier = (modifierId: string) => {
    dispatch({ type: 'DELETE_MODIFIER', payload: modifierId })
  }

  return {
    modifiers: state.modifiers,
    getModifiersForProduct,
    calculateItemPrice,
    addModifier,
    updateModifier,
    deleteModifier
  }
}
```

- [ ] **Step 3: Create `hooks/use-kitchen.ts`**

```typescript
import { usePOS } from '@/lib/pos-context'
import type { Order, Station } from '@/lib/types'

export type TimerColor = 'green' | 'amber' | 'red'

export function useKitchen() {
  const { state, dispatch } = usePOS()

  const getKitchenOrders = () =>
    state.orders.filter(o =>
      o.status === 'active' &&
      o.items.some(i => i.status !== 'served')
    )

  const getOrdersByStation = (station: Station): Order[] => {
    return getKitchenOrders().filter(o =>
      o.items.some(i => i.station === station && i.status !== 'served' && i.course <= o.activeCourse)
    )
  }

  const getTimerColor = (createdAt: string): TimerColor => {
    const diffMs = Date.now() - new Date(createdAt).getTime()
    const mins = diffMs / 60000
    if (mins < 5) return 'green'
    if (mins < 10) return 'amber'
    return 'red'
  }

  const formatTimer = (createdAt: string): string => {
    const diffMs = Date.now() - new Date(createdAt).getTime()
    const totalSeconds = Math.floor(diffMs / 1000)
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const toggleRush = (orderId: string) => {
    dispatch({ type: 'TOGGLE_RUSH', payload: orderId })
  }

  const advanceCourse = (orderId: string) => {
    dispatch({ type: 'ADVANCE_COURSE', payload: orderId })
  }

  const updateItemStatus = (orderId: string, itemId: string, status: 'pending' | 'preparing' | 'ready' | 'served') => {
    dispatch({ type: 'UPDATE_ITEM_STATUS', payload: { orderId, itemId, status } })
  }

  const markAllReady = (orderId: string) => {
    const order = state.orders.find(o => o.id === orderId)
    if (!order) return
    order.items.forEach(item => {
      if (item.status === 'preparing') {
        dispatch({ type: 'UPDATE_ITEM_STATUS', payload: { orderId, itemId: item.id, status: 'ready' } })
      }
    })
  }

  const getStationCounts = () => {
    const orders = getKitchenOrders()
    const counts: Record<Station | 'all', number> = { hot: 0, cold: 0, bar: 0, dessert: 0, all: 0 }
    for (const order of orders) {
      for (const item of order.items) {
        if (item.status !== 'served' && item.course <= order.activeCourse) {
          counts[item.station]++
          counts.all++
        }
      }
    }
    return counts
  }

  const isCourseComplete = (order: Order): boolean => {
    const courseItems = order.items.filter(i => i.course === order.activeCourse)
    return courseItems.length > 0 && courseItems.every(i => i.status === 'ready' || i.status === 'served')
  }

  const hasNextCourse = (order: Order): boolean => {
    return order.items.some(i => i.course > order.activeCourse)
  }

  return {
    getKitchenOrders,
    getOrdersByStation,
    getTimerColor,
    formatTimer,
    toggleRush,
    advanceCourse,
    updateItemStatus,
    markAllReady,
    getStationCounts,
    isCourseComplete,
    hasNextCourse
  }
}
```

- [ ] **Step 4: Create `hooks/use-orders.ts`**

```typescript
import { usePOS } from '@/lib/pos-context'
import type { Product, SelectedModifier } from '@/lib/types'

export function useOrders() {
  const { state, dispatch, getOrder, getActiveOrderForTable, createNewOrder, addItemToOrder } = usePOS()

  const sendToKitchen = (orderId: string) => {
    const order = getOrder(orderId)
    if (!order) return
    order.items.forEach(item => {
      if (item.status === 'pending') {
        dispatch({
          type: 'UPDATE_ITEM_STATUS',
          payload: { orderId, itemId: item.id, status: 'preparing' }
        })
      }
    })
  }

  const requestBill = (tableId: string, orderId: string) => {
    dispatch({
      type: 'SET_TABLE_STATUS',
      payload: { tableId, status: 'bill-requested', orderId }
    })
  }

  const cancelOrder = (orderId: string) => {
    dispatch({ type: 'CANCEL_ORDER', payload: orderId })
  }

  const updateItemQuantity = (orderId: string, itemId: string, quantity: number) => {
    const order = getOrder(orderId)
    if (!order) return
    const item = order.items.find(i => i.id === itemId)
    if (!item) return
    dispatch({
      type: 'UPDATE_ORDER_ITEM',
      payload: { orderId, item: { ...item, quantity } }
    })
  }

  const removeItem = (orderId: string, itemId: string) => {
    dispatch({ type: 'REMOVE_ORDER_ITEM', payload: { orderId, itemId } })
  }

  return {
    orders: state.orders,
    getOrder,
    getActiveOrderForTable,
    createNewOrder,
    addItemToOrder,
    sendToKitchen,
    requestBill,
    cancelOrder,
    updateItemQuantity,
    removeItem
  }
}
```

- [ ] **Step 5: Commit hooks**

```bash
cd C:/Users/ntont/Desktop/mauri_thalasa
git add hooks/use-table-layout.ts hooks/use-modifiers.ts hooks/use-kitchen.ts hooks/use-orders.ts
git commit -m "feat(hooks): add useTableLayout, useModifiers, useKitchen, useOrders hooks"
```

---

## Task 6: Table Shape Component

**Files:**
- Create: `components/pos/table-shape.tsx`

- [ ] **Step 1: Create `components/pos/table-shape.tsx`**

```typescript
'use client'

import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/mock-data'
import type { Table, Order } from '@/lib/types'

interface TableShapeProps {
  table: Table
  order?: Order
  zoneColor?: string
  onClick?: () => void
  isDragging?: boolean
  className?: string
}

const statusColors = {
  available: { bg: 'bg-green-500', border: 'border-green-600', text: 'text-white' },
  occupied: { bg: 'bg-red-500', border: 'border-red-600', text: 'text-white' },
  'bill-requested': { bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-white' },
  dirty: { bg: 'bg-gray-400', border: 'border-gray-500', text: 'text-white' },
}

const shapeClasses = {
  round: 'rounded-full',
  square: 'rounded-lg',
  rectangle: 'rounded-lg',
}

const shapeSizes = {
  round: 'w-14 h-14',
  square: 'w-14 h-14',
  rectangle: 'w-20 h-12',
}

export function TableShape({ table, order, zoneColor, onClick, isDragging, className }: TableShapeProps) {
  const colors = statusColors[table.status]

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center border-2 transition-all duration-200 cursor-pointer select-none',
        'hover:scale-110 active:scale-95',
        'shadow-md hover:shadow-lg',
        shapeSizes[table.shape],
        shapeClasses[table.shape],
        colors.bg,
        colors.border,
        colors.text,
        isDragging && 'opacity-50 scale-110 shadow-xl',
        table.status === 'bill-requested' && 'animate-pulse',
        className
      )}
      style={{ transform: `rotate(${table.rotation}deg)` }}
    >
      <span className="text-xs font-bold leading-none">T{table.number}</span>
      {table.status === 'occupied' && order && (
        <span className="text-[10px] leading-none opacity-90 mt-0.5">
          {formatPrice(order.total)}
        </span>
      )}
      {table.status === 'bill-requested' && (
        <span className="text-[9px] leading-none opacity-90 mt-0.5">BILL</span>
      )}
      {table.status === 'available' && (
        <span className="text-[10px] leading-none opacity-80 mt-0.5 flex items-center gap-0.5">
          <Users className="size-2.5" />
          {table.capacity}
        </span>
      )}
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/ntont/Desktop/mauri_thalasa
git add components/pos/table-shape.tsx
git commit -m "feat(ui): add TableShape component for floor plan rendering"
```

---

## Task 7: Floor Plan View (Live Mode)

**Files:**
- Create: `components/pos/floor-plan-view.tsx`
- Modify: `app/(pos)/tables/page.tsx`

- [ ] **Step 1: Create `components/pos/floor-plan-view.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { usePOS } from '@/lib/pos-context'
import { useTableLayout } from '@/hooks/use-table-layout'
import { TableShape } from '@/components/pos/table-shape'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FloorPlanViewProps {
  onTableClick: (tableId: string, tableNumber: number) => void
}

export function FloorPlanView({ onTableClick }: FloorPlanViewProps) {
  const { state, getActiveOrderForTable } = usePOS()
  const { zones } = useTableLayout()
  const [activeZone, setActiveZone] = useState<string | null>(null)

  const filteredTables = activeZone
    ? state.tables.filter(t => t.zoneId === activeZone)
    : state.tables

  return (
    <div className="space-y-4">
      {/* Zone filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeZone === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveZone(null)}
        >
          Όλα ({state.tables.length})
        </Button>
        {zones
          .sort((a, b) => a.order - b.order)
          .map(zone => {
            const count = state.tables.filter(t => t.zoneId === zone.id).length
            return (
              <Button
                key={zone.id}
                variant={activeZone === zone.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveZone(zone.id)}
                className={cn(
                  activeZone === zone.id && 'text-white'
                )}
                style={activeZone === zone.id ? { backgroundColor: zone.color } : undefined}
              >
                <span
                  className="size-2.5 rounded-full mr-1.5 inline-block"
                  style={{ backgroundColor: zone.color }}
                />
                {zone.name} ({count})
              </Button>
            )
          })}
      </div>

      {/* Floor plan canvas */}
      <div className="relative w-full border-2 border-dashed border-border rounded-xl bg-muted/30"
        style={{ paddingBottom: '60%' }}
      >
        <div className="absolute inset-0 p-4">
          {filteredTables.map(table => {
            const order = getActiveOrderForTable(table.id)
            const zone = zones.find(z => z.id === table.zoneId)
            return (
              <div
                key={table.id}
                className="absolute transition-all duration-200"
                style={{
                  left: `${table.x}%`,
                  top: `${table.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <TableShape
                  table={table}
                  order={order}
                  zoneColor={zone?.color}
                  onClick={() => onTableClick(table.id, table.number)}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-green-500" />
          <span className="text-muted-foreground">Ελεύθερο</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-red-500" />
          <span className="text-muted-foreground">Κατειλημμένο</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Λογαριασμός</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-gray-400" />
          <span className="text-muted-foreground">Βρώμικο</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace `app/(pos)/tables/page.tsx`**

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { usePOS } from '@/lib/pos-context'
import { FloorPlanView } from '@/components/pos/floor-plan-view'
import { Skeleton } from '@/components/ui/skeleton'

export default function TablesPage() {
  const router = useRouter()
  const { state, createNewOrder } = usePOS()

  const handleTableClick = (tableId: string, tableNumber: number) => {
    const table = state.tables.find(t => t.id === tableId)
    if (!table) return

    if (table.status === 'available') {
      createNewOrder(tableId, tableNumber)
      router.push(`/orders/${tableId}`)
    } else if (table.status === 'occupied') {
      router.push(`/orders/${tableId}`)
    } else if (table.status === 'bill-requested') {
      router.push(`/checkout/${tableId}`)
    }
  }

  if (!state.isLoaded) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    )
  }

  const availableCount = state.tables.filter(t => t.status === 'available').length
  const occupiedCount = state.tables.filter(t => t.status === 'occupied').length
  const billRequestedCount = state.tables.filter(t => t.status === 'bill-requested').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Τραπέζια</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {availableCount} διαθέσιμα • {occupiedCount} κατειλημμένα • {billRequestedCount} λογαριασμός
        </p>
      </div>

      <FloorPlanView onTableClick={handleTableClick} />
    </div>
  )
}
```

- [ ] **Step 3: Verify the tables page renders**

Run the dev server and navigate to `/tables`. You should see the spatial floor plan with tables positioned on a canvas, zone filter tabs, and a legend.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/ntont/Desktop/mauri_thalasa
git add components/pos/floor-plan-view.tsx app/\(pos\)/tables/page.tsx
git commit -m "feat(tables): replace grid with spatial floor plan view"
```

---

## Task 8: Floor Plan Editor (Edit Mode with Drag & Drop)

**Files:**
- Create: `components/pos/zone-manager.tsx`
- Create: `components/pos/floor-plan-editor.tsx`
- Modify: `app/(pos)/settings/page.tsx`

- [ ] **Step 1: Create `components/pos/zone-manager.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTableLayout } from '@/hooks/use-table-layout'
import type { Zone } from '@/lib/types'

const defaultColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function ZoneManager() {
  const { zones, addZone, updateZone, deleteZone } = useTableLayout()
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(defaultColors[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  const handleAdd = () => {
    if (!newName.trim()) return
    addZone(newName.trim(), newColor)
    setNewName('')
    setNewColor(defaultColors[0])
    setIsAdding(false)
  }

  const handleEdit = (zone: Zone) => {
    setEditingId(zone.id)
    setEditName(zone.name)
    setEditColor(zone.color)
  }

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return
    const zone = zones.find(z => z.id === editingId)
    if (!zone) return
    updateZone({ ...zone, name: editName.trim(), color: editColor })
    setEditingId(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Ζώνες</h3>
        <Button variant="ghost" size="sm" onClick={() => setIsAdding(!isAdding)}>
          <Plus className="size-4 mr-1" />
          Νέα Ζώνη
        </Button>
      </div>

      {isAdding && (
        <div className="flex gap-2 items-center">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Όνομα ζώνης"
            className="flex-1"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex gap-1">
            {defaultColors.map(color => (
              <button
                key={color}
                className="size-6 rounded-full border-2 transition-transform"
                style={{
                  backgroundColor: color,
                  borderColor: color === newColor ? 'white' : 'transparent',
                  transform: color === newColor ? 'scale(1.2)' : 'scale(1)'
                }}
                onClick={() => setNewColor(color)}
              />
            ))}
          </div>
          <Button size="sm" onClick={handleAdd}>OK</Button>
        </div>
      )}

      <div className="space-y-2">
        {zones.sort((a, b) => a.order - b.order).map(zone => (
          <div key={zone.id} className="flex items-center gap-2 rounded-lg border p-2">
            {editingId === zone.id ? (
              <>
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="flex-1 h-8"
                  onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                />
                <div className="flex gap-1">
                  {defaultColors.map(color => (
                    <button
                      key={color}
                      className="size-5 rounded-full border-2 transition-transform"
                      style={{
                        backgroundColor: color,
                        borderColor: color === editColor ? 'white' : 'transparent',
                        transform: color === editColor ? 'scale(1.2)' : 'scale(1)'
                      }}
                      onClick={() => setEditColor(color)}
                    />
                  ))}
                </div>
                <Button size="sm" variant="ghost" onClick={handleSaveEdit}>OK</Button>
              </>
            ) : (
              <>
                <span
                  className="size-4 rounded-full shrink-0"
                  style={{ backgroundColor: zone.color }}
                />
                <span className="flex-1 text-sm font-medium">{zone.name}</span>
                <Button variant="ghost" size="icon" className="size-7" onClick={() => handleEdit(zone)}>
                  <Pencil className="size-3" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => deleteZone(zone.id)}>
                  <Trash2 className="size-3" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/pos/floor-plan-editor.tsx`**

```typescript
'use client'

import { useCallback, useRef } from 'react'
import { DndContext, useDraggable, type DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Trash2, Circle, Square, RectangleHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTableLayout } from '@/hooks/use-table-layout'
import { ZoneManager } from '@/components/pos/zone-manager'
import type { Table } from '@/lib/types'

function DraggableTable({ table, zoneColor }: { table: Table; zoneColor?: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: table.id
  })

  const shapeClasses = {
    round: 'rounded-full w-14 h-14',
    square: 'rounded-lg w-14 h-14',
    rectangle: 'rounded-lg w-20 h-12',
  }

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'flex flex-col items-center justify-center border-2 cursor-grab active:cursor-grabbing select-none text-white font-bold shadow-md',
        shapeClasses[table.shape],
        isDragging && 'opacity-50 z-50 shadow-xl'
      )}
      style={{
        ...style,
        backgroundColor: zoneColor || '#6b7280',
        borderColor: zoneColor || '#6b7280',
      }}
    >
      <span className="text-xs">T{table.number}</span>
      <span className="text-[9px] opacity-70">{table.capacity}θ</span>
    </div>
  )
}

export function FloorPlanEditor() {
  const { zones, tables, addTable, moveTable, deleteTable } = useTableLayout()
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event
    if (!canvasRef.current) return

    const tableId = active.id as string
    const table = tables.find(t => t.id === tableId)
    if (!table) return

    const rect = canvasRef.current.getBoundingClientRect()
    const deltaXPercent = (delta.x / rect.width) * 100
    const deltaYPercent = (delta.y / rect.height) * 100

    const newX = Math.max(5, Math.min(95, table.x + deltaXPercent))
    const newY = Math.max(5, Math.min(95, table.y + deltaYPercent))

    moveTable(tableId, Math.round(newX), Math.round(newY))
  }, [tables, moveTable])

  const activeZoneId = zones[0]?.id

  return (
    <div className="space-y-4">
      <ZoneManager />

      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Πρόσθεσε τραπέζι:</span>
        {zones.map(zone => (
          <div key={zone.id} className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => addTable(zone.id, 'round')}
              title={`Στρογγυλό στη ζώνη ${zone.name}`}
            >
              <Circle className="size-3 mr-1" style={{ color: zone.color }} />
              {zone.name}
            </Button>
          </div>
        ))}
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <div
          ref={canvasRef}
          className="relative w-full border-2 border-dashed border-border rounded-xl bg-muted/30"
          style={{ paddingBottom: '60%' }}
        >
          <div className="absolute inset-0 p-4">
            {tables.map(table => {
              const zone = zones.find(z => z.id === table.zoneId)
              return (
                <div
                  key={table.id}
                  className="absolute group"
                  style={{
                    left: `${table.x}%`,
                    top: `${table.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <DraggableTable table={table} zoneColor={zone?.color} />
                  <button
                    onClick={() => deleteTable(table.id)}
                    className="absolute -top-2 -right-2 size-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </DndContext>

      <p className="text-xs text-muted-foreground">
        Σύρε τα τραπέζια για να τα τοποθετήσεις. Πέρασε πάνω από ένα τραπέζι για να το διαγράψεις.
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Add Floor Plan section to Settings page**

Read the current settings page, then add a new section for "Σχέδιο Χώρου" at the top. Add this import and section to `app/(pos)/settings/page.tsx`:

Import to add at top:
```typescript
import { FloorPlanEditor } from '@/components/pos/floor-plan-editor'
```

Add a new Card section before the existing restaurant info card:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Σχέδιο Χώρου</CardTitle>
    <p className="text-sm text-muted-foreground">
      Διαχειριστείτε τις ζώνες και τη διάταξη των τραπεζιών
    </p>
  </CardHeader>
  <CardContent>
    <FloorPlanEditor />
  </CardContent>
</Card>
```

- [ ] **Step 4: Verify editor works**

Run dev server, go to `/settings`. You should see:
- Zone manager (add/edit/delete zones)
- "Add table" buttons per zone
- Canvas with draggable tables
- Delete button on hover

- [ ] **Step 5: Commit**

```bash
cd C:/Users/ntont/Desktop/mauri_thalasa
git add components/pos/zone-manager.tsx components/pos/floor-plan-editor.tsx app/\(pos\)/settings/page.tsx
git commit -m "feat(floor-plan): add drag & drop floor plan editor in settings"
```

---

## Task 9: Modifier Chips & Modifier Manager Components

**Files:**
- Create: `components/pos/modifier-chips.tsx`
- Create: `components/pos/modifier-manager.tsx`

- [ ] **Step 1: Create `components/pos/modifier-chips.tsx`**

```typescript
'use client'

import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/mock-data'
import type { Modifier, SelectedModifier } from '@/lib/types'

interface ModifierChipsProps {
  modifiers: Modifier[]
  selected: SelectedModifier[]
  onToggle: (modifier: Modifier) => void
}

export function ModifierChips({ modifiers, selected, onToggle }: ModifierChipsProps) {
  const isSelected = (modId: string) => selected.some(s => s.modifierId === modId)

  if (modifiers.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase">Modifiers</p>
      <div className="flex flex-wrap gap-2">
        {modifiers.map(mod => (
          <button
            key={mod.id}
            onClick={() => onToggle(mod)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all border',
              isSelected(mod.id)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
            )}
          >
            {mod.name}
            {mod.price > 0 && (
              <span className={cn(
                'text-[10px]',
                isSelected(mod.id) ? 'opacity-80' : 'text-primary'
              )}>
                +{formatPrice(mod.price)}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/pos/modifier-manager.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useModifiers } from '@/hooks/use-modifiers'
import { usePOS } from '@/lib/pos-context'
import { formatPrice } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import type { Modifier } from '@/lib/types'

export function ModifierManager() {
  const { modifiers, addModifier, updateModifier, deleteModifier } = useModifiers()
  const { state } = usePOS()
  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleAdd = () => {
    if (!name.trim()) return
    addModifier(name.trim(), parseFloat(price) || 0, selectedCats)
    setName('')
    setPrice('')
    setSelectedCats([])
    setIsAdding(false)
  }

  const toggleCategory = (catId: string) => {
    setSelectedCats(prev =>
      prev.includes(catId)
        ? prev.filter(c => c !== catId)
        : [...prev, catId]
    )
  }

  const handleStartEdit = (mod: Modifier) => {
    setEditingId(mod.id)
    setName(mod.name)
    setPrice(mod.price.toString())
    setSelectedCats(mod.categoryIds)
  }

  const handleSaveEdit = () => {
    if (!editingId || !name.trim()) return
    updateModifier({
      id: editingId,
      name: name.trim(),
      price: parseFloat(price) || 0,
      categoryIds: selectedCats
    })
    setEditingId(null)
    setName('')
    setPrice('')
    setSelectedCats([])
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setName('')
    setPrice('')
    setSelectedCats([])
  }

  const isFormOpen = isAdding || editingId !== null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Modifiers</h3>
        {!isFormOpen && (
          <Button size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="size-4 mr-1" />
            Νέο Modifier
          </Button>
        )}
      </div>

      {isFormOpen && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Όνομα (π.χ. Extra τυρί)"
              className="flex-1"
            />
            <Input
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="Τιμή (0 = δωρεάν)"
              type="number"
              step="0.10"
              min="0"
              className="w-32"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Εφαρμόζεται σε κατηγορίες:</p>
            <div className="flex flex-wrap gap-2">
              {state.categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                    selectedCats.includes(cat.id)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border'
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={editingId ? handleSaveEdit : handleAdd}>
              {editingId ? 'Αποθήκευση' : 'Προσθήκη'}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              Ακύρωση
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {modifiers.map(mod => (
          <div key={mod.id} className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{mod.name}</span>
                {mod.price > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    +{formatPrice(mod.price)}
                  </Badge>
                )}
              </div>
              <div className="flex gap-1 mt-1">
                {mod.categoryIds.map(catId => {
                  const cat = state.categories.find(c => c.id === catId)
                  return cat ? (
                    <span key={catId} className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                      {cat.name}
                    </span>
                  ) : null
                })}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="size-7" onClick={() => handleStartEdit(mod)}>
              <Pencil className="size-3" />
            </Button>
            <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => deleteModifier(mod.id)}>
              <Trash2 className="size-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add Modifiers tab to Menu page**

Read `app/(pos)/menu/page.tsx`, add a tab for "Modifiers" using Shadcn Tabs. Import `ModifierManager` and add it as a tab panel alongside the existing products section.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/ntont/Desktop/mauri_thalasa
git add components/pos/modifier-chips.tsx components/pos/modifier-manager.tsx app/\(pos\)/menu/page.tsx
git commit -m "feat(modifiers): add modifier chips, manager, and menu tab"
```

---

## Task 10: Update Order Page (Modifiers + Courses + RUSH + Transfer)

**Files:**
- Create: `components/pos/course-separator.tsx`
- Create: `components/pos/table-transfer-dialog.tsx`
- Modify: `app/(pos)/orders/[tableId]/page.tsx`

- [ ] **Step 1: Create `components/pos/course-separator.tsx`**

```typescript
'use client'

interface CourseSeparatorProps {
  courseNumber: number
}

export function CourseSeparator({ courseNumber }: CourseSeparatorProps) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex-1 border-t border-dashed border-border" />
      <span className="text-xs font-medium text-muted-foreground px-2">
        Course {courseNumber}
      </span>
      <div className="flex-1 border-t border-dashed border-border" />
    </div>
  )
}
```

- [ ] **Step 2: Create `components/pos/table-transfer-dialog.tsx`**

```typescript
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTableLayout } from '@/hooks/use-table-layout'
import { TableShape } from '@/components/pos/table-shape'

interface TableTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTableId: string
  orderId: string
  onTransfer: (toTableId: string) => void
}

export function TableTransferDialog({
  open,
  onOpenChange,
  currentTableId,
  orderId,
  onTransfer
}: TableTransferDialogProps) {
  const { tables, zones } = useTableLayout()

  const availableTables = tables.filter(t => t.id !== currentTableId && t.status === 'available')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Μεταφορά Τραπεζιού</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {availableTables.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Δεν υπάρχουν ελεύθερα τραπέζια
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Επιλέξτε το νέο τραπέζι:
              </p>
              <div className="grid grid-cols-4 gap-3">
                {availableTables.map(table => {
                  const zone = zones.find(z => z.id === table.zoneId)
                  return (
                    <div key={table.id} className="flex flex-col items-center gap-1">
                      <TableShape
                        table={table}
                        onClick={() => {
                          onTransfer(table.id)
                          onOpenChange(false)
                        }}
                      />
                      {zone && (
                        <span className="text-[10px] text-muted-foreground">{zone.name}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Rewrite `app/(pos)/orders/[tableId]/page.tsx`**

This is a significant rewrite. The page needs:
1. Modifier selection when adding items (sheet/panel opens with ModifierChips)
2. Course management ("Νέο Course" button, CourseSeparator in order list)
3. RUSH toggle button in header
4. Transfer button in header opening TableTransferDialog

Key changes from current page:
- `handleAddItem` now opens a sheet to select modifiers + quantity, then calls `addItemToOrder` with the options
- Order summary groups items by course with `CourseSeparator`
- Header row has RUSH toggle (AlertTriangle icon, red when active) and Transfer button
- "Νέο Course" button at bottom of order summary

The full rewrite should use `useModifiers()`, `useOrders()`, `useTableLayout()` hooks. Keep the same layout structure (3-column grid with menu left, order right).

- [ ] **Step 4: Verify the order page**

Run dev server, click a table, verify:
- Clicking a menu item shows a modifier selection panel
- Items appear grouped by course
- RUSH button toggles
- Transfer button opens dialog with available tables

- [ ] **Step 5: Commit**

```bash
cd C:/Users/ntont/Desktop/mauri_thalasa
git add components/pos/course-separator.tsx components/pos/table-transfer-dialog.tsx app/\(pos\)/orders/\[tableId\]/page.tsx
git commit -m "feat(orders): add modifiers, courses, RUSH toggle, table transfer"
```

---

## Task 11: Rewrite Kitchen Display (KDS)

**Files:**
- Modify: `components/pos/kitchen-order.tsx`
- Modify: `app/(pos)/kitchen/page.tsx`

- [ ] **Step 1: Rewrite `components/pos/kitchen-order.tsx`**

Complete rewrite with:
- Color-coded card border and header based on `getTimerColor()` (green/amber/red)
- MM:SS timer that updates every second (use `useEffect` + `setInterval`)
- RUSH styling: red border + pulsing animation + 🚨 icon
- Modifier display: bold amber text below each item
- Course indicator: only show items from `order.activeCourse`
- "Στείλε Course N" button when current course is complete
- Station badge on each item (small colored dot)

Props:
```typescript
interface KitchenOrderCardProps {
  order: Order
  timerColor: TimerColor
  timerText: string
  isCourseComplete: boolean
  hasNextCourse: boolean
  onItemStatusChange: (orderId: string, itemId: string, status: OrderItem['status']) => void
  onMarkAllReady: (orderId: string) => void
  onAdvanceCourse: (orderId: string) => void
}
```

The card layout matches the spec:
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

Color mapping for borders/headers:
- `green`: `border-green-500`, header `bg-green-500`
- `amber`: `border-amber-500`, header `bg-amber-500`
- `red`: `border-red-500`, header `bg-red-500`

RUSH override: always red + `animate-pulse` + box-shadow glow.

- [ ] **Step 2: Rewrite `app/(pos)/kitchen/page.tsx`**

Add:
- Station tabs at top: 🔥 Ζεστή Κουζίνα, ❄️ Κρύα Κουζίνα, 🍸 Μπαρ, 🍰 Γλυκά, 📋 Όλα
- Each tab shows count badge from `getStationCounts()`
- `activeStation` state filters which orders to show
- Timer interval: `setInterval` every 1000ms (not 30000ms) for MM:SS precision
- Pass timer data to each KitchenOrderCard
- Use `useKitchen()` hook for all logic

- [ ] **Step 3: Verify KDS**

Run dev server. Create an order, send to kitchen. Navigate to `/kitchen`:
- Cards show color-coded borders based on elapsed time
- Timer shows MM:SS and updates every second
- Station tabs filter orders
- RUSH orders have red pulsing cards

- [ ] **Step 4: Commit**

```bash
cd C:/Users/ntont/Desktop/mauri_thalasa
git add components/pos/kitchen-order.tsx app/\(pos\)/kitchen/page.tsx
git commit -m "feat(kds): add color timers, multi-station tabs, RUSH, course management"
```

---

## Task 12: Update Remaining Components for New Types

**Files:**
- Modify: `components/pos/order-item.tsx` — show modifiers below item name
- Modify: `components/pos/receipt-preview.tsx` — include modifiers in receipt
- Modify: `components/pos/payment-dialog.tsx` — no structural changes, but verify it works with new Order type

- [ ] **Step 1: Update `components/pos/order-item.tsx`**

Add modifier display below the product name:
```tsx
{item.modifiers.length > 0 && (
  <p className="text-xs text-amber-600 dark:text-amber-400">
    {item.modifiers.map(m => m.name).join(', ')}
  </p>
)}
```

Update price display to include modifier costs:
```typescript
const modifierTotal = item.modifiers.reduce((sum, m) => sum + m.price, 0)
const itemTotal = (item.price + modifierTotal) * item.quantity
```

- [ ] **Step 2: Update receipt and payment components**

Read each file, verify they work with the new types. The `Order.total` already includes modifier prices (handled in reducer), so most components should work without changes. Add modifier lines to receipt if applicable.

- [ ] **Step 3: Full smoke test**

Run dev server and walk through the complete flow:
1. Go to `/tables` — see floor plan with zones
2. Click a table — creates order, go to order page
3. Add items with modifiers (select chips, set quantity)
4. Add items to Course 2
5. Send to kitchen
6. Go to `/kitchen` — see color-coded cards, station tabs
7. Mark RUSH — card pulses red
8. Mark items ready — advance course
9. Request bill — go to checkout
10. Go to `/settings` — see floor plan editor, drag tables
11. Go to `/menu` — see Modifiers tab

- [ ] **Step 4: Commit**

```bash
cd C:/Users/ntont/Desktop/mauri_thalasa
git add -A
git commit -m "feat: update order-item and receipt for modifiers display"
```

---

## Task 13: Final Cleanup & Verification

- [ ] **Step 1: Clear localStorage and test fresh start**

Open browser DevTools → Application → Clear localStorage. Refresh the app. Everything should load with default mock data including zones, modifiers, and positioned tables.

- [ ] **Step 2: Verify no console errors**

Open DevTools Console. Navigate through all pages. No errors should appear.

- [ ] **Step 3: Final commit**

```bash
cd C:/Users/ntont/Desktop/mauri_thalasa
git add -A
git commit -m "chore: cleanup and verify enhanced core features"
```
