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
  | { type: "RECEIVE_SUPPLIER_ORDER"; payload: string };

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
const STORAGE_VERSION = 4; // Increment when schema changes

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
