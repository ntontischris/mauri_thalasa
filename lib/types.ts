// EatFlow POS - Type Definitions

export type Station = "hot" | "cold" | "bar" | "dessert";

export interface Zone {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface Modifier {
  id: string;
  name: string;
  price: number;
  categoryIds: string[];
}

export interface SelectedModifier {
  modifierId: string;
  name: string;
  price: number;
}

export interface Table {
  id: string;
  number: number;
  capacity: number;
  status: "available" | "occupied" | "bill-requested" | "dirty";
  currentOrderId?: string;
  zoneId: string;
  x: number;
  y: number;
  shape: "square" | "round" | "rectangle";
  rotation: number;
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  description?: string;
  vatRate: 24 | 13;
  available: boolean;
  station: Station;
  modifierIds: string[];
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  notes?: string;
  status: "pending" | "preparing" | "ready" | "served";
  createdAt: string;
  modifiers: SelectedModifier[];
  course: number;
  station: Station;
}

export interface Order {
  id: string;
  tableId: string;
  tableNumber: number;
  items: OrderItem[];
  status: "active" | "completed" | "cancelled";
  createdAt: string;
  completedAt?: string;
  paymentMethod?: "cash" | "card";
  total: number;
  vatAmount: number;
  activeCourse: number;
  isRush: boolean;
}

export interface DailySummary {
  date: string;
  totalRevenue: number;
  orderCount: number;
  averageCheck: number;
  cashPayments: number;
  cardPayments: number;
  topProducts: {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }[];
  hourlyRevenue: { hour: number; revenue: number }[];
}

// === Inventory Types ===

export type IngredientCategory =
  | "seafood"
  | "meat"
  | "dairy"
  | "vegetables"
  | "dry"
  | "drinks"
  | "other";
export type IngredientUnit = "kg" | "lt" | "pcs" | "gr" | "ml";

export interface Ingredient {
  id: string;
  name: string;
  unit: IngredientUnit;
  currentStock: number;
  minStock: number;
  costPerUnit: number;
  supplierId?: string;
  category: IngredientCategory;
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: IngredientUnit;
}

export interface Recipe {
  id: string;
  productId: string;
  ingredients: RecipeIngredient[];
  prepTime: number;
  portionSize: string;
}

export type WasteReason = "expired" | "damaged" | "overproduction" | "returned";

export interface WasteEntry {
  id: string;
  ingredientId: string;
  quantity: number;
  reason: WasteReason;
  date: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  categories: IngredientCategory[];
}

export interface SupplierOrderItem {
  ingredientId: string;
  quantity: number;
  estimatedCost: number;
}

export type SupplierOrderStatus = "draft" | "sent" | "received";

export interface SupplierOrder {
  id: string;
  supplierId: string;
  items: SupplierOrderItem[];
  status: SupplierOrderStatus;
  createdAt: string;
  notes?: string;
}

// Helper types
export type TableStatus = Table["status"];
export type OrderStatus = Order["status"];
export type OrderItemStatus = OrderItem["status"];
