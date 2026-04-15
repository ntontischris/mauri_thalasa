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
