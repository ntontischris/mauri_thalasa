# Inventory & Recipes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inventory management (stock, waste, suppliers) and recipe management (food cost analysis) to EatFlow POS, replacing the generic menu with Μαύρη Θάλασσα's actual menu.

**Architecture:** Extends existing React Context + custom hooks pattern. Four new hooks (useInventory, useRecipes, useSuppliers, useWaste) wrap the single POSState. Two new pages (/inventory, /recipes) added to sidebar. COMPLETE_ORDER action updated to auto-deduct stock.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Shadcn/UI, Recharts (for waste charts), date-fns, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-03-27-inventory-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `hooks/use-inventory.ts` | Ingredient CRUD, stock status, alerts, stock adjustment |
| `hooks/use-recipes.ts` | Recipe CRUD, food cost calculation, margin calculation |
| `hooks/use-suppliers.ts` | Supplier CRUD, supplier order CRUD, receive orders |
| `hooks/use-waste.ts` | Waste logging, waste summaries |
| `components/pos/ingredient-table.tsx` | Ingredient list with status badges, filter, summary |
| `components/pos/ingredient-form.tsx` | Add/edit ingredient dialog |
| `components/pos/waste-form.tsx` | Waste entry form |
| `components/pos/waste-log.tsx` | Waste history table + summary cards |
| `components/pos/supplier-list.tsx` | Supplier CRUD list |
| `components/pos/supplier-order-form.tsx` | Create/edit supplier order |
| `components/pos/recipe-card.tsx` | Recipe card with food cost + margin |
| `components/pos/recipe-editor.tsx` | Recipe ingredient editor with live cost |
| `components/pos/food-cost-dashboard.tsx` | Summary cards for recipes page |
| `components/pos/stock-alert-badge.tsx` | Badge for sidebar low-stock count |
| `app/(pos)/inventory/page.tsx` | Stock management page (3 tabs) |
| `app/(pos)/recipes/page.tsx` | Recipes & food cost page |

### Modified Files
| File | Changes |
|------|---------|
| `lib/types.ts` | Add Ingredient, Recipe, WasteEntry, Supplier, SupplierOrder + helper types |
| `lib/mock-data.ts` | Replace menu with Μαύρη Θάλασσα + add ingredients, recipes, suppliers, waste |
| `lib/pos-context.tsx` | Add new state fields + 13 new actions + auto-deduction in COMPLETE_ORDER |
| `components/pos/sidebar.tsx` | Add Αποθήκη + Συνταγές nav items with stock alert badge |

---

## Task 1: Update Types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add new types to `lib/types.ts`**

Append these types after the existing ones (before the helper types section):

```typescript
// === Inventory Types ===

export type IngredientCategory = 'seafood' | 'meat' | 'dairy' | 'vegetables' | 'dry' | 'drinks' | 'other'
export type IngredientUnit = 'kg' | 'lt' | 'pcs' | 'gr' | 'ml'

export interface Ingredient {
  id: string
  name: string
  unit: IngredientUnit
  currentStock: number
  minStock: number
  costPerUnit: number
  supplierId?: string
  category: IngredientCategory
}

export interface RecipeIngredient {
  ingredientId: string
  quantity: number
  unit: IngredientUnit
}

export interface Recipe {
  id: string
  productId: string
  ingredients: RecipeIngredient[]
  prepTime: number
  portionSize: string
}

export type WasteReason = 'expired' | 'damaged' | 'overproduction' | 'returned'

export interface WasteEntry {
  id: string
  ingredientId: string
  quantity: number
  reason: WasteReason
  date: string
  notes?: string
}

export interface Supplier {
  id: string
  name: string
  phone?: string
  email?: string
  categories: IngredientCategory[]
}

export interface SupplierOrderItem {
  ingredientId: string
  quantity: number
  estimatedCost: number
}

export type SupplierOrderStatus = 'draft' | 'sent' | 'received'

export interface SupplierOrder {
  id: string
  supplierId: string
  items: SupplierOrderItem[]
  status: SupplierOrderStatus
  createdAt: string
  notes?: string
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): add Ingredient, Recipe, WasteEntry, Supplier, SupplierOrder types"
```

---

## Task 2: Replace Mock Data with Μαύρη Θάλασσα Menu

**Files:**
- Modify: `lib/mock-data.ts`

This is the largest single data change. Replace ALL categories, products with the real Μαύρη Θάλασσα menu, and add ingredients, recipes, suppliers, waste mock data.

- [ ] **Step 1: Read current `lib/mock-data.ts`**

Read the entire file to understand current exports and structure.

- [ ] **Step 2: Rewrite `lib/mock-data.ts`**

The file must export:
- `initialZones` — keep existing 3 zones (Εσωτερικό, Βεράντα, Μπαρ)
- `initialTables` — keep existing 12 tables (with x/y positions from Sub-project 1)
- `initialCategories` — REPLACE with 7 Μαύρη Θάλασσα categories:
  - cat1: Ωμά (order 1)
  - cat2: Κρύα Ορεκτικά (order 2)
  - cat3: Ζεστά Ορεκτικά (order 3)
  - cat4: Ψητά Θαλασσινά (order 4)
  - cat5: Μαγειρευτά (order 5)
  - cat6: Ζυμαρικά (order 6)
  - cat7: Γλυκά (order 7)

- `initialProducts` — REPLACE with ~25 Μαύρη Θάλασσα products. Each needs: id, name, price, categoryId, description, vatRate (13 for food), available (true), station, modifierIds ([]). Products:
  - **Ωμά (cat1, cold):** Καρπάτσιο Λαβρακιού €16, Καρπάτσιο Μπαρμπουνιού €18, Ταρτάρ Γαρίδας €18
  - **Κρύα Ορεκτικά (cat2, cold):** Ταραμοσαλάτα Λευκή €12, Μελιτζανοσαλάτα €8, Καβουροσαλάτα €16, Χτένια Ωμά €22
  - **Ζεστά Ορεκτικά (cat3, hot):** Σαγανάκι Γαρίδες €18, Αχνιστά Όστρακα €16, Καλαμαράκια Τηγανητά €14, Γαρίδες Τηγανητές €18
  - **Ψητά Θαλασσινά (cat4, hot):** Τσιπούρα Σχάρας €75, Μπαρμπούνι Σχάρας €85, Φαγκρί Σχάρας €95, Συναγρίδα Σχάρας €95, Γαρίδες Θερμαϊκού €95, Καλαμάρι Σχάρας €55, Χταπόδι Σχάρας €48
  - **Μαγειρευτά (cat5, hot):** Ψαρόσουπα €90, Φρικασέ Ψαριού €120, Κοκκινιστό με Μανιτάρια €120, Πλακί στο Φούρνο €140
  - **Ζυμαρικά (cat6, hot):** Γαριδομακαρονάδα €28, Αστακομακαρονάδα €45
  - **Γλυκά (cat7, dessert):** Μπακλαβάς Deconstructed €20, Τιραμισού €14, Lemon Bar €12, Cheesecake €14

- `initialModifiers` — keep existing modifiers, update categoryIds to match new category IDs

- `initialIngredients` — NEW export, ~30 ingredients as listed in spec section 10 (Θαλασσινά, Λαχανικά, Γαλακτοκομικά, Ξηρά, Ποτά). Include 2 near-minStock items for demo alerts:
  - Συναγρίδα: currentStock 2, minStock 2 (critical)
  - Καβούρι: currentStock 1.5, minStock 1 (low)

- `initialRecipes` — NEW export, one Recipe per product with realistic RecipeIngredient entries. Example:
  - Γαριδομακαρονάδα (productId matching): ingredients = [{ingredientId: γαρίδες, quantity: 0.3, unit: 'kg'}, {ingredientId: λιγκουίνι, quantity: 0.2, unit: 'kg'}, {ingredientId: σάλτσα ντομάτας, quantity: 0.1, unit: 'lt'}, {ingredientId: ελαιόλαδο, quantity: 0.05, unit: 'lt'}, {ingredientId: κρεμμύδι, quantity: 0.03, unit: 'kg'}], prepTime: 25, portionSize: '1 μερίδα'
  - Create realistic recipes for ALL 25 products

- `initialSuppliers` — NEW export, 4 suppliers:
  - sup1: Ιχθυοπωλείο Θερμαϊκός, phone 2310-555-001, categories: ['seafood']
  - sup2: Λαχαναγορά Κεντρική, phone 2310-555-002, categories: ['vegetables']
  - sup3: Γαλακτοκομικά Μακεδονίας, phone 2310-555-003, categories: ['dairy']
  - sup4: Οινοποιείο Τσάνταλη, phone 2310-555-004, categories: ['drinks']

- `initialSupplierOrders` — NEW export, empty array
- `initialWasteLog` — NEW export, 3-4 sample entries for demo

- Keep all existing helper functions (generateId, formatPrice, formatDateTime, formatTime)
- `initialOrders` — keep as empty array

- [ ] **Step 3: Bump STORAGE_VERSION in `lib/pos-context.tsx`**

Change `const STORAGE_VERSION = 3` to `const STORAGE_VERSION = 4` so old localStorage resets.

- [ ] **Step 4: Commit**

```bash
git add lib/mock-data.ts lib/pos-context.tsx
git commit -m "feat(data): replace menu with Μαύρη Θάλασσα + add ingredients, recipes, suppliers"
```

---

## Task 3: Update Context (pos-context.tsx)

**Files:**
- Modify: `lib/pos-context.tsx`

- [ ] **Step 1: Read current `lib/pos-context.tsx` fully**

- [ ] **Step 2: Add new imports**

Add to the type imports from `./types`:
```typescript
Ingredient, Recipe, RecipeIngredient, WasteEntry, Supplier, SupplierOrder, SupplierOrderItem
```

Add to the mock-data imports:
```typescript
initialIngredients, initialRecipes, initialSuppliers, initialSupplierOrders, initialWasteLog
```

- [ ] **Step 3: Extend POSState**

Add 5 new fields:
```typescript
interface POSState {
  // ...existing
  ingredients: Ingredient[]
  recipes: Recipe[]
  wasteLog: WasteEntry[]
  suppliers: Supplier[]
  supplierOrders: SupplierOrder[]
}
```

- [ ] **Step 4: Add new action types to POSAction**

```typescript
// Ingredients
| { type: 'ADD_INGREDIENT'; payload: Ingredient }
| { type: 'UPDATE_INGREDIENT'; payload: Ingredient }
| { type: 'DELETE_INGREDIENT'; payload: string }
| { type: 'ADJUST_STOCK'; payload: { ingredientId: string; quantity: number } }
// Recipes
| { type: 'ADD_RECIPE'; payload: Recipe }
| { type: 'UPDATE_RECIPE'; payload: Recipe }
| { type: 'DELETE_RECIPE'; payload: string }
// Waste
| { type: 'ADD_WASTE_ENTRY'; payload: WasteEntry }
// Suppliers
| { type: 'ADD_SUPPLIER'; payload: Supplier }
| { type: 'UPDATE_SUPPLIER'; payload: Supplier }
| { type: 'DELETE_SUPPLIER'; payload: string }
// Supplier Orders
| { type: 'ADD_SUPPLIER_ORDER'; payload: SupplierOrder }
| { type: 'UPDATE_SUPPLIER_ORDER'; payload: SupplierOrder }
| { type: 'RECEIVE_SUPPLIER_ORDER'; payload: string }
```

- [ ] **Step 5: Add reducer cases**

Standard CRUD patterns for each entity. Special cases:

`ADJUST_STOCK`: adds quantity to ingredient.currentStock (can be negative for deduction):
```typescript
case 'ADJUST_STOCK':
  return {
    ...state,
    ingredients: state.ingredients.map(i =>
      i.id === action.payload.ingredientId
        ? { ...i, currentStock: Math.max(0, i.currentStock + action.payload.quantity) }
        : i
    )
  }
```

`RECEIVE_SUPPLIER_ORDER`: marks order as 'received' AND adds stock for each item:
```typescript
case 'RECEIVE_SUPPLIER_ORDER': {
  const order = state.supplierOrders.find(o => o.id === action.payload)
  if (!order) return state
  let newIngredients = [...state.ingredients]
  for (const item of order.items) {
    newIngredients = newIngredients.map(i =>
      i.id === item.ingredientId
        ? { ...i, currentStock: i.currentStock + item.quantity }
        : i
    )
  }
  return {
    ...state,
    supplierOrders: state.supplierOrders.map(o =>
      o.id === action.payload ? { ...o, status: 'received' as const } : o
    ),
    ingredients: newIngredients
  }
}
```

`COMPLETE_ORDER` — extend existing case to auto-deduct stock:
After the existing logic that marks order completed and frees table, also:
```typescript
// Auto-deduct stock based on recipes
let updatedIngredients = [...state.ingredients]
for (const item of order.items) {
  const recipe = state.recipes.find(r => r.productId === item.productId)
  if (recipe) {
    for (const ri of recipe.ingredients) {
      updatedIngredients = updatedIngredients.map(ing =>
        ing.id === ri.ingredientId
          ? { ...ing, currentStock: Math.max(0, ing.currentStock - ri.quantity * item.quantity) }
          : ing
      )
    }
  }
}
// Also auto-disable products whose key ingredients are below minStock
const updatedProducts = state.products.map(p => {
  const recipe = state.recipes.find(r => r.productId === p.id)
  if (!recipe) return p
  const hasStock = recipe.ingredients.every(ri => {
    const ing = updatedIngredients.find(i => i.id === ri.ingredientId)
    return ing ? ing.currentStock >= ri.quantity : false
  })
  return hasStock ? p : { ...p, available: false }
})
```
Return updated state with `ingredients: updatedIngredients, products: updatedProducts`.

- [ ] **Step 6: Update initialState**

```typescript
const initialState: POSState = {
  // ...existing
  ingredients: initialIngredients,
  recipes: initialRecipes,
  wasteLog: initialWasteLog,
  suppliers: initialSuppliers,
  supplierOrders: initialSupplierOrders,
}
```

- [ ] **Step 7: Update localStorage save/load**

Add to the `toStore` object: `ingredients`, `recipes`, `wasteLog`, `suppliers`, `supplierOrders`.

- [ ] **Step 8: Commit**

```bash
git add lib/pos-context.tsx
git commit -m "feat(context): add inventory, recipes, waste, supplier state and actions"
```

---

## Task 4: Create Custom Hooks

**Files:**
- Create: `hooks/use-inventory.ts`
- Create: `hooks/use-recipes.ts`
- Create: `hooks/use-suppliers.ts`
- Create: `hooks/use-waste.ts`

- [ ] **Step 1: Create `hooks/use-inventory.ts`**

```typescript
import { usePOS } from '@/lib/pos-context'
import { generateId } from '@/lib/mock-data'
import type { Ingredient, IngredientCategory, IngredientUnit } from '@/lib/types'

export type StockStatus = 'ok' | 'low' | 'critical'

export function useInventory() {
  const { state, dispatch } = usePOS()

  const getStockStatus = (ingredient: Ingredient): StockStatus => {
    if (ingredient.currentStock <= ingredient.minStock) return 'critical'
    if (ingredient.currentStock < ingredient.minStock * 2) return 'low'
    return 'ok'
  }

  const getIngredientsByCategory = (category: IngredientCategory) =>
    state.ingredients.filter(i => i.category === category)

  const getLowStockCount = () =>
    state.ingredients.filter(i => getStockStatus(i) !== 'ok').length

  const getCriticalStockCount = () =>
    state.ingredients.filter(i => getStockStatus(i) === 'critical').length

  const getLowStockIngredients = () =>
    state.ingredients.filter(i => getStockStatus(i) !== 'ok')

  const addIngredient = (data: Omit<Ingredient, 'id'>) => {
    const ingredient: Ingredient = { id: generateId(), ...data }
    dispatch({ type: 'ADD_INGREDIENT', payload: ingredient })
    return ingredient.id
  }

  const updateIngredient = (ingredient: Ingredient) => {
    dispatch({ type: 'UPDATE_INGREDIENT', payload: ingredient })
  }

  const deleteIngredient = (id: string) => {
    dispatch({ type: 'DELETE_INGREDIENT', payload: id })
  }

  const adjustStock = (ingredientId: string, quantity: number) => {
    dispatch({ type: 'ADJUST_STOCK', payload: { ingredientId, quantity } })
  }

  return {
    ingredients: state.ingredients,
    getStockStatus,
    getIngredientsByCategory,
    getLowStockCount,
    getCriticalStockCount,
    getLowStockIngredients,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    adjustStock,
  }
}
```

- [ ] **Step 2: Create `hooks/use-recipes.ts`**

```typescript
import { usePOS } from '@/lib/pos-context'
import { generateId } from '@/lib/mock-data'
import type { Recipe, RecipeIngredient } from '@/lib/types'

export function useRecipes() {
  const { state, dispatch } = usePOS()

  const getRecipeForProduct = (productId: string) =>
    state.recipes.find(r => r.productId === productId)

  const calculateFoodCost = (recipe: Recipe): number => {
    return recipe.ingredients.reduce((sum, ri) => {
      const ingredient = state.ingredients.find(i => i.id === ri.ingredientId)
      if (!ingredient) return sum
      // Normalize units: if recipe uses gr/ml but ingredient cost is per kg/lt
      let costForQuantity = ingredient.costPerUnit * ri.quantity
      if ((ri.unit === 'gr' && ingredient.unit === 'kg') || (ri.unit === 'ml' && ingredient.unit === 'lt')) {
        costForQuantity = ingredient.costPerUnit * (ri.quantity / 1000)
      }
      return sum + costForQuantity
    }, 0)
  }

  const calculateMargin = (recipe: Recipe): number => {
    const product = state.products.find(p => p.id === recipe.productId)
    if (!product || product.price === 0) return 0
    const foodCost = calculateFoodCost(recipe)
    return ((product.price - foodCost) / product.price) * 100
  }

  const getAverageFoodCostPercent = (): number => {
    const recipesWithProducts = state.recipes.filter(r =>
      state.products.find(p => p.id === r.productId)
    )
    if (recipesWithProducts.length === 0) return 0
    const totalPercent = recipesWithProducts.reduce((sum, r) => {
      const product = state.products.find(p => p.id === r.productId)
      if (!product || product.price === 0) return sum
      const cost = calculateFoodCost(r)
      return sum + (cost / product.price) * 100
    }, 0)
    return totalPercent / recipesWithProducts.length
  }

  const getMostExpensiveRecipe = () => {
    let maxCost = 0
    let maxRecipe: Recipe | null = null
    for (const recipe of state.recipes) {
      const cost = calculateFoodCost(recipe)
      if (cost > maxCost) {
        maxCost = cost
        maxRecipe = recipe
      }
    }
    return maxRecipe
  }

  const getLowestMarginRecipe = () => {
    let minMargin = Infinity
    let minRecipe: Recipe | null = null
    for (const recipe of state.recipes) {
      const margin = calculateMargin(recipe)
      if (margin < minMargin && margin > 0) {
        minMargin = margin
        minRecipe = recipe
      }
    }
    return minRecipe
  }

  const addRecipe = (data: Omit<Recipe, 'id'>) => {
    const recipe: Recipe = { id: generateId(), ...data }
    dispatch({ type: 'ADD_RECIPE', payload: recipe })
    return recipe.id
  }

  const updateRecipe = (recipe: Recipe) => {
    dispatch({ type: 'UPDATE_RECIPE', payload: recipe })
  }

  const deleteRecipe = (id: string) => {
    dispatch({ type: 'DELETE_RECIPE', payload: id })
  }

  return {
    recipes: state.recipes,
    getRecipeForProduct,
    calculateFoodCost,
    calculateMargin,
    getAverageFoodCostPercent,
    getMostExpensiveRecipe,
    getLowestMarginRecipe,
    addRecipe,
    updateRecipe,
    deleteRecipe,
  }
}
```

- [ ] **Step 3: Create `hooks/use-suppliers.ts`**

```typescript
import { usePOS } from '@/lib/pos-context'
import { generateId } from '@/lib/mock-data'
import type { Supplier, SupplierOrder, SupplierOrderItem, IngredientCategory } from '@/lib/types'

export function useSuppliers() {
  const { state, dispatch } = usePOS()

  const addSupplier = (data: Omit<Supplier, 'id'>) => {
    const supplier: Supplier = { id: generateId(), ...data }
    dispatch({ type: 'ADD_SUPPLIER', payload: supplier })
    return supplier.id
  }

  const updateSupplier = (supplier: Supplier) => {
    dispatch({ type: 'UPDATE_SUPPLIER', payload: supplier })
  }

  const deleteSupplier = (id: string) => {
    dispatch({ type: 'DELETE_SUPPLIER', payload: id })
  }

  const createOrder = (supplierId: string, items: SupplierOrderItem[], notes?: string) => {
    const order: SupplierOrder = {
      id: generateId(),
      supplierId,
      items,
      status: 'draft',
      createdAt: new Date().toISOString(),
      notes,
    }
    dispatch({ type: 'ADD_SUPPLIER_ORDER', payload: order })
    return order.id
  }

  const updateOrder = (order: SupplierOrder) => {
    dispatch({ type: 'UPDATE_SUPPLIER_ORDER', payload: order })
  }

  const sendOrder = (orderId: string) => {
    const order = state.supplierOrders.find(o => o.id === orderId)
    if (!order) return
    dispatch({ type: 'UPDATE_SUPPLIER_ORDER', payload: { ...order, status: 'sent' } })
  }

  const receiveOrder = (orderId: string) => {
    dispatch({ type: 'RECEIVE_SUPPLIER_ORDER', payload: orderId })
  }

  const getOrdersBySupplier = (supplierId: string) =>
    state.supplierOrders.filter(o => o.supplierId === supplierId)

  return {
    suppliers: state.suppliers,
    supplierOrders: state.supplierOrders,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    createOrder,
    updateOrder,
    sendOrder,
    receiveOrder,
    getOrdersBySupplier,
  }
}
```

- [ ] **Step 4: Create `hooks/use-waste.ts`**

```typescript
import { usePOS } from '@/lib/pos-context'
import { generateId } from '@/lib/mock-data'
import type { WasteEntry, WasteReason } from '@/lib/types'

export function useWaste() {
  const { state, dispatch } = usePOS()

  const addWasteEntry = (ingredientId: string, quantity: number, reason: WasteReason, notes?: string) => {
    const entry: WasteEntry = {
      id: generateId(),
      ingredientId,
      quantity,
      reason,
      date: new Date().toISOString(),
      notes,
    }
    dispatch({ type: 'ADD_WASTE_ENTRY', payload: entry })
    // Also deduct from stock
    dispatch({ type: 'ADJUST_STOCK', payload: { ingredientId, quantity: -quantity } })
    return entry.id
  }

  const getMonthlyWasteCost = (): number => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    return state.wasteLog
      .filter(w => w.date >= monthStart)
      .reduce((sum, w) => {
        const ingredient = state.ingredients.find(i => i.id === w.ingredientId)
        return sum + (ingredient ? w.quantity * ingredient.costPerUnit : 0)
      }, 0)
  }

  const getWasteByReason = (): Record<WasteReason, number> => {
    const result: Record<WasteReason, number> = { expired: 0, damaged: 0, overproduction: 0, returned: 0 }
    for (const entry of state.wasteLog) {
      const ingredient = state.ingredients.find(i => i.id === entry.ingredientId)
      const cost = ingredient ? entry.quantity * ingredient.costPerUnit : 0
      result[entry.reason] += cost
    }
    return result
  }

  const getTopWastedIngredients = (limit = 5) => {
    const wasteMap = new Map<string, number>()
    for (const entry of state.wasteLog) {
      const ingredient = state.ingredients.find(i => i.id === entry.ingredientId)
      const cost = ingredient ? entry.quantity * ingredient.costPerUnit : 0
      wasteMap.set(entry.ingredientId, (wasteMap.get(entry.ingredientId) || 0) + cost)
    }
    return Array.from(wasteMap.entries())
      .map(([id, cost]) => ({
        ingredient: state.ingredients.find(i => i.id === id),
        totalCost: cost,
      }))
      .filter(x => x.ingredient)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, limit)
  }

  return {
    wasteLog: state.wasteLog,
    addWasteEntry,
    getMonthlyWasteCost,
    getWasteByReason,
    getTopWastedIngredients,
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add hooks/use-inventory.ts hooks/use-recipes.ts hooks/use-suppliers.ts hooks/use-waste.ts
git commit -m "feat(hooks): add useInventory, useRecipes, useSuppliers, useWaste hooks"
```

---

## Task 5: Inventory Page — Ingredients Tab

**Files:**
- Create: `components/pos/ingredient-table.tsx`
- Create: `components/pos/ingredient-form.tsx`
- Create: `app/(pos)/inventory/page.tsx`

- [ ] **Step 1: Create `components/pos/ingredient-form.tsx`**

A dialog/sheet for adding or editing an ingredient. Props:
```typescript
interface IngredientFormProps {
  ingredient?: Ingredient  // undefined = add mode, defined = edit mode
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Omit<Ingredient, 'id'>) => void
}
```

Form fields: name (Input), unit (Select: kg/lt/pcs/gr/ml), currentStock (number Input), minStock (number Input), costPerUnit (number Input), category (Select: seafood/meat/dairy/vegetables/dry/drinks/other), supplierId (Select from suppliers, optional).

Use Shadcn Dialog, Input, Select, Label, Button. Uses `useSuppliers()` to populate supplier dropdown.

- [ ] **Step 2: Create `components/pos/ingredient-table.tsx`**

Props:
```typescript
interface IngredientTableProps {
  ingredients: Ingredient[]
  onEdit: (ingredient: Ingredient) => void
  onDelete: (id: string) => void
  onAdjustStock: (id: string, quantity: number) => void
}
```

Renders a responsive table/list. Each row shows: name, category badge (colored by category), stock (with unit), minStock, costPerUnit (formatted), status badge (🟢/🟡/🔴 using `getStockStatus()`). Actions per row: edit button, delete button, "Παραλαβή" button that opens a small inline input for quantity to add.

Summary bar at top: total ingredient count, low stock count (yellow), critical count (red).

Category filter: row of toggle buttons for each category.

Uses `useInventory()` for `getStockStatus`. Uses Shadcn Table (or card layout for mobile), Badge, Button, Input. Lucide: Pencil, Trash2, Plus, Package.

- [ ] **Step 3: Create `app/(pos)/inventory/page.tsx`**

Page with 3 tabs using simple state tabs (like menu page pattern):
- Tab "Πρώτες Ύλες" → IngredientTable + IngredientForm
- Tab "Σπατάλη" → placeholder for now (Task 6 fills this)
- Tab "Προμηθευτές" → placeholder for now (Task 7 fills this)

Header: "Αποθήκη" title with icon.
"+ Πρώτη Ύλη" button opens IngredientForm in add mode.

Uses `useInventory()` hook.

- [ ] **Step 4: Commit**

```bash
git add components/pos/ingredient-form.tsx components/pos/ingredient-table.tsx "app/(pos)/inventory/page.tsx"
git commit -m "feat(inventory): add ingredients tab with table, form, stock status"
```

---

## Task 6: Inventory Page — Waste Tab

**Files:**
- Create: `components/pos/waste-form.tsx`
- Create: `components/pos/waste-log.tsx`
- Modify: `app/(pos)/inventory/page.tsx`

- [ ] **Step 1: Create `components/pos/waste-form.tsx`**

Form component (not dialog — inline at top of tab). Fields: ingredient select (dropdown), quantity (number + unit display), reason (select: Ληγμένο/Κατεστραμμένο/Υπερπαραγωγή/Επιστροφή), notes (textarea optional), "Καταγραφή" submit button.

Uses `useWaste()` for addWasteEntry, `useInventory()` for ingredients list.

Map WasteReason to Greek labels: expired→Ληγμένο, damaged→Κατεστραμμένο, overproduction→Υπερπαραγωγή, returned→Επιστροφή.

- [ ] **Step 2: Create `components/pos/waste-log.tsx`**

Displays waste history and summary. No props needed (uses hooks directly).

Summary section (3 cards): Σπατάλη Μήνα (€), waste by reason breakdown, top 5 wasted ingredients.

Table below: date, ingredient name, quantity+unit, reason (Greek label), cost (qty × costPerUnit).

Sort by date descending. Use `useWaste()` for data, `useInventory()` for ingredient names.

Use Recharts PieChart for waste by reason (if desired, or simple list).

- [ ] **Step 3: Wire waste tab into inventory page**

In `app/(pos)/inventory/page.tsx`, replace the "Σπατάλη" tab placeholder with WasteForm + WasteLog.

- [ ] **Step 4: Commit**

```bash
git add components/pos/waste-form.tsx components/pos/waste-log.tsx "app/(pos)/inventory/page.tsx"
git commit -m "feat(inventory): add waste tracking tab with form, log, and summaries"
```

---

## Task 7: Inventory Page — Suppliers Tab

**Files:**
- Create: `components/pos/supplier-list.tsx`
- Create: `components/pos/supplier-order-form.tsx`
- Modify: `app/(pos)/inventory/page.tsx`

- [ ] **Step 1: Create `components/pos/supplier-list.tsx`**

Supplier CRUD list + supplier orders section. Uses `useSuppliers()` and `useInventory()`.

**Suppliers section:**
- List of suppliers: name, phone, email, category badges
- "+ Προμηθευτής" button → inline add form (name, phone, email, category checkboxes)
- Edit/delete per supplier

**Orders section:**
- List of orders: supplier name, date, item count, total estimated cost, status badge (draft→gray, sent→blue, received→green)
- Each order expandable to show items
- "Αποστολή" button (for draft orders) → marks as sent
- "Παραλαβή" button (for sent orders) → receives + adds stock
- "+ Νέα Παραγγελία" button → opens SupplierOrderForm

- [ ] **Step 2: Create `components/pos/supplier-order-form.tsx`**

Dialog for creating a new supplier order. Props:
```typescript
interface SupplierOrderFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

Steps: select supplier → add items (ingredient dropdown + quantity input → auto-calc estimated cost from ingredient.costPerUnit) → notes → create order.

Uses `useSuppliers()` for createOrder, `useInventory()` for ingredient list.

- [ ] **Step 3: Wire suppliers tab into inventory page**

Replace "Προμηθευτές" tab placeholder with SupplierList + SupplierOrderForm.

- [ ] **Step 4: Commit**

```bash
git add components/pos/supplier-list.tsx components/pos/supplier-order-form.tsx "app/(pos)/inventory/page.tsx"
git commit -m "feat(inventory): add suppliers tab with CRUD and order management"
```

---

## Task 8: Recipes Page

**Files:**
- Create: `components/pos/food-cost-dashboard.tsx`
- Create: `components/pos/recipe-card.tsx`
- Create: `components/pos/recipe-editor.tsx`
- Create: `app/(pos)/recipes/page.tsx`

- [ ] **Step 1: Create `components/pos/food-cost-dashboard.tsx`**

Three summary cards in a row. Uses `useRecipes()`.

Card 1: **Μέσο Food Cost %** — `getAverageFoodCostPercent()`, color: green <30%, amber 30-40%, red >40%.
Card 2: **Πιο Ακριβό Πιάτο** — `getMostExpensiveRecipe()`, show product name + food cost.
Card 3: **Χαμηλότερο Margin** — `getLowestMarginRecipe()`, show product name + margin %.

Use Shadcn Card. Lucide: TrendingUp, DollarSign, AlertTriangle.

- [ ] **Step 2: Create `components/pos/recipe-card.tsx`**

Props:
```typescript
interface RecipeCardProps {
  recipe: Recipe
  onEdit: (recipe: Recipe) => void
}
```

Card showing: product name (lookup from state.products), ingredient count, prep time, food cost (calculated), selling price, margin %, margin badge (🟢 >70%, 🟡 50-70%, 🔴 <50%).

Click → calls onEdit. Uses `useRecipes()` for calculateFoodCost/calculateMargin, `usePOS()` for product lookup.

- [ ] **Step 3: Create `components/pos/recipe-editor.tsx`**

Dialog for editing recipe ingredients. Props:
```typescript
interface RecipeEditorProps {
  recipe?: Recipe
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

If no recipe, show product selector (dropdown of products without existing recipe).

Ingredient list editor:
- Each row: ingredient select, quantity input, unit display, cost display (qty × costPerUnit)
- "+ Συστατικό" button adds a row
- Remove button per row
- Live food cost total at bottom
- Live margin % display (if product selected)
- Prep time input, portion size input

Save → calls addRecipe or updateRecipe from `useRecipes()`.

Uses `useInventory()` for ingredient list, `useRecipes()` for CRUD, `usePOS()` for products.

- [ ] **Step 4: Create `app/(pos)/recipes/page.tsx`**

Page layout:
1. Header: "Συνταγές & Food Cost" + "+ Νέα Συνταγή" button
2. FoodCostDashboard
3. Grid of RecipeCards (3 columns desktop, 2 tablet, 1 mobile)
4. RecipeEditor dialog (opened by card click or "+ Νέα Συνταγή")

Uses `useRecipes()` hook.

- [ ] **Step 5: Commit**

```bash
git add components/pos/food-cost-dashboard.tsx components/pos/recipe-card.tsx components/pos/recipe-editor.tsx "app/(pos)/recipes/page.tsx"
git commit -m "feat(recipes): add recipes page with food cost dashboard and editor"
```

---

## Task 9: Sidebar + Stock Alert Badge

**Files:**
- Create: `components/pos/stock-alert-badge.tsx`
- Modify: `components/pos/sidebar.tsx`

- [ ] **Step 1: Create `components/pos/stock-alert-badge.tsx`**

```typescript
'use client'

import { useInventory } from '@/hooks/use-inventory'

export function StockAlertBadge() {
  const { getLowStockCount } = useInventory()
  const count = getLowStockCount()

  if (count === 0) return null

  return (
    <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
      {count}
    </span>
  )
}
```

- [ ] **Step 2: Update sidebar**

Read `components/pos/sidebar.tsx`. Add two new nav items after "Μενού" (index 4):

```typescript
import { Package, BookOpen } from 'lucide-react'
```

Add to navItems array after the Μενού entry:
```typescript
{
  title: 'Αποθήκη',
  href: '/inventory',
  icon: Package,
},
{
  title: 'Συνταγές',
  href: '/recipes',
  icon: BookOpen,
},
```

For the Αποθήκη item, add the StockAlertBadge inside the SidebarMenuButton. Import `StockAlertBadge` and render it next to the text:

In the map function, after `<span>{item.title}</span>`, add:
```tsx
{item.href === '/inventory' && <StockAlertBadge />}
```

- [ ] **Step 3: Commit**

```bash
git add components/pos/stock-alert-badge.tsx components/pos/sidebar.tsx
git commit -m "feat(sidebar): add Αποθήκη and Συνταγές nav items with stock alert badge"
```

---

## Task 10: Fix TypeScript Errors + Settings Update + Final Verification

**Files:**
- Modify: Various files with type errors
- Modify: `app/(pos)/settings/page.tsx`

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Fix any errors — common issues:
- Components referencing old product IDs that no longer exist
- Missing imports for new types
- Menu page referencing old category IDs

- [ ] **Step 2: Update settings page restaurant info**

In `app/(pos)/settings/page.tsx`, update the default restaurant info to Μαύρη Θάλασσα:
- Name: Μαύρη Θάλασσα
- Address: Νικολάου Πλαστήρα 3, Καλαμαριά 55132
- ΑΦΜ: 099999999 (mock)
- ΔΟΥ: Καλαμαριάς
- Τηλ: 2310 932 542

- [ ] **Step 3: Update receipt-preview.tsx**

Update the restaurant name/address in the receipt to match Μαύρη Θάλασσα.

- [ ] **Step 4: Verify app builds**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: TypeScript errors, update restaurant info to Μαύρη Θάλασσα"
```
