"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import type { KitchenItem } from "@/lib/types/database";

export function useRealtimeKitchen(initialItems: KitchenItem[]) {
  const supabase = useSupabase();
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from("order_items")
      .select(
        `id, order_id, product_id, product_name, price, quantity,
         notes, status, course, station, created_at, updated_at,
         order_item_modifiers(id, order_item_id, modifier_id, name, price),
         orders!inner(table_number, status)`,
      )
      .in("status", ["pending", "preparing"])
      .eq("orders.status", "active")
      .order("created_at", { ascending: true });

    if (data) {
      const mapped = data.map((item: Record<string, unknown>) => {
        const orders = item.orders as { table_number: number };
        const { orders: _, ...rest } = item;
        return { ...rest, table_number: orders.table_number } as KitchenItem;
      });
      setItems(mapped);
    }
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("realtime-kitchen")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => {
          refetch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refetch]);

  return items;
}
