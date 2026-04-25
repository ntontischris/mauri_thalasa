"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { moveTable } from "@/lib/actions/floor-plan";
import type { DbTable } from "@/lib/types/database";

type Snapshot = Pick<DbTable, "id" | "x" | "y" | "rotation" | "zone_id">[];

export function useCanvasState(initial: DbTable[]) {
  const [tables, setTables] = useState<DbTable[]>(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const debouncers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  // Sync from server when the source data changes (e.g., after a layout switch)
  useEffect(() => {
    setTables(initial);
  }, [initial]);

  // Cleanup any pending debounce timers on unmount to avoid stray writes
  useEffect(() => {
    return () => {
      debouncers.current.forEach((handle) => clearTimeout(handle));
      debouncers.current.clear();
    };
  }, []);

  const snapshot = useCallback((): Snapshot => {
    return tables.map((t) => ({
      id: t.id,
      x: t.x,
      y: t.y,
      rotation: t.rotation,
      zone_id: t.zone_id,
    }));
  }, [tables]);

  const pushUndo = useCallback(() => {
    undoStack.current.push(snapshot());
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
  }, [snapshot]);

  const moveLocal = useCallback(
    (id: string, x: number, y: number, rotation?: number) => {
      setTables((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, x, y, rotation: rotation ?? t.rotation } : t,
        ),
      );

      const existing = debouncers.current.get(id);
      if (existing) clearTimeout(existing);
      const handle = setTimeout(async () => {
        const result = await moveTable({ id, x, y, rotation });
        if (!result.success) {
          console.error("moveTable failed:", result.error);
        }
        debouncers.current.delete(id);
      }, 300);
      debouncers.current.set(id, handle);
    },
    [],
  );

  const applySnapshot = useCallback((snap: Snapshot) => {
    setTables((current) =>
      current.map((t) => {
        const m = snap.find((p) => p.id === t.id);
        return m ? { ...t, ...m } : t;
      }),
    );
    Promise.all(
      snap.map((p) =>
        moveTable({ id: p.id, x: p.x, y: p.y, rotation: p.rotation }),
      ),
    ).catch((err) => {
      console.error("applySnapshot batch failed:", err);
    });
  }, []);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push(snapshot());
    applySnapshot(prev);
  }, [snapshot, applySnapshot]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(snapshot());
    applySnapshot(next);
  }, [snapshot, applySnapshot]);

  return {
    tables,
    setTables,
    selected,
    setSelected,
    moveLocal,
    pushUndo,
    undo,
    redo,
  };
}
