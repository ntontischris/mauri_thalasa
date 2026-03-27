"use client";

import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/mock-data";
import type { Table, Order } from "@/lib/types";

interface TableShapeProps {
  table: Table;
  order?: Order;
  zoneColor?: string;
  onClick?: () => void;
  isDragging?: boolean;
  className?: string;
}

const STATUS_COLORS: Record<Table["status"], string> = {
  available: "bg-green-500 hover:bg-green-400",
  occupied: "bg-red-500 hover:bg-red-400",
  "bill-requested": "bg-amber-500 hover:bg-amber-400 animate-pulse",
  dirty: "bg-gray-400 hover:bg-gray-300",
};

const SHAPE_CLASSES: Record<Table["shape"], string> = {
  round: "w-14 h-14 rounded-full",
  square: "w-14 h-14 rounded-lg",
  rectangle: "w-20 h-12 rounded-lg",
};

function renderTableInfo(table: Table, order?: Order) {
  if (table.status === "available") {
    return (
      <span className="flex items-center gap-0.5 text-[10px]">
        <Users size={10} />
        {table.capacity}
      </span>
    );
  }

  if (table.status === "bill-requested") {
    return <span className="text-[10px] font-bold">BILL</span>;
  }

  if (table.status === "occupied" && order) {
    return <span className="text-[10px]">{formatPrice(order.total)}</span>;
  }

  return null;
}

export function TableShape({
  table,
  order,
  zoneColor,
  onClick,
  isDragging,
  className,
}: TableShapeProps) {
  // Use zone color for available tables, status color for occupied/bill/dirty
  const useZoneColor = table.status === "available" && zoneColor;

  return (
    <button
      onClick={onClick}
      style={{
        transform: `rotate(${table.rotation}deg)`,
        ...(useZoneColor ? { backgroundColor: zoneColor } : {}),
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-0.5",
        "text-white font-bold",
        "shadow-md transition-all duration-150",
        "hover:scale-110 hover:shadow-lg hover:brightness-110 active:scale-95",
        !useZoneColor && STATUS_COLORS[table.status],
        SHAPE_CLASSES[table.shape],
        isDragging && "opacity-50 scale-110 shadow-xl",
        className,
      )}
    >
      <span className="text-xs font-bold leading-none">T{table.number}</span>
      {renderTableInfo(table, order)}
    </button>
  );
}
