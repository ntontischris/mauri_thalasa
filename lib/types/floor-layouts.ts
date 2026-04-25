export interface DbFloorLayout {
  id: string;
  floor_id: string;
  name: string;
  is_active: boolean;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbFloorLayoutPosition {
  layout_id: string;
  table_id: string;
  x: number;
  y: number;
  rotation: number;
  zone_id: string | null;
  is_visible: boolean;
}
