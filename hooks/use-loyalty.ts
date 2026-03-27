import { useCallback } from "react";
import { usePOS } from "@/lib/pos-context";
import type { Customer, LoyaltySettings } from "@/lib/types";

export function useLoyalty() {
  const { state, dispatch } = usePOS();

  const loyaltySettings = state.loyaltySettings;
  const customers = state.customers;
  const customerVisits = state.customerVisits;

  const updateLoyaltySettings = useCallback(
    (settings: LoyaltySettings): void => {
      dispatch({ type: "UPDATE_LOYALTY_SETTINGS", payload: settings });
    },
    [dispatch],
  );

  const addPoints = useCallback(
    (customerId: string, points: number): void => {
      dispatch({
        type: "ADD_LOYALTY_POINTS",
        payload: { customerId, points },
      });
    },
    [dispatch],
  );

  const redeemPoints = useCallback(
    (customerId: string): boolean => {
      const customer = customers.find((c) => c.id === customerId);
      if (!customer) return false;
      if (customer.loyaltyPoints < loyaltySettings.pointsForReward)
        return false;

      dispatch({
        type: "REDEEM_LOYALTY_POINTS",
        payload: {
          customerId,
          points: loyaltySettings.pointsForReward,
        },
      });
      return true;
    },
    [customers, loyaltySettings.pointsForReward, dispatch],
  );

  const addStamp = useCallback(
    (customerId: string): void => {
      dispatch({ type: "ADD_STAMP", payload: customerId });
    },
    [dispatch],
  );

  const redeemStamps = useCallback(
    (customerId: string): boolean => {
      const customer = customers.find((c) => c.id === customerId);
      if (!customer) return false;
      if (customer.stampCount < loyaltySettings.stampsForFreeItem) return false;

      dispatch({ type: "REDEEM_STAMPS", payload: customerId });
      return true;
    },
    [customers, loyaltySettings.stampsForFreeItem, dispatch],
  );

  const getRankings = useCallback(
    (): Customer[] =>
      [...customers].sort((a, b) => b.loyaltyPoints - a.loyaltyPoints),
    [customers],
  );

  const getNearReward = useCallback(
    (threshold = 20): Customer[] => {
      const minPoints = loyaltySettings.pointsForReward - threshold;
      return customers.filter(
        (c) =>
          c.loyaltyPoints >= minPoints &&
          c.loyaltyPoints < loyaltySettings.pointsForReward,
      );
    },
    [customers, loyaltySettings.pointsForReward],
  );

  const getNearStampReward = useCallback(
    (threshold = 2): Customer[] => {
      const minStamps = loyaltySettings.stampsForFreeItem - threshold;
      return customers.filter(
        (c) =>
          c.stampCount >= minStamps &&
          c.stampCount < loyaltySettings.stampsForFreeItem,
      );
    },
    [customers, loyaltySettings.stampsForFreeItem],
  );

  const getIdleCustomers = useCallback(
    (days = 30): Customer[] => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      return customers.filter((c) => {
        const visits = customerVisits.filter((v) => v.customerId === c.id);
        if (visits.length === 0) return true;

        const latestVisit = visits.reduce((latest, v) =>
          new Date(v.date) > new Date(latest.date) ? v : latest,
        );
        return new Date(latestVisit.date) < cutoff;
      });
    },
    [customers, customerVisits],
  );

  return {
    loyaltySettings,
    updateLoyaltySettings,
    addPoints,
    redeemPoints,
    addStamp,
    redeemStamps,
    getRankings,
    getNearReward,
    getNearStampReward,
    getIdleCustomers,
  };
}
