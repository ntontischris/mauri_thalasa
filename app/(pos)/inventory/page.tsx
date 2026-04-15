import { getIngredients, getWasteLog } from "@/lib/queries/ingredients";
import { getSuppliers } from "@/lib/queries/suppliers";
import { InventoryPanel } from "@/components/pos/inventory-panel";

export default async function InventoryPage() {
  const [ingredients, wasteLog, suppliers] = await Promise.all([
    getIngredients(),
    getWasteLog(),
    getSuppliers(),
  ]);

  const lowStock = ingredients.filter((i) => i.current_stock <= i.min_stock);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Αποθήκη</h1>
        <p className="text-muted-foreground">
          {ingredients.length} υλικά
          {lowStock.length > 0 && (
            <span className="text-red-500">
              {" "}
              • {lowStock.length} χαμηλό απόθεμα
            </span>
          )}
        </p>
      </div>
      <InventoryPanel
        initialIngredients={ingredients}
        wasteLog={wasteLog}
        suppliers={suppliers}
      />
    </div>
  );
}
