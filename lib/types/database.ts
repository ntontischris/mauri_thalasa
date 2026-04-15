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
