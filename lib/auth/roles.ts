export type StaffRole = "manager" | "waiter" | "chef" | "barman";

export const ALL_ROLES: StaffRole[] = ["manager", "waiter", "chef", "barman"];

export const ROLE_LABELS: Record<StaffRole, string> = {
  manager: "Διευθυντής",
  waiter: "Σερβιτόρος",
  chef: "Σεφ",
  barman: "Μπαρμαν",
};

export function hasAnyRole(
  role: StaffRole | undefined,
  allowed: StaffRole[],
): boolean {
  if (!role) return false;
  return allowed.includes(role);
}

export function getDefaultRouteForRole(role: StaffRole): string {
  switch (role) {
    case "manager":
      return "/orders";
    case "waiter":
      return "/tables";
    case "chef":
    case "barman":
      return "/kitchen";
  }
}

/**
 * Matches a pathname against an allowed-prefix list.
 * `/menu/x` matches `/menu`; `/ordersother` does NOT match `/orders`.
 */
export function canAccessPath(
  role: StaffRole,
  pathname: string,
  allowedPaths: string[],
): boolean {
  if (role === "manager") return true;
  return allowedPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export const ALLOWED_PATHS_BY_ROLE: Record<StaffRole, string[]> = {
  manager: [],
  waiter: [
    "/tables",
    "/orders",
    "/checkout",
    "/menu",
    "/customers",
    "/loyalty",
    "/reservations",
    "/reports",
  ],
  chef: ["/kitchen", "/menu", "/recipes", "/inventory"],
  barman: ["/kitchen", "/menu"],
};
