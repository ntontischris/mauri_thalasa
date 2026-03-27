"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWaste } from "@/hooks/use-waste";
import { useInventory } from "@/hooks/use-inventory";
import { formatPrice, formatDateTime } from "@/lib/mock-data";
import type { WasteReason } from "@/lib/types";

const REASON_LABELS: Record<WasteReason, string> = {
  expired: "Ληγμένο",
  damaged: "Κατεστραμμένο",
  overproduction: "Υπερπαραγωγή",
  returned: "Επιστροφή",
};

const REASON_COLORS: Record<WasteReason, string> = {
  expired: "text-red-600",
  damaged: "text-orange-600",
  overproduction: "text-yellow-600",
  returned: "text-blue-600",
};

export function WasteLog() {
  const {
    wasteLog,
    getMonthlyWasteCost,
    getWasteByReason,
    getTopWastedIngredients,
  } = useWaste();
  const { ingredients } = useInventory();

  const monthlyCost = getMonthlyWasteCost();
  const byReason = getWasteByReason();
  const topWasted = getTopWastedIngredients(5);

  const sortedLog = [...wasteLog].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const findIngredient = (id: string) => ingredients.find((i) => i.id === id);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Σπατάλη Μήνα
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {formatPrice(monthlyCost)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ανά Λόγο
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {(Object.keys(REASON_LABELS) as WasteReason[]).map((reason) => (
                <li
                  key={reason}
                  className="flex items-center justify-between text-sm"
                >
                  <span className={REASON_COLORS[reason]}>
                    {REASON_LABELS[reason]}
                  </span>
                  <span className="font-medium">
                    {formatPrice(byReason[reason])}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Σπαταλημένα
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topWasted.length === 0 ? (
              <p className="text-sm text-muted-foreground">Καμία καταγραφή</p>
            ) : (
              <ul className="space-y-1">
                {topWasted.map(({ ingredientId, totalCost }) => {
                  const ing = findIngredient(ingredientId);
                  return (
                    <li
                      key={ingredientId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate">
                        {ing?.name ?? ingredientId}
                      </span>
                      <span className="ml-2 shrink-0 font-medium">
                        {formatPrice(totalCost)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Waste log table */}
      <Card>
        <CardHeader>
          <CardTitle>Ιστορικό Σπατάλης</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedLog.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Δεν υπάρχουν καταγραφές
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Ημ/νία</th>
                    <th className="pb-2 pr-4 font-medium">Υλικό</th>
                    <th className="pb-2 pr-4 font-medium">Ποσότητα</th>
                    <th className="pb-2 pr-4 font-medium">Λόγος</th>
                    <th className="pb-2 font-medium">Κόστος</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLog.map((entry) => {
                    const ing = findIngredient(entry.ingredientId);
                    const cost = ing ? ing.costPerUnit * entry.quantity : 0;
                    return (
                      <tr
                        key={entry.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="py-2 pr-4 text-muted-foreground">
                          {formatDateTime(entry.date)}
                        </td>
                        <td className="py-2 pr-4 font-medium">
                          {ing?.name ?? "—"}
                        </td>
                        <td className="py-2 pr-4">
                          {entry.quantity} {ing?.unit ?? ""}
                        </td>
                        <td className="py-2 pr-4">
                          <Badge
                            variant="outline"
                            className={REASON_COLORS[entry.reason]}
                          >
                            {REASON_LABELS[entry.reason]}
                          </Badge>
                        </td>
                        <td className="py-2">{formatPrice(cost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
