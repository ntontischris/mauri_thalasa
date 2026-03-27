import { usePOS } from "@/lib/pos-context";
import type { Zone, Table } from "@/lib/types";
import { generateId } from "@/lib/mock-data";

export function useTableLayout() {
  const { state, dispatch } = usePOS();

  const getTablesByZone = (zoneId: string): Table[] =>
    state.tables.filter((t) => t.zoneId === zoneId);

  const getAvailableTables = (): Table[] =>
    state.tables.filter((t) => t.status === "available");

  const addZone = (name: string, color: string): void => {
    const zone: Zone = {
      id: generateId(),
      name,
      color,
      order: state.zones.length,
    };
    dispatch({ type: "ADD_ZONE", payload: zone });
  };

  const updateZone = (zone: Zone): void => {
    dispatch({ type: "UPDATE_ZONE", payload: zone });
  };

  const deleteZone = (zoneId: string): void => {
    dispatch({ type: "DELETE_ZONE", payload: zoneId });
  };

  const addTable = (zoneId: string, shape: Table["shape"]): void => {
    const zoneNumbers = state.tables
      .map((t) => t.number)
      .filter((n) => typeof n === "number");
    const nextNumber =
      zoneNumbers.length > 0 ? Math.max(...zoneNumbers) + 1 : 1;

    const table: Table = {
      id: generateId(),
      number: nextNumber,
      capacity: 4,
      status: "available",
      zoneId,
      x: 50,
      y: 50,
      shape,
      rotation: 0,
    };
    dispatch({ type: "ADD_TABLE", payload: table });
  };

  const moveTable = (tableId: string, x: number, y: number): void => {
    dispatch({ type: "MOVE_TABLE", payload: { tableId, x, y } });
  };

  const deleteTable = (tableId: string): void => {
    dispatch({ type: "DELETE_TABLE", payload: tableId });
  };

  const transferTable = (
    orderId: string,
    fromTableId: string,
    toTableId: string,
  ): void => {
    const toTable = state.tables.find((t) => t.id === toTableId);
    if (!toTable) return;
    dispatch({
      type: "TRANSFER_TABLE",
      payload: {
        orderId,
        fromTableId,
        toTableId,
        toTableNumber: toTable.number,
      },
    });
  };

  return {
    zones: state.zones,
    tables: state.tables,
    getTablesByZone,
    getAvailableTables,
    addZone,
    updateZone,
    deleteZone,
    addTable,
    moveTable,
    deleteTable,
    transferTable,
  };
}
