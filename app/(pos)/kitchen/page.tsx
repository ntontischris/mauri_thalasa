import { getKitchenItems } from "@/lib/queries/orders";
import { getCourses } from "@/lib/queries/courses";
import { KitchenDisplay } from "@/components/pos/kitchen-display";

export default async function KitchenPage() {
  const [items, courses] = await Promise.all([getKitchenItems(), getCourses()]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Κουζίνα</h1>
        <p className="text-muted-foreground">
          {items.filter((i) => i.status === "pending").length} σε αναμονή
          {" • "}
          {items.filter((i) => i.status === "preparing").length} ετοιμάζονται
        </p>
      </div>
      <KitchenDisplay initialItems={items} courses={courses} />
    </div>
  );
}
