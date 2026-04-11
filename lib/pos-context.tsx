"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from "react";
import type {
  Table,
  Category,
  Product,
  Order,
  OrderItem,
  Zone,
  Modifier,
  SelectedModifier,
  Ingredient,
  Recipe,
  WasteEntry,
  Supplier,
  SupplierOrder,
  Customer,
  CustomerVisit,
  LoyaltySettings,
  StaffMember,
  Shift,
  ChecklistItem,
  ChecklistType,
  AISettings,
  ChatMessage,
  Reservation,
  WaitlistEntry,
  BookingSettings,
} from "./types";
import {
  initialTables,
  initialCategories,
  initialProducts,
  initialOrders,
  initialZones,
  initialModifiers,
  initialIngredients,
  initialRecipes,
  initialWasteLog,
  initialSuppliers,
  initialSupplierOrders,
  initialCustomers,
  initialCustomerVisits,
  initialLoyaltySettings,
  initialStaff,
  initialShifts,
  initialChecklist,
  generateId,
} from "./mock-data";

// State interface
interface POSState {
  tables: Table[];
  categories: Category[];
  products: Product[];
  orders: Order[];
  zones: Zone[];
  modifiers: Modifier[];
  ingredients: Ingredient[];
  recipes: Recipe[];
  wasteLog: WasteEntry[];
  suppliers: Supplier[];
  supplierOrders: SupplierOrder[];
  customers: Customer[];
  customerVisits: CustomerVisit[];
  loyaltySettings: LoyaltySettings;
  staff: StaffMember[];
  shifts: Shift[];
  checklist: ChecklistItem[];
  activeStaffId: string | null;
  aiSettings: AISettings;
  chatHistory: ChatMessage[];
  // Reservation state (i-host integration)
  reservations: Reservation[];
  waitlist: WaitlistEntry[];
  bookingSettings: BookingSettings;
  isLoaded: boolean;
}

// Action types
type POSAction =
  | { type: "LOAD_STATE"; payload: Partial<POSState> }
  | { type: "SET_LOADED" }
  | { type: "RESET_STATE" }
  // Table actions
  | { type: "UPDATE_TABLE"; payload: Table }
  | {
      type: "SET_TABLE_STATUS";
      payload: { tableId: string; status: Table["status"]; orderId?: string };
    }
  | { type: "ADD_TABLE"; payload: Table }
  | { type: "DELETE_TABLE"; payload: string }
  | { type: "MOVE_TABLE"; payload: { tableId: string; x: number; y: number } }
  | {
      type: "TRANSFER_TABLE";
      payload: {
        orderId: string;
        fromTableId: string;
        toTableId: string;
        toTableNumber: number;
      };
    }
  // Zone actions
  | { type: "ADD_ZONE"; payload: Zone }
  | { type: "UPDATE_ZONE"; payload: Zone }
  | { type: "DELETE_ZONE"; payload: string }
  // Category actions
  | { type: "ADD_CATEGORY"; payload: Category }
  | { type: "UPDATE_CATEGORY"; payload: Category }
  | { type: "DELETE_CATEGORY"; payload: string }
  // Product actions
  | { type: "ADD_PRODUCT"; payload: Product }
  | { type: "UPDATE_PRODUCT"; payload: Product }
  | { type: "DELETE_PRODUCT"; payload: string }
  | { type: "TOGGLE_PRODUCT_AVAILABILITY"; payload: string }
  // Modifier actions
  | { type: "ADD_MODIFIER"; payload: Modifier }
  | { type: "UPDATE_MODIFIER"; payload: Modifier }
  | { type: "DELETE_MODIFIER"; payload: string }
  // Order actions
  | { type: "CREATE_ORDER"; payload: Order }
  | { type: "UPDATE_ORDER"; payload: Order }
  | { type: "ADD_ORDER_ITEM"; payload: { orderId: string; item: OrderItem } }
  | { type: "UPDATE_ORDER_ITEM"; payload: { orderId: string; item: OrderItem } }
  | { type: "REMOVE_ORDER_ITEM"; payload: { orderId: string; itemId: string } }
  | {
      type: "UPDATE_ITEM_STATUS";
      payload: { orderId: string; itemId: string; status: OrderItem["status"] };
    }
  | {
      type: "COMPLETE_ORDER";
      payload: { orderId: string; paymentMethod: "cash" | "card" };
    }
  | { type: "CANCEL_ORDER"; payload: string }
  | { type: "TOGGLE_RUSH"; payload: string }
  | { type: "ADVANCE_COURSE"; payload: string }
  // Ingredient actions
  | { type: "ADD_INGREDIENT"; payload: Ingredient }
  | { type: "UPDATE_INGREDIENT"; payload: Ingredient }
  | { type: "DELETE_INGREDIENT"; payload: string }
  | {
      type: "ADJUST_STOCK";
      payload: { ingredientId: string; quantity: number };
    }
  // Recipe actions
  | { type: "ADD_RECIPE"; payload: Recipe }
  | { type: "UPDATE_RECIPE"; payload: Recipe }
  | { type: "DELETE_RECIPE"; payload: string }
  // Waste actions
  | { type: "ADD_WASTE_ENTRY"; payload: WasteEntry }
  // Supplier actions
  | { type: "ADD_SUPPLIER"; payload: Supplier }
  | { type: "UPDATE_SUPPLIER"; payload: Supplier }
  | { type: "DELETE_SUPPLIER"; payload: string }
  // Supplier order actions
  | { type: "ADD_SUPPLIER_ORDER"; payload: SupplierOrder }
  | { type: "UPDATE_SUPPLIER_ORDER"; payload: SupplierOrder }
  | { type: "RECEIVE_SUPPLIER_ORDER"; payload: string }
  // Customer actions
  | { type: "ADD_CUSTOMER"; payload: Customer }
  | { type: "UPDATE_CUSTOMER"; payload: Customer }
  | { type: "DELETE_CUSTOMER"; payload: string }
  // Customer visit actions
  | { type: "ADD_CUSTOMER_VISIT"; payload: CustomerVisit }
  // Loyalty actions
  | { type: "UPDATE_LOYALTY_SETTINGS"; payload: LoyaltySettings }
  | {
      type: "ADD_LOYALTY_POINTS";
      payload: { customerId: string; points: number };
    }
  | {
      type: "REDEEM_LOYALTY_POINTS";
      payload: { customerId: string; points: number };
    }
  | { type: "ADD_STAMP"; payload: string }
  | { type: "REDEEM_STAMPS"; payload: string }
  // Staff actions
  | { type: "ADD_STAFF"; payload: StaffMember }
  | { type: "UPDATE_STAFF"; payload: StaffMember }
  | { type: "DELETE_STAFF"; payload: string }
  | { type: "SET_ACTIVE_STAFF"; payload: string | null }
  // Shift actions
  | { type: "SET_SHIFT"; payload: Shift }
  | { type: "CLOCK_IN"; payload: { staffId: string; time: string } }
  | { type: "CLOCK_OUT"; payload: { staffId: string; time: string } }
  // Checklist actions
  | { type: "TOGGLE_CHECKLIST"; payload: string }
  | { type: "RESET_CHECKLIST"; payload: ChecklistType }
  // AI actions
  | { type: "UPDATE_AI_SETTINGS"; payload: AISettings }
  | { type: "ADD_CHAT_MESSAGE"; payload: ChatMessage }
  | { type: "CLEAR_CHAT_HISTORY" }
  // Reservation actions (i-host integration)
  | { type: "ADD_RESERVATION"; payload: Reservation }
  | { type: "UPDATE_RESERVATION"; payload: Reservation }
  | { type: "DELETE_RESERVATION"; payload: string }
  | { type: "CONFIRM_RESERVATION"; payload: string }
  | { type: "SEAT_RESERVATION"; payload: { reservationId: string; tableId?: string } }
  | { type: "CANCEL_RESERVATION"; payload: { reservationId: string; reason?: string } }
  | { type: "MARK_NO_SHOW"; payload: string }
  | { type: "COMPLETE_RESERVATION"; payload: string }
  // Waitlist actions
  | { type: "ADD_TO_WAITLIST"; payload: WaitlistEntry }
  | { type: "UPDATE_WAITLIST_ENTRY"; payload: WaitlistEntry }
  | { type: "REMOVE_FROM_WAITLIST"; payload: string }
  | { type: "NOTIFY_WAITLIST"; payload: string }
  | { type: "SEAT_FROM_WAITLIST"; payload: { waitlistId: string; tableId: string } }
  // Booking settings
  | { type: "UPDATE_BOOKING_SETTINGS"; payload: BookingSettings };

// Helper functions
function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => {
    const modifiersTotal = item.modifiers.reduce(
      (mSum, m) => mSum + m.price,
      0,
    );
    return sum + (item.price + modifiersTotal) * item.quantity;
  }, 0);
}

function calculateVAT(items: OrderItem[], products: Product[]): number {
  return items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    const vatRate = product?.vatRate ?? 24;
    const modifiersTotal = item.modifiers.reduce(
      (mSum, m) => mSum + m.price,
      0,
    );
    const itemTotal = (item.price + modifiersTotal) * item.quantity;
    return sum + (itemTotal * vatRate) / (100 + vatRate);
  }, 0);
}

function deductStockForOrder(
  ingredients: Ingredient[],
  recipes: Recipe[],
  order: Order,
): Ingredient[] {
  const updatedIngredients = ingredients.map((ing) => ({ ...ing }));

  for (const item of order.items) {
    const recipe = recipes.find((r) => r.productId === item.productId);
    if (!recipe) continue;

    for (const recipeIng of recipe.ingredients) {
      const ingredient = updatedIngredients.find(
        (ing) => ing.id === recipeIng.ingredientId,
      );
      if (!ingredient) continue;

      ingredient.currentStock = Math.max(
        0,
        ingredient.currentStock - recipeIng.quantity * item.quantity,
      );
    }
  }

  return updatedIngredients;
}

function autoDisableProducts(
  products: Product[],
  ingredients: Ingredient[],
  recipes: Recipe[],
): Product[] {
  return products.map((product) => {
    const recipe = recipes.find((r) => r.productId === product.id);
    if (!recipe) return product;

    const hasLowStock = recipe.ingredients.some((recipeIng) => {
      const ingredient = ingredients.find(
        (ing) => ing.id === recipeIng.ingredientId,
      );
      return ingredient ? ingredient.currentStock < ingredient.minStock : false;
    });

    if (hasLowStock && product.available) {
      return { ...product, available: false };
    }
    return product;
  });
}

// Reducer
function posReducer(state: POSState, action: POSAction): POSState {
  switch (action.type) {
    case "LOAD_STATE":
      return { ...state, ...action.payload };

    case "SET_LOADED":
      return { ...state, isLoaded: true };

    case "RESET_STATE":
      return { ...initialState, isLoaded: true };

    case "UPDATE_TABLE":
      return {
        ...state,
        tables: state.tables.map((t) =>
          t.id === action.payload.id ? action.payload : t,
        ),
      };

    case "SET_TABLE_STATUS":
      return {
        ...state,
        tables: state.tables.map((t) =>
          t.id === action.payload.tableId
            ? {
                ...t,
                status: action.payload.status,
                currentOrderId: action.payload.orderId,
              }
            : t,
        ),
      };

    case "ADD_TABLE":
      return { ...state, tables: [...state.tables, action.payload] };

    case "DELETE_TABLE":
      return {
        ...state,
        tables: state.tables.filter((t) => t.id !== action.payload),
      };

    case "MOVE_TABLE":
      return {
        ...state,
        tables: state.tables.map((t) =>
          t.id === action.payload.tableId
            ? { ...t, x: action.payload.x, y: action.payload.y }
            : t,
        ),
      };

    case "TRANSFER_TABLE": {
      const { orderId, fromTableId, toTableId, toTableNumber } = action.payload;
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === orderId
            ? { ...o, tableId: toTableId, tableNumber: toTableNumber }
            : o,
        ),
        tables: state.tables.map((t) => {
          if (t.id === fromTableId)
            return {
              ...t,
              status: "available" as const,
              currentOrderId: undefined,
            };
          if (t.id === toTableId)
            return {
              ...t,
              status: "occupied" as const,
              currentOrderId: orderId,
            };
          return t;
        }),
      };
    }

    case "ADD_ZONE":
      return { ...state, zones: [...state.zones, action.payload] };

    case "UPDATE_ZONE":
      return {
        ...state,
        zones: state.zones.map((z) =>
          z.id === action.payload.id ? action.payload : z,
        ),
      };

    case "DELETE_ZONE":
      return {
        ...state,
        zones: state.zones.filter((z) => z.id !== action.payload),
      };

    case "ADD_CATEGORY":
      return { ...state, categories: [...state.categories, action.payload] };

    case "UPDATE_CATEGORY":
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.payload.id ? action.payload : c,
        ),
      };

    case "DELETE_CATEGORY":
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.payload),
      };

    case "ADD_PRODUCT":
      return { ...state, products: [...state.products, action.payload] };

    case "UPDATE_PRODUCT":
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.payload.id ? action.payload : p,
        ),
      };

    case "DELETE_PRODUCT":
      return {
        ...state,
        products: state.products.filter((p) => p.id !== action.payload),
      };

    case "TOGGLE_PRODUCT_AVAILABILITY":
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.payload ? { ...p, available: !p.available } : p,
        ),
      };

    case "ADD_MODIFIER":
      return { ...state, modifiers: [...state.modifiers, action.payload] };

    case "UPDATE_MODIFIER":
      return {
        ...state,
        modifiers: state.modifiers.map((m) =>
          m.id === action.payload.id ? action.payload : m,
        ),
      };

    case "DELETE_MODIFIER":
      return {
        ...state,
        modifiers: state.modifiers.filter((m) => m.id !== action.payload),
      };

    case "CREATE_ORDER":
      return { ...state, orders: [...state.orders, action.payload] };

    case "UPDATE_ORDER":
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.payload.id ? action.payload : o,
        ),
      };

    case "ADD_ORDER_ITEM": {
      return {
        ...state,
        orders: state.orders.map((o) => {
          if (o.id !== action.payload.orderId) return o;
          const newItems = [...o.items, action.payload.item];
          return {
            ...o,
            items: newItems,
            total: calculateTotal(newItems),
            vatAmount: calculateVAT(newItems, state.products),
          };
        }),
      };
    }

    case "UPDATE_ORDER_ITEM": {
      return {
        ...state,
        orders: state.orders.map((o) => {
          if (o.id !== action.payload.orderId) return o;
          const newItems = o.items.map((i) =>
            i.id === action.payload.item.id ? action.payload.item : i,
          );
          return {
            ...o,
            items: newItems,
            total: calculateTotal(newItems),
            vatAmount: calculateVAT(newItems, state.products),
          };
        }),
      };
    }

    case "REMOVE_ORDER_ITEM": {
      return {
        ...state,
        orders: state.orders.map((o) => {
          if (o.id !== action.payload.orderId) return o;
          const newItems = o.items.filter(
            (i) => i.id !== action.payload.itemId,
          );
          return {
            ...o,
            items: newItems,
            total: calculateTotal(newItems),
            vatAmount: calculateVAT(newItems, state.products),
          };
        }),
      };
    }

    case "UPDATE_ITEM_STATUS":
      return {
        ...state,
        orders: state.orders.map((o) => {
          if (o.id !== action.payload.orderId) return o;
          return {
            ...o,
            items: o.items.map((i) =>
              i.id === action.payload.itemId
                ? { ...i, status: action.payload.status }
                : i,
            ),
          };
        }),
      };

    case "COMPLETE_ORDER": {
      const order = state.orders.find((o) => o.id === action.payload.orderId);
      if (!order) return state;

      // Deduct stock from ingredients based on recipes
      const updatedIngredients = deductStockForOrder(
        state.ingredients,
        state.recipes,
        order,
      );

      // Auto-disable products when ingredients are below minStock
      const updatedProducts = autoDisableProducts(
        state.products,
        updatedIngredients,
        state.recipes,
      );

      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.payload.orderId
            ? {
                ...o,
                status: "completed",
                paymentMethod: action.payload.paymentMethod,
                completedAt: new Date().toISOString(),
              }
            : o,
        ),
        tables: state.tables.map((t) =>
          t.id === order.tableId
            ? { ...t, status: "available" as const, currentOrderId: undefined }
            : t,
        ),
        ingredients: updatedIngredients,
        products: updatedProducts,
      };
    }

    case "CANCEL_ORDER": {
      const order = state.orders.find((o) => o.id === action.payload);
      if (!order) return state;

      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.payload ? { ...o, status: "cancelled" } : o,
        ),
        tables: state.tables.map((t) =>
          t.id === order.tableId
            ? { ...t, status: "available" as const, currentOrderId: undefined }
            : t,
        ),
      };
    }

    case "TOGGLE_RUSH":
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.payload ? { ...o, isRush: !o.isRush } : o,
        ),
      };

    case "ADVANCE_COURSE":
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.payload
            ? { ...o, activeCourse: o.activeCourse + 1 }
            : o,
        ),
      };

    // Ingredient actions
    case "ADD_INGREDIENT":
      return { ...state, ingredients: [...state.ingredients, action.payload] };

    case "UPDATE_INGREDIENT":
      return {
        ...state,
        ingredients: state.ingredients.map((ing) =>
          ing.id === action.payload.id ? action.payload : ing,
        ),
      };

    case "DELETE_INGREDIENT":
      return {
        ...state,
        ingredients: state.ingredients.filter(
          (ing) => ing.id !== action.payload,
        ),
      };

    case "ADJUST_STOCK":
      return {
        ...state,
        ingredients: state.ingredients.map((ing) =>
          ing.id === action.payload.ingredientId
            ? {
                ...ing,
                currentStock: Math.max(
                  0,
                  ing.currentStock + action.payload.quantity,
                ),
              }
            : ing,
        ),
      };

    // Recipe actions
    case "ADD_RECIPE":
      return { ...state, recipes: [...state.recipes, action.payload] };

    case "UPDATE_RECIPE":
      return {
        ...state,
        recipes: state.recipes.map((r) =>
          r.id === action.payload.id ? action.payload : r,
        ),
      };

    case "DELETE_RECIPE":
      return {
        ...state,
        recipes: state.recipes.filter((r) => r.id !== action.payload),
      };

    // Waste actions
    case "ADD_WASTE_ENTRY":
      return { ...state, wasteLog: [...state.wasteLog, action.payload] };

    // Supplier actions
    case "ADD_SUPPLIER":
      return { ...state, suppliers: [...state.suppliers, action.payload] };

    case "UPDATE_SUPPLIER":
      return {
        ...state,
        suppliers: state.suppliers.map((s) =>
          s.id === action.payload.id ? action.payload : s,
        ),
      };

    case "DELETE_SUPPLIER":
      return {
        ...state,
        suppliers: state.suppliers.filter((s) => s.id !== action.payload),
      };

    // Supplier order actions
    case "ADD_SUPPLIER_ORDER":
      return {
        ...state,
        supplierOrders: [...state.supplierOrders, action.payload],
      };

    case "UPDATE_SUPPLIER_ORDER":
      return {
        ...state,
        supplierOrders: state.supplierOrders.map((so) =>
          so.id === action.payload.id ? action.payload : so,
        ),
      };

    case "RECEIVE_SUPPLIER_ORDER": {
      const supplierOrder = state.supplierOrders.find(
        (so) => so.id === action.payload,
      );
      if (!supplierOrder) return state;

      // Mark order as received and add stock for each item
      const updatedIngredients = state.ingredients.map((ing) => {
        const orderItem = supplierOrder.items.find(
          (item) => item.ingredientId === ing.id,
        );
        if (!orderItem) return ing;
        return {
          ...ing,
          currentStock: ing.currentStock + orderItem.quantity,
        };
      });

      return {
        ...state,
        supplierOrders: state.supplierOrders.map((so) =>
          so.id === action.payload
            ? { ...so, status: "received" as const }
            : so,
        ),
        ingredients: updatedIngredients,
      };
    }

    // Customer actions
    case "ADD_CUSTOMER":
      return { ...state, customers: [...state.customers, action.payload] };

    case "UPDATE_CUSTOMER":
      return {
        ...state,
        customers: state.customers.map((c) =>
          c.id === action.payload.id ? action.payload : c,
        ),
      };

    case "DELETE_CUSTOMER":
      return {
        ...state,
        customers: state.customers.filter((c) => c.id !== action.payload),
      };

    // Customer visit actions
    case "ADD_CUSTOMER_VISIT":
      return {
        ...state,
        customerVisits: [...state.customerVisits, action.payload],
      };

    // Loyalty actions
    case "UPDATE_LOYALTY_SETTINGS":
      return { ...state, loyaltySettings: action.payload };

    case "ADD_LOYALTY_POINTS":
      return {
        ...state,
        customers: state.customers.map((c) =>
          c.id === action.payload.customerId
            ? { ...c, loyaltyPoints: c.loyaltyPoints + action.payload.points }
            : c,
        ),
      };

    case "REDEEM_LOYALTY_POINTS":
      return {
        ...state,
        customers: state.customers.map((c) =>
          c.id === action.payload.customerId
            ? { ...c, loyaltyPoints: c.loyaltyPoints - action.payload.points }
            : c,
        ),
      };

    case "ADD_STAMP":
      return {
        ...state,
        customers: state.customers.map((c) =>
          c.id === action.payload ? { ...c, stampCount: c.stampCount + 1 } : c,
        ),
      };

    case "REDEEM_STAMPS":
      return {
        ...state,
        customers: state.customers.map((c) =>
          c.id === action.payload ? { ...c, stampCount: 0 } : c,
        ),
      };

    // Staff actions
    case "ADD_STAFF":
      return { ...state, staff: [...state.staff, action.payload] };

    case "UPDATE_STAFF":
      return {
        ...state,
        staff: state.staff.map((s) =>
          s.id === action.payload.id ? action.payload : s,
        ),
      };

    case "DELETE_STAFF":
      return {
        ...state,
        staff: state.staff.filter((s) => s.id !== action.payload),
        shifts: state.shifts.filter((sh) => sh.staffId !== action.payload),
        activeStaffId:
          state.activeStaffId === action.payload ? null : state.activeStaffId,
      };

    case "SET_ACTIVE_STAFF":
      return { ...state, activeStaffId: action.payload };

    // Shift actions
    case "SET_SHIFT": {
      const existing = state.shifts.find(
        (sh) =>
          sh.staffId === action.payload.staffId &&
          sh.date === action.payload.date,
      );
      if (existing) {
        return {
          ...state,
          shifts: state.shifts.map((sh) =>
            sh.staffId === action.payload.staffId &&
            sh.date === action.payload.date
              ? action.payload
              : sh,
          ),
        };
      }
      return { ...state, shifts: [...state.shifts, action.payload] };
    }

    case "CLOCK_IN": {
      const today = new Date().toISOString().split("T")[0];
      return {
        ...state,
        shifts: state.shifts.map((sh) =>
          sh.staffId === action.payload.staffId && sh.date === today
            ? { ...sh, clockIn: action.payload.time }
            : sh,
        ),
      };
    }

    case "CLOCK_OUT": {
      const todayDate = new Date().toISOString().split("T")[0];
      return {
        ...state,
        shifts: state.shifts.map((sh) =>
          sh.staffId === action.payload.staffId && sh.date === todayDate
            ? { ...sh, clockOut: action.payload.time }
            : sh,
        ),
      };
    }

    // Checklist actions
    case "TOGGLE_CHECKLIST":
      return {
        ...state,
        checklist: state.checklist.map((item) =>
          item.id === action.payload
            ? { ...item, checked: !item.checked }
            : item,
        ),
      };

    case "RESET_CHECKLIST":
      return {
        ...state,
        checklist: state.checklist.map((item) =>
          item.type === action.payload ? { ...item, checked: false } : item,
        ),
      };

    // AI actions
    case "UPDATE_AI_SETTINGS":
      return { ...state, aiSettings: action.payload };

    case "ADD_CHAT_MESSAGE":
      return { ...state, chatHistory: [...state.chatHistory, action.payload] };

    case "CLEAR_CHAT_HISTORY":
      return { ...state, chatHistory: [] };

    // === Reservation actions (i-host integration) ===
    case "ADD_RESERVATION":
      return { ...state, reservations: [...state.reservations, action.payload] };

    case "UPDATE_RESERVATION":
      return {
        ...state,
        reservations: state.reservations.map((r) =>
          r.id === action.payload.id ? action.payload : r,
        ),
      };

    case "DELETE_RESERVATION":
      return {
        ...state,
        reservations: state.reservations.filter((r) => r.id !== action.payload),
      };

    case "CONFIRM_RESERVATION":
      return {
        ...state,
        reservations: state.reservations.map((r) =>
          r.id === action.payload
            ? { ...r, status: "confirmed" as const, confirmedAt: new Date().toISOString() }
            : r,
        ),
      };

    case "SEAT_RESERVATION": {
      const { reservationId, tableId } = action.payload;
      return {
        ...state,
        reservations: state.reservations.map((r) =>
          r.id === reservationId
            ? {
                ...r,
                status: "seated" as const,
                seatedAt: new Date().toISOString(),
                tableId: tableId ?? r.tableId,
              }
            : r,
        ),
        tables: tableId
          ? state.tables.map((t) =>
              t.id === tableId ? { ...t, status: "occupied" as const } : t,
            )
          : state.tables,
      };
    }

    case "CANCEL_RESERVATION":
      return {
        ...state,
        reservations: state.reservations.map((r) =>
          r.id === action.payload.reservationId
            ? {
                ...r,
                status: "cancelled" as const,
                cancelledAt: new Date().toISOString(),
                cancellationReason: action.payload.reason,
              }
            : r,
        ),
      };

    case "MARK_NO_SHOW":
      return {
        ...state,
        reservations: state.reservations.map((r) =>
          r.id === action.payload ? { ...r, status: "no_show" as const } : r,
        ),
      };

    case "COMPLETE_RESERVATION":
      return {
        ...state,
        reservations: state.reservations.map((r) =>
          r.id === action.payload
            ? { ...r, status: "completed" as const, completedAt: new Date().toISOString() }
            : r,
        ),
      };

    // Waitlist actions
    case "ADD_TO_WAITLIST":
      return { ...state, waitlist: [...state.waitlist, action.payload] };

    case "UPDATE_WAITLIST_ENTRY":
      return {
        ...state,
        waitlist: state.waitlist.map((w) =>
          w.id === action.payload.id ? action.payload : w,
        ),
      };

    case "REMOVE_FROM_WAITLIST":
      return {
        ...state,
        waitlist: state.waitlist.filter((w) => w.id !== action.payload),
      };

    case "NOTIFY_WAITLIST":
      return {
        ...state,
        waitlist: state.waitlist.map((w) =>
          w.id === action.payload
            ? { ...w, status: "notified" as const, notifiedAt: new Date().toISOString() }
            : w,
        ),
      };

    case "SEAT_FROM_WAITLIST": {
      const { waitlistId, tableId: wTableId } = action.payload;
      return {
        ...state,
        waitlist: state.waitlist.map((w) =>
          w.id === waitlistId
            ? { ...w, status: "seated" as const, tableId: wTableId, seatedAt: new Date().toISOString() }
            : w,
        ),
        tables: state.tables.map((t) =>
          t.id === wTableId ? { ...t, status: "occupied" as const } : t,
        ),
      };
    }

    case "UPDATE_BOOKING_SETTINGS":
      return { ...state, bookingSettings: action.payload };

    default:
      return state;
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
  ingredients: initialIngredients,
  recipes: initialRecipes,
  wasteLog: initialWasteLog,
  suppliers: initialSuppliers,
  supplierOrders: initialSupplierOrders,
  customers: initialCustomers,
  customerVisits: initialCustomerVisits,
  loyaltySettings: initialLoyaltySettings,
  staff: initialStaff,
  shifts: initialShifts,
  checklist: initialChecklist,
  activeStaffId: null,
  aiSettings: { openaiKey: "", enabled: false },
  chatHistory: [],
  reservations: [],
  waitlist: [],
  bookingSettings: {
    minPartySize: 1,
    maxPartySize: 12,
    defaultDurationMinutes: 90,
    timeSlotIntervalMinutes: 30,
    minAdvanceHours: 2,
    maxAdvanceDays: 30,
    operatingHours: {
      monday: { open: "12:00", close: "23:30" },
      tuesday: { open: "12:00", close: "23:30" },
      wednesday: { open: "12:00", close: "23:30" },
      thursday: { open: "12:00", close: "23:30" },
      friday: { open: "12:00", close: "00:00" },
      saturday: { open: "12:00", close: "00:00" },
      sunday: { open: "12:00", close: "23:00" },
    },
    websiteBookingEnabled: true,
    autoConfirm: false,
    sendSmsConfirmation: true,
    sendEmailConfirmation: true,
    reminderHoursBefore: 3,
    noShowThresholdMinutes: 15,
  },
  isLoaded: false,
};

// Context
interface POSContextType {
  state: POSState;
  dispatch: React.Dispatch<POSAction>;
  // Helper functions
  getTable: (id: string) => Table | undefined;
  getCategory: (id: string) => Category | undefined;
  getProduct: (id: string) => Product | undefined;
  getOrder: (id: string) => Order | undefined;
  getActiveOrderForTable: (tableId: string) => Order | undefined;
  getProductsByCategory: (categoryId: string) => Product[];
  getKitchenOrders: () => Order[];
  createNewOrder: (tableId: string, tableNumber: number) => string;
  addItemToOrder: (
    orderId: string,
    product: Product,
    options?: {
      quantity?: number;
      notes?: string;
      modifiers?: SelectedModifier[];
      course?: number;
    },
  ) => void;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

// Storage key
const STORAGE_KEY = "eatflow-pos-state";
const STORAGE_VERSION = 8; // Increment when schema changes

// Provider
export function POSProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(posReducer, initialState);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check if data has the new schema
        const isValidSchema = parsed._version === STORAGE_VERSION;
        if (isValidSchema) {
          dispatch({ type: "LOAD_STATE", payload: parsed });
        } else {
          // Old schema -- clear and use fresh initial data
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error("Failed to load state from localStorage:", e);
    }
    dispatch({ type: "SET_LOADED" });
  }, []);

  // Save state to localStorage on changes
  useEffect(() => {
    if (state.isLoaded) {
      try {
        const toStore = {
          _version: STORAGE_VERSION,
          tables: state.tables,
          categories: state.categories,
          products: state.products,
          orders: state.orders,
          zones: state.zones,
          modifiers: state.modifiers,
          ingredients: state.ingredients,
          recipes: state.recipes,
          wasteLog: state.wasteLog,
          suppliers: state.suppliers,
          supplierOrders: state.supplierOrders,
          customers: state.customers,
          customerVisits: state.customerVisits,
          loyaltySettings: state.loyaltySettings,
          staff: state.staff,
          shifts: state.shifts,
          checklist: state.checklist,
          activeStaffId: state.activeStaffId,
          aiSettings: state.aiSettings,
          chatHistory: state.chatHistory,
          reservations: state.reservations,
          waitlist: state.waitlist,
          bookingSettings: state.bookingSettings,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      } catch (e) {
        console.error("Failed to save state to localStorage:", e);
      }
    }
  }, [state]);

  // Helper functions
  const getTable = (id: string) => state.tables.find((t) => t.id === id);
  const getCategory = (id: string) => state.categories.find((c) => c.id === id);
  const getProduct = (id: string) => state.products.find((p) => p.id === id);
  const getOrder = (id: string) => state.orders.find((o) => o.id === id);

  const getActiveOrderForTable = (tableId: string) =>
    state.orders.find((o) => o.tableId === tableId && o.status === "active");

  const getProductsByCategory = (categoryId: string) =>
    state.products.filter((p) => p.categoryId === categoryId);

  const getKitchenOrders = () =>
    state.orders.filter(
      (o) =>
        o.status === "active" && o.items.some((i) => i.status !== "served"),
    );

  const createNewOrder = (tableId: string, tableNumber: number): string => {
    const orderId = generateId();
    const newOrder: Order = {
      id: orderId,
      tableId,
      tableNumber,
      items: [],
      status: "active",
      createdAt: new Date().toISOString(),
      total: 0,
      vatAmount: 0,
      activeCourse: 1,
      isRush: false,
    };
    dispatch({ type: "CREATE_ORDER", payload: newOrder });
    dispatch({
      type: "SET_TABLE_STATUS",
      payload: { tableId, status: "occupied", orderId },
    });
    return orderId;
  };

  const addItemToOrder = (
    orderId: string,
    product: Product,
    options?: {
      quantity?: number;
      notes?: string;
      modifiers?: SelectedModifier[];
      course?: number;
    },
  ) => {
    const order = getOrder(orderId);
    if (!order) return;

    const quantity = options?.quantity ?? 1;
    const notes = options?.notes;
    const modifiers = options?.modifiers ?? [];
    const course = options?.course ?? order.activeCourse;

    // Only merge if no notes, no modifiers, same course
    const hasExtras = notes || modifiers.length > 0;
    const existingItem = !hasExtras
      ? order.items.find(
          (i) =>
            i.productId === product.id &&
            i.status === "pending" &&
            !i.notes &&
            i.modifiers.length === 0 &&
            i.course === course,
        )
      : undefined;

    if (existingItem) {
      dispatch({
        type: "UPDATE_ORDER_ITEM",
        payload: {
          orderId,
          item: { ...existingItem, quantity: existingItem.quantity + quantity },
        },
      });
    } else {
      const newItem: OrderItem = {
        id: generateId(),
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity,
        notes,
        status: "pending",
        createdAt: new Date().toISOString(),
        modifiers,
        course,
        station: product.station,
      };
      dispatch({ type: "ADD_ORDER_ITEM", payload: { orderId, item: newItem } });
    }
  };

  return (
    <POSContext.Provider
      value={{
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
        addItemToOrder,
      }}
    >
      {children}
    </POSContext.Provider>
  );
}

// Hook
export function usePOS() {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error("usePOS must be used within a POSProvider");
  }
  return context;
}
