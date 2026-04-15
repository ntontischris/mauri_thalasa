"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import type { DbTable } from "@/lib/types/database";

export function useRealtimeTables(initialTables: DbTable[]) {
  const supabase = useSupabase();
  const [tables, setTables] = useState(initialTables);

  useEffect(() => {
    setTables(initialTables);
  }, [initialTables]);

  useEffect(() => {
    const channel = supabase
      .channel("realtime-tables")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setTables((prev) =>
              prev.map((t) =>
                t.id === (payload.new as DbTable).id
                  ? (payload.new as DbTable)
                  : t,
              ),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return tables;
}
