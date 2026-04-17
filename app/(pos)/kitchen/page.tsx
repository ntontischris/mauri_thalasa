import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getKitchenItems } from "@/lib/queries/orders";
import { getCourses } from "@/lib/queries/courses";
import { KitchenDisplay } from "@/components/pos/kitchen-display";
import type { StaffRole } from "@/lib/auth/roles";
import type { StationType } from "@/lib/types/database";

function defaultStationForRole(role: StaffRole): StationType | "all" {
  switch (role) {
    case "chef":
      return "hot"; // chef also sees cold+dessert via tabs; default to hot
    case "barman":
      return "bar";
    default:
      return "all";
  }
}

function allowedStationsForRole(
  role: StaffRole,
): (StationType | "all")[] | null {
  switch (role) {
    case "chef":
      return ["all", "hot", "cold", "dessert"];
    case "barman":
      return ["bar"];
    default:
      return null; // manager → all stations
  }
}

export default async function KitchenPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = (user?.user_metadata?.role as StaffRole) ?? "manager";

  const [items, courses] = await Promise.all([getKitchenItems(), getCourses()]);

  const defaultStation = defaultStationForRole(role);
  const allowedStations = allowedStationsForRole(role);

  // Filter items to stations the role can see
  const visibleItems = allowedStations
    ? items.filter(
        (i) =>
          allowedStations.includes("all") ||
          allowedStations.includes(i.station),
      )
    : items;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Κουζίνα</h1>
        <p className="text-muted-foreground">
          {visibleItems.filter((i) => i.status === "pending").length} σε αναμονή
          {" • "}
          {visibleItems.filter((i) => i.status === "preparing").length}{" "}
          ετοιμάζονται
        </p>
      </div>
      <KitchenDisplay
        initialItems={visibleItems}
        courses={courses}
        defaultStation={defaultStation}
        allowedStations={allowedStations}
      />
    </div>
  );
}
