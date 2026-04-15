// Database row types (what Supabase returns)

export interface DbProduct {
  id: string;
  code: string | null;
  name: string;
  name_alt: string | null;
  price: number;
  category_id: string;
  description: string | null;
  vat_rate: number;
  available: boolean;
  station: "hot" | "cold" | "bar" | "dessert";
  sort_order: number;
  cost_price: number | null;
  legacy_id: number | null;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbCategory {
  id: string;
  name: string;
  sort_order: number;
  legacy_id: number | null;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbStaffMember {
  id: string;
  name: string;
  role: "waiter" | "chef" | "barman" | "manager";
  pin: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  legacy_id: number | null;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbAuditLog {
  id: number;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_by: string | null;
  staff_name: string | null;
  created_at: string;
}

// --- Zones ---

export interface DbZone {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  legacy_id: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// --- Tables ---

export type TableStatus = "available" | "occupied" | "bill-requested" | "dirty";
export type TableShape = "square" | "round" | "rectangle";

export interface DbTable {
  id: string;
  number: number;
  capacity: number;
  status: TableStatus;
  current_order_id: string | null;
  zone_id: string;
  x: number;
  y: number;
  shape: TableShape;
  rotation: number;
  legacy_id: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// --- Modifiers ---

export interface DbModifier {
  id: string;
  name: string;
  price: number;
  created_at: string;
  updated_at: string;
}

// --- Orders ---

export type OrderStatus = "active" | "completed" | "cancelled";
export type OrderItemStatus = "pending" | "preparing" | "ready" | "served";
export type PaymentMethod = "cash" | "card";
export type StationType = "hot" | "cold" | "bar" | "dessert";

export interface DbOrder {
  id: string;
  table_id: string;
  table_number: number;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  total: number;
  vat_amount: number;
  discount_amount: number;
  active_course: number;
  is_rush: boolean;
  notes: string | null;
  customer_id: string | null;
  created_by: string | null;
  completed_by: string | null;
  elorus_invoice_id: string | null;
  fiscal_mark: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  notes: string | null;
  status: OrderItemStatus;
  course: number;
  station: StationType;
  created_at: string;
  updated_at: string;
}

export interface DbOrderItemModifier {
  id: string;
  order_item_id: string;
  modifier_id: string;
  name: string;
  price: number;
}

// --- Composite types for queries with joins ---

export type OrderItemWithModifiers = DbOrderItem & {
  order_item_modifiers: DbOrderItemModifier[];
};

export type KitchenItem = DbOrderItem & {
  table_number: number;
  order_item_modifiers: DbOrderItemModifier[];
};

// --- Customers ---

export interface DbCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthday: string | null;
  notes: string | null;
  is_vip: boolean;
  allergies: string[];
  tags: string[];
  loyalty_points: number;
  stamp_count: number;
  afm: string | null;
  address: Record<string, unknown>;
  contact: Record<string, unknown>;
  billing: Record<string, unknown>;
  is_active: boolean;
  discount: number;
  legacy_id: number | null;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbCustomerVisit {
  id: string;
  customer_id: string;
  order_id: string | null;
  date: string;
  table_number: number;
  total: number;
  items: string[];
  created_at: string;
}

// --- Inventory ---

export type IngredientUnit = "kg" | "lt" | "pcs" | "gr" | "ml";
export type IngredientCategory =
  | "seafood"
  | "meat"
  | "vegetables"
  | "dairy"
  | "dry"
  | "beverages"
  | "other";
export type WasteReason = "expired" | "damaged" | "overproduction" | "other";

export interface DbIngredient {
  id: string;
  name: string;
  unit: IngredientUnit;
  current_stock: number;
  min_stock: number;
  cost_per_unit: number;
  supplier_id: string | null;
  category: IngredientCategory;
  created_at: string;
  updated_at: string;
}

export interface DbWasteEntry {
  id: string;
  ingredient_id: string;
  quantity: number;
  reason: WasteReason;
  date: string;
  notes: string | null;
  created_at: string;
}

// --- Recipes ---

export interface DbRecipe {
  id: string;
  product_id: string;
  prep_time: number | null;
  portion_size: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbRecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
}

export type RecipeWithIngredients = DbRecipe & {
  recipe_ingredients: (DbRecipeIngredient & {
    ingredients: DbIngredient;
  })[];
  products: { name: string; price: number };
};

// --- Suppliers ---

export type SupplierOrderStatus = "draft" | "sent" | "received" | "cancelled";

export interface DbSupplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  categories: IngredientCategory[];
  afm: string | null;
  address: Record<string, unknown>;
  legacy_id: number | null;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbSupplierOrder {
  id: string;
  supplier_id: string;
  status: SupplierOrderStatus;
  created_at: string;
  notes: string | null;
}

export interface DbSupplierOrderItem {
  id: string;
  supplier_order_id: string;
  ingredient_id: string;
  quantity: number;
  estimated_cost: number;
}

export type SupplierOrderWithItems = DbSupplierOrder & {
  supplier_order_items: (DbSupplierOrderItem & {
    ingredients: { name: string; unit: string };
  })[];
  suppliers: { name: string };
};

export type IngredientWithSupplier = DbIngredient & {
  suppliers: { name: string } | null;
};

export type WasteEntryWithIngredient = DbWasteEntry & {
  ingredients: { name: string; unit: string };
};

// Insert types (what we send to Supabase)

export interface InsertProduct {
  name: string;
  price: number;
  category_id: string;
  code?: string;
  name_alt?: string;
  description?: string;
  vat_rate?: number;
  available?: boolean;
  station?: "hot" | "cold" | "bar" | "dessert";
  sort_order?: number;
  cost_price?: number;
}

export interface UpdateProduct {
  name?: string;
  price?: number;
  category_id?: string;
  code?: string;
  name_alt?: string;
  description?: string;
  vat_rate?: number;
  available?: boolean;
  station?: "hot" | "cold" | "bar" | "dessert";
  sort_order?: number;
  cost_price?: number;
}

export interface InsertCategory {
  name: string;
  sort_order?: number;
}
