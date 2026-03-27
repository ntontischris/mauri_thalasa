import { usePOS } from "@/lib/pos-context";
import type { OrderItem } from "@/lib/types";

export function useOrders() {
  const {
    state,
    dispatch,
    getOrder,
    getActiveOrderForTable,
    createNewOrder,
    addItemToOrder,
  } = usePOS();

  const sendToKitchen = (orderId: string): void => {
    const order = getOrder(orderId);
    if (!order) return;

    order.items
      .filter((i) => i.status === "pending")
      .forEach((i) => {
        dispatch({
          type: "UPDATE_ITEM_STATUS",
          payload: { orderId, itemId: i.id, status: "preparing" },
        });
      });
  };

  const requestBill = (tableId: string, orderId: string): void => {
    dispatch({
      type: "SET_TABLE_STATUS",
      payload: { tableId, status: "bill-requested", orderId },
    });
  };

  const cancelOrder = (orderId: string): void => {
    dispatch({ type: "CANCEL_ORDER", payload: orderId });
  };

  const updateItemQuantity = (
    orderId: string,
    itemId: string,
    quantity: number,
  ): void => {
    const order = getOrder(orderId);
    if (!order) return;

    const item = order.items.find((i) => i.id === itemId);
    if (!item) return;

    const updatedItem: OrderItem = { ...item, quantity };
    dispatch({
      type: "UPDATE_ORDER_ITEM",
      payload: { orderId, item: updatedItem },
    });
  };

  const removeItem = (orderId: string, itemId: string): void => {
    dispatch({ type: "REMOVE_ORDER_ITEM", payload: { orderId, itemId } });
  };

  return {
    orders: state.orders,
    getOrder,
    getActiveOrderForTable,
    createNewOrder,
    addItemToOrder,
    sendToKitchen,
    requestBill,
    cancelOrder,
    updateItemQuantity,
    removeItem,
  };
}
