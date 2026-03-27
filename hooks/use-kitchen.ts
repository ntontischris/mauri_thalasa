import { usePOS } from "@/lib/pos-context";
import type { Order, OrderItem, Station } from "@/lib/types";

export type TimerColor = "green" | "amber" | "red";

export function useKitchen() {
  const { state, dispatch } = usePOS();

  const getKitchenOrders = (): Order[] =>
    state.orders.filter(
      (o) =>
        o.status === "active" && o.items.some((i) => i.status !== "served"),
    );

  const getOrdersByStation = (station: Station): Order[] =>
    getKitchenOrders().filter((o) =>
      o.items.some((i) => i.station === station && i.course <= o.activeCourse),
    );

  const getTimerColor = (createdAt: string): TimerColor => {
    const elapsedMs = Date.now() - new Date(createdAt).getTime();
    const elapsedMin = elapsedMs / 60000;

    if (elapsedMin < 5) return "green";
    if (elapsedMin <= 10) return "amber";
    return "red";
  };

  const formatTimer = (createdAt: string): string => {
    const elapsedMs = Date.now() - new Date(createdAt).getTime();
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const toggleRush = (orderId: string): void => {
    dispatch({ type: "TOGGLE_RUSH", payload: orderId });
  };

  const advanceCourse = (orderId: string): void => {
    dispatch({ type: "ADVANCE_COURSE", payload: orderId });
  };

  const updateItemStatus = (
    orderId: string,
    itemId: string,
    status: OrderItem["status"],
  ): void => {
    dispatch({
      type: "UPDATE_ITEM_STATUS",
      payload: { orderId, itemId, status },
    });
  };

  const markAllReady = (orderId: string): void => {
    const order = state.orders.find((o) => o.id === orderId);
    if (!order) return;

    order.items
      .filter((i) => i.status === "preparing")
      .forEach((i) => {
        dispatch({
          type: "UPDATE_ITEM_STATUS",
          payload: { orderId, itemId: i.id, status: "ready" },
        });
      });
  };

  const getStationCounts = (): Record<Station | "all", number> => {
    const kitchenOrders = getKitchenOrders();

    const activeItems = kitchenOrders.flatMap((o) =>
      o.items.filter(
        (i) => i.status !== "served" && i.course <= o.activeCourse,
      ),
    );

    const stations: Station[] = ["hot", "cold", "bar", "dessert"];
    const counts = stations.reduce<Record<string, number>>((acc, station) => {
      acc[station] = activeItems.filter((i) => i.station === station).length;
      return acc;
    }, {});

    counts["all"] = activeItems.length;

    return counts as Record<Station | "all", number>;
  };

  const isCourseComplete = (order: Order): boolean =>
    order.items
      .filter((i) => i.course === order.activeCourse)
      .every((i) => i.status === "ready" || i.status === "served");

  const hasNextCourse = (order: Order): boolean =>
    order.items.some((i) => i.course > order.activeCourse);

  return {
    getKitchenOrders,
    getOrdersByStation,
    getTimerColor,
    formatTimer,
    toggleRush,
    advanceCourse,
    updateItemStatus,
    markAllReady,
    getStationCounts,
    isCourseComplete,
    hasNextCourse,
  };
}
