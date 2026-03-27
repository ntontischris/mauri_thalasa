# EatFlow POS — Sub-project 2: Inventory & Recipes

**Date:** 2026-03-27
**Status:** Approved
**Scope:** UI-only demo with mock data (localStorage). Menu updated to match Μαύρη Θάλασσα restaurant.

## Overview

Add full inventory management (stock, waste tracking, supplier orders) and recipe management (ingredients, food cost analysis) to the EatFlow POS demo. Replace generic menu with Μαύρη Θάλασσα's actual menu. Architecture follows existing pattern: React Context + custom hooks.

## 1. New Types

```typescript
type IngredientCategory = 'seafood' | 'meat' | 'dairy' | 'vegetables' | 'dry' | 'drinks' | 'other'
type IngredientUnit = 'kg' | 'lt' | 'pcs' | 'gr' | 'ml'

interface Ingredient {
  id: string
  name: string
  unit: IngredientUnit
  currentStock: number
  minStock: number
  costPerUnit: number       // € per unit
  supplierId?: string
  category: IngredientCategory
}

interface RecipeIngredient {
  ingredientId: string
  quantity: number
  unit: IngredientUnit
}

interface Recipe {
  id: string
  productId: string
  ingredients: RecipeIngredient[]
  prepTime: number           // minutes
  portionSize: string        // "1 μερίδα", "4 άτομα"
}

type WasteReason = 'expired' | 'damaged' | 'overproduction' | 'returned'

interface WasteEntry {
  id: string
  ingredientId: string
  quantity: number
  reason: WasteReason
  date: string
  notes?: string
}

interface Supplier {
  id: string
  name: string
  phone?: string
  email?: string
  categories: IngredientCategory[]
}

interface SupplierOrderItem {
  ingredientId: string
  quantity: number
  estimatedCost: number
}

type SupplierOrderStatus = 'draft' | 'sent' | 'received'

interface SupplierOrder {
  id: string
  supplierId: string
  items: SupplierOrderItem[]
  status: SupplierOrderStatus
  createdAt: string
  notes?: string
}
```

### State Additions

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

## 2. Menu Update — Μαύρη Θάλασσα

Replace all existing categories and products with the actual Μαύρη Θάλασσα menu.

### Categories (7)

1. Ωμά (Raw) — order: 1
2. Κρύα Ορεκτικά (Cold Appetizers) — order: 2
3. Ζεστά Ορεκτικά (Hot Appetizers) — order: 3
4. Ψητά Θαλασσινά (Grilled Seafood) — order: 4
5. Μαγειρευτά (Cooked Dishes) — order: 5
6. Ζυμαρικά (Pasta) — order: 6
7. Γλυκά (Desserts) — order: 7

### Products (~25)

**Ωμά (cold station):**
- Καρπάτσιο Λαβρακιού — €16 | 13% VAT
- Καρπάτσιο Μπαρμπουνιού — €18 | 13% VAT
- Ταρτάρ Γαρίδας — €18 | 13% VAT

**Κρύα Ορεκτικά (cold station):**
- Ταραμοσαλάτα Λευκή — €12 | 13% VAT
- Μελιτζανοσαλάτα — €8 | 13% VAT
- Καβουροσαλάτα — €16 | 13% VAT
- Χτένια Ωμά — €22 | 13% VAT

**Ζεστά Ορεκτικά (hot station):**
- Σαγανάκι Γαρίδες — €18 | 13% VAT
- Αχνιστά Όστρακα — €16 | 13% VAT
- Καλαμαράκια Τηγανητά — €14 | 13% VAT
- Γαρίδες Τηγανητές — €18 | 13% VAT

**Ψητά Θαλασσινά (hot station) — τιμή ανά κιλό:**
- Τσιπούρα Σχάρας — €75/kg | 13% VAT
- Μπαρμπούνι Σχάρας — €85/kg | 13% VAT
- Φαγκρί Σχάρας — €95/kg | 13% VAT
- Συναγρίδα Σχάρας — €95/kg | 13% VAT
- Γαρίδες Θερμαϊκού — €95/kg | 13% VAT
- Καλαμάρι Σχάρας — €55/kg | 13% VAT
- Χταπόδι Σχάρας — €48/kg | 13% VAT

**Μαγειρευτά (hot station) — για 4 άτομα:**
- Ψαρόσουπα — €90 | 13% VAT
- Φρικασέ Ψαριού — €120 | 13% VAT
- Κοκκινιστό με Μανιτάρια — €120 | 13% VAT
- Πλακί στο Φούρνο — €140 | 13% VAT

**Ζυμαρικά (hot station):**
- Γαριδομακαρονάδα — €28 | 13% VAT
- Αστακομακαρονάδα — €45 | 13% VAT

**Γλυκά (dessert station):**
- Μπακλαβάς Deconstructed — €20 | 13% VAT
- Τιραμισού — €14 | 13% VAT
- Lemon Bar — €12 | 13% VAT
- Cheesecake — €14 | 13% VAT

## 3. Page `/inventory` — Stock Management

Three tabs: Πρώτες Ύλες | Σπατάλη | Προμηθευτές

### Tab "Πρώτες Ύλες" (Ingredients)

Table/list view with columns:
- Όνομα
- Κατηγορία (filterable badges)
- Απόθεμα (current stock + unit)
- Ελάχιστο (min stock threshold)
- Κόστος/μονάδα
- Status badge: 🟢 OK (stock > 2× min), 🟡 Χαμηλό (min < stock < 2× min), 🔴 Κρίσιμο (stock ≤ min)

Actions:
- "+ Πρώτη Ύλη" button → form (name, unit, stock, min, cost, category, supplier)
- Edit/delete per ingredient
- "Παραλαβή" button → quick add to stock (input quantity)
- Filter by category
- Summary bar at top: total ingredients, low stock count, critical count

### Tab "Σπατάλη" (Waste)

Form at top:
- Select ingredient (dropdown)
- Quantity + unit
- Reason dropdown: Ληγμένο, Κατεστραμμένο, Υπερπαραγωγή, Επιστροφή
- Notes (optional)
- "Καταγραφή" button

Below: waste log table (date, ingredient, quantity, reason, cost = qty × costPerUnit)

Summary cards:
- Σπατάλη Μήνα (€)
- Σπατάλη ανά λόγο (pie/donut)
- Top 5 σπαταλημένα υλικά

### Tab "Προμηθευτές" (Suppliers)

Supplier list:
- Name, phone, email, categories badges
- Edit/delete
- "+ Προμηθευτής" button

Supplier Orders section:
- "+ Νέα Παραγγελία" → select supplier, add items (ingredient + quantity), auto-calculate estimated cost
- Order list: supplier, date, items count, total cost, status badge (draft/sent/received)
- Click order → detail view with items
- "Αποστολή" button → changes status to 'sent'
- "Παραλαβή" button → changes status to 'received' + auto-adds stock

## 4. Page `/recipes` — Recipes & Food Cost

### Food Cost Dashboard (top)

Three summary cards:
- **Μέσο Food Cost %** — average across all recipes (with color: green <30%, amber 30-40%, red >40%)
- **Πιο Ακριβό Πιάτο** — highest ingredient cost
- **Χαμηλότερο Margin** — lowest margin % dish

### Recipe Grid/List

Each recipe card shows:
- Product name
- Ingredient count
- Prep time
- **Food Cost**: sum of (ingredient.costPerUnit × recipeIngredient.quantity) per portion
- **Τιμή Πώλησης**: from Product.price
- **Margin %**: `(price - foodCost) / price × 100`
- Margin badge: 🟢 >70%, 🟡 50-70%, 🔴 <50%

### Recipe Editor

Click recipe card or "+ Νέα Συνταγή":
- Select product (dropdown of products without recipe)
- Add ingredients: search/select ingredient, set quantity + unit
- Prep time input
- Portion size input
- **Live food cost calculation** as ingredients are added/changed
- Live margin % display
- Save/cancel

## 5. Auto-Deduction (Mock Behavior)

When an order is completed (COMPLETE_ORDER action):
- For each order item, look up its recipe
- For each recipe ingredient, subtract `recipeIngredient.quantity × orderItem.quantity` from `ingredient.currentStock`
- If any ingredient falls below `minStock`, mark related products as unavailable

This is handled in the reducer's COMPLETE_ORDER case.

## 6. Alerts

Display in sidebar or header:
- Badge count of low-stock ingredients
- On `/inventory` page: prominent alert bar for critical stock items
- Auto-disable products when key ingredients are out of stock

## 7. Custom Hooks

| Hook | File | Responsibility |
|------|------|----------------|
| `useInventory()` | `hooks/use-inventory.ts` | Ingredient CRUD, stock updates, stock status calculation, alerts |
| `useRecipes()` | `hooks/use-recipes.ts` | Recipe CRUD, food cost calculation, margin calculation |
| `useSuppliers()` | `hooks/use-suppliers.ts` | Supplier CRUD, order CRUD, order status management |
| `useWaste()` | `hooks/use-waste.ts` | Waste logging, waste summaries |

## 8. New Reducer Actions

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
| { type: 'RECEIVE_SUPPLIER_ORDER'; payload: string } // orderId — marks received + adds stock
```

## 9. File Structure

```
hooks/
  use-inventory.ts         NEW
  use-recipes.ts           NEW
  use-suppliers.ts         NEW
  use-waste.ts             NEW

components/pos/
  ingredient-table.tsx     NEW — Ingredient list with status badges
  ingredient-form.tsx      NEW — Add/edit ingredient dialog
  waste-form.tsx           NEW — Waste entry form
  waste-log.tsx            NEW — Waste history table
  supplier-list.tsx        NEW — Supplier CRUD
  supplier-order-form.tsx  NEW — Create/edit supplier order
  recipe-card.tsx          NEW — Recipe card with food cost
  recipe-editor.tsx        NEW — Recipe ingredient editor
  food-cost-dashboard.tsx  NEW — Summary cards for recipes page
  stock-alert-badge.tsx    NEW — Badge for sidebar low-stock count

app/(pos)/
  inventory/page.tsx       NEW — Stock management page
  recipes/page.tsx         NEW — Recipes & food cost page

lib/
  types.ts                 MODIFIED — Add all new types
  pos-context.tsx          MODIFIED — Add new state + actions
  mock-data.ts             MODIFIED — Replace menu + add ingredients, recipes, suppliers
```

## 10. Mock Data — Μαύρη Θάλασσα

### Ingredients (~30)

**Θαλασσινά:**
- Τσιπούρα (kg) — stock: 15, min: 5, cost: €18/kg
- Μπαρμπούνι (kg) — stock: 8, min: 3, cost: €22/kg
- Φαγκρί (kg) — stock: 6, min: 2, cost: €25/kg
- Συναγρίδα (kg) — stock: 5, min: 2, cost: €28/kg
- Γαρίδες Θερμαϊκού (kg) — stock: 10, min: 3, cost: €32/kg
- Καλαμάρι (kg) — stock: 12, min: 4, cost: €14/kg
- Χταπόδι (kg) — stock: 8, min: 3, cost: €16/kg
- Λαβράκι φιλέτο (kg) — stock: 6, min: 2, cost: €20/kg
- Καβούρι (kg) — stock: 3, min: 1, cost: €35/kg
- Χτένια (kg) — stock: 4, min: 2, cost: €28/kg
- Όστρακα (kg) — stock: 5, min: 2, cost: €18/kg

**Λαχανικά & Φρούτα:**
- Ντομάτα (kg) — stock: 20, min: 5, cost: €2.50/kg
- Μελιτζάνα (kg) — stock: 8, min: 3, cost: €3/kg
- Πατάτα (kg) — stock: 25, min: 8, cost: €1.50/kg
- Σέλινο (kg) — stock: 5, min: 2, cost: €3/kg
- Κρεμμύδι (kg) — stock: 15, min: 5, cost: €1.50/kg
- Λεμόνια (kg) — stock: 10, min: 3, cost: €3/kg
- Μανιτάρια Portobello (kg) — stock: 4, min: 2, cost: €8/kg

**Γαλακτοκομικά:**
- Αυγά (pcs) — stock: 60, min: 20, cost: €0.35/pc
- Φέτα (kg) — stock: 5, min: 2, cost: €12/kg

**Ξηρά / Βασικά:**
- Ελαιόλαδο Εξαιρετικό (lt) — stock: 20, min: 5, cost: €8/lt
- Αλεύρι (kg) — stock: 10, min: 3, cost: €1.20/kg
- Ζυμαρικά Λιγκουίνι (kg) — stock: 8, min: 3, cost: €3.50/kg
- Σάλτσα Ντομάτας (lt) — stock: 10, min: 3, cost: €2.50/lt
- Πελτές (kg) — stock: 5, min: 2, cost: €4/kg
- Ταραμάς (kg) — stock: 3, min: 1, cost: €25/kg
- Φύλλο Κρούστας (pcs) — stock: 20, min: 5, cost: €1.50/pc
- Μυρωδικά mix (kg) — stock: 2, min: 0.5, cost: €15/kg

**Ποτά:**
- Κρασί Λευκό χύμα (lt) — stock: 30, min: 10, cost: €4/lt
- Κρασί Κόκκινο χύμα (lt) — stock: 20, min: 8, cost: €4.50/lt

### Suppliers (4)

1. **Ιχθυοπωλείο Θερμαϊκός** — seafood
2. **Λαχαναγορά Κεντρική** — vegetables
3. **Γαλακτοκομικά Μακεδονίας** — dairy
4. **Οινοποιείο Τσάνταλη** — drinks

### Recipes

Full recipes for all ~25 products with realistic ingredient quantities. Example:
- Γαριδομακαρονάδα: 300gr γαρίδες + 200gr λιγκουίνι + 100ml σάλτσα ντομάτας + 50ml ελαιόλαδο + 30gr κρεμμύδι → food cost ~€14.50, price €28, margin 48%

### Pre-set Alerts

Mock data includes 2-3 ingredients near minStock to demonstrate alert functionality:
- Συναγρίδα: stock 2kg, min 2kg → 🔴 Κρίσιμο
- Καβούρι: stock 1.5kg, min 1kg → 🟡 Χαμηλό

## 11. Sidebar Updates

Add two new entries to sidebar after "Μενού":
- 📦 Αποθήκη (`/inventory`) — with stock alert badge
- 📋 Συνταγές (`/recipes`)

## 12. Settings Update

Add restaurant info for Μαύρη Θάλασσα:
- Νικολάου Πλαστήρα 3, Καλαμαριά 55132
- ΑΦΜ: mock
- Τηλ: 2310 932 542
