import { usePOS } from "@/lib/pos-context";
import type { Supplier, SupplierOrder, SupplierOrderItem } from "@/lib/types";
import { generateId } from "@/lib/mock-data";

export function useSuppliers() {
  const { state, dispatch } = usePOS();

  const suppliers = state.suppliers;
  const supplierOrders = state.supplierOrders;

  const addSupplier = (data: Omit<Supplier, "id">): void => {
    const supplier: Supplier = { id: generateId(), ...data };
    dispatch({ type: "ADD_SUPPLIER", payload: supplier });
  };

  const updateSupplier = (supplier: Supplier): void => {
    dispatch({ type: "UPDATE_SUPPLIER", payload: supplier });
  };

  const deleteSupplier = (supplierId: string): void => {
    dispatch({ type: "DELETE_SUPPLIER", payload: supplierId });
  };

  const createOrder = (
    supplierId: string,
    items: SupplierOrderItem[],
    notes?: string,
  ): void => {
    const order: SupplierOrder = {
      id: generateId(),
      supplierId,
      items,
      status: "draft",
      createdAt: new Date().toISOString(),
      notes,
    };
    dispatch({ type: "ADD_SUPPLIER_ORDER", payload: order });
  };

  const updateOrder = (order: SupplierOrder): void => {
    dispatch({ type: "UPDATE_SUPPLIER_ORDER", payload: order });
  };

  const sendOrder = (orderId: string): void => {
    const order = supplierOrders.find((so) => so.id === orderId);
    if (!order) return;
    dispatch({
      type: "UPDATE_SUPPLIER_ORDER",
      payload: { ...order, status: "sent" },
    });
  };

  const receiveOrder = (orderId: string): void => {
    dispatch({ type: "RECEIVE_SUPPLIER_ORDER", payload: orderId });
  };

  const getOrdersBySupplier = (supplierId: string): SupplierOrder[] =>
    supplierOrders.filter((so) => so.supplierId === supplierId);

  return {
    suppliers,
    supplierOrders,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    createOrder,
    updateOrder,
    sendOrder,
    receiveOrder,
    getOrdersBySupplier,
  };
}
