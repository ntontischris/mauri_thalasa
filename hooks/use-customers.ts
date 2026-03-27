import { useCallback } from "react";
import { usePOS } from "@/lib/pos-context";
import type { Customer, CustomerVisit } from "@/lib/types";
import { generateId } from "@/lib/mock-data";

interface FavoriteProduct {
  name: string;
  count: number;
}

export function useCustomers() {
  const { state, dispatch } = usePOS();

  const customers = state.customers;
  const customerVisits = state.customerVisits;

  const addCustomer = useCallback(
    (data: Omit<Customer, "id" | "createdAt">): void => {
      const customer: Customer = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: "ADD_CUSTOMER", payload: customer });
    },
    [dispatch],
  );

  const updateCustomer = useCallback(
    (customer: Customer): void => {
      dispatch({ type: "UPDATE_CUSTOMER", payload: customer });
    },
    [dispatch],
  );

  const deleteCustomer = useCallback(
    (id: string): void => {
      dispatch({ type: "DELETE_CUSTOMER", payload: id });
    },
    [dispatch],
  );

  const getCustomerVisits = useCallback(
    (customerId: string): CustomerVisit[] =>
      customerVisits
        .filter((v) => v.customerId === customerId)
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
    [customerVisits],
  );

  const getVisitCount = useCallback(
    (customerId: string): number =>
      customerVisits.filter((v) => v.customerId === customerId).length,
    [customerVisits],
  );

  const getTotalSpent = useCallback(
    (customerId: string): number =>
      customerVisits
        .filter((v) => v.customerId === customerId)
        .reduce((sum, v) => sum + v.total, 0),
    [customerVisits],
  );

  const getFavoriteProducts = useCallback(
    (customerId: string, limit = 3): FavoriteProduct[] => {
      const visits = customerVisits.filter((v) => v.customerId === customerId);
      const counts = new Map<string, number>();

      for (const visit of visits) {
        for (const item of visit.items) {
          counts.set(item, (counts.get(item) ?? 0) + 1);
        }
      }

      return Array.from(counts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    },
    [customerVisits],
  );

  const getVipCustomers = useCallback(
    (): Customer[] => customers.filter((c) => c.isVip),
    [customers],
  );

  const getUpcomingBirthdays = useCallback(
    (days = 7): Customer[] => {
      const now = new Date();
      const currentYear = now.getFullYear();

      return customers.filter((c) => {
        if (!c.birthday) return false;

        const bday = new Date(c.birthday);
        const bdayMonth = bday.getMonth();
        const bdayDay = bday.getDate();

        // Check this year's birthday
        const thisYearBday = new Date(currentYear, bdayMonth, bdayDay);
        const diffThis = Math.floor(
          (thisYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diffThis >= 0 && diffThis <= days) return true;

        // Check next year's birthday (handles year wrapping)
        const nextYearBday = new Date(currentYear + 1, bdayMonth, bdayDay);
        const diffNext = Math.floor(
          (nextYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diffNext >= 0 && diffNext <= days) return true;

        return false;
      });
    },
    [customers],
  );

  const searchCustomers = useCallback(
    (query: string): Customer[] => {
      if (!query.trim()) return customers;
      const lower = query.toLowerCase();
      return customers.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          (c.phone && c.phone.toLowerCase().includes(lower)),
      );
    },
    [customers],
  );

  const addVisit = useCallback(
    (
      customerId: string,
      orderId: string,
      tableNumber: number,
      total: number,
      items: string[],
    ): void => {
      const visit: CustomerVisit = {
        id: generateId(),
        customerId,
        orderId,
        date: new Date().toISOString(),
        tableNumber,
        total,
        items,
      };
      dispatch({ type: "ADD_CUSTOMER_VISIT", payload: visit });
    },
    [dispatch],
  );

  return {
    customers,
    customerVisits,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerVisits,
    getVisitCount,
    getTotalSpent,
    getFavoriteProducts,
    getVipCustomers,
    getUpcomingBirthdays,
    searchCustomers,
    addVisit,
  };
}
