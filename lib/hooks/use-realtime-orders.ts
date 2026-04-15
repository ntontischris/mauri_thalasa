"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import type {
  DbOrder,
  OrderItemWithModifiers,
  DbOrderItem,
} from "@/lib/types/database";

export function useRealtimeOrder(
  initialOrder: DbOrder | null,
  initialItems: OrderItemWithModifiers[],
  tableId: string,
) {
  const supabase = useSupabase();
  const [order, setOrder] = useState(initialOrder);
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    setOrder(initialOrder);
    setItems(initialItems);
  }, [initialOrder, initialItems]);

  const refetchItems = useCallback(async () => {
    if (!order) return;

    const { data } = await supabase
      .from("order_items")
      .select(
        `id, order_id, product_id, product_name, price, quantity,
         notes, status, course, station, created_at, updated_at,
         order_item_modifiers(id, order_item_id, modifier_id, name, price)`,
      )
      .eq("order_id", order.id)
      .order("course", { ascending: true })
      .order("created_at", { ascending: true });

    if (data) {
      setItems(data as OrderItemWithModifiers[]);
    }
  }, [supabase, order]);

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-order-${tableId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          const row = payload.new as DbOrder;
          if (row.table_id === tableId) {
            setOrder(row);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        (payload) => {
          const row = (payload.new ?? payload.old) as DbOrderItem;
          if (order && row.order_id === order.id) {
            refetchItems();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, tableId, order, refetchItems]);

  return { order, items, setOrder, setItems };
}
