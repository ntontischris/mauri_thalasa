"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoyalty } from "@/hooks/use-loyalty";
import { useCustomers } from "@/hooks/use-customers";
import { formatPrice, formatDateTime } from "@/lib/mock-data";

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

function StampBar({ filled, total }: { filled: number; total: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`size-2.5 rounded-full border ${
            i < filled
              ? "bg-primary border-primary"
              : "bg-background border-border"
          }`}
        />
      ))}
    </div>
  );
}

export function LoyaltyRankings() {
  const { getRankings, loyaltySettings } = useLoyalty();
  const { getCustomerVisits, getTotalSpent } = useCustomers();

  const rankings = getRankings();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Κατάταξη Πελατών</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  #
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Όνομα
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Πόντοι
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Stamps
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Σύνολο €
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Τελευταία Επίσκεψη
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rankings.map((customer, index) => {
                const visits = getCustomerVisits(customer.id);
                const lastVisit = visits[0];
                const totalSpent = getTotalSpent(customer.id);
                const medal = RANK_MEDALS[index];
                const rank = medal ?? `${index + 1}`;

                return (
                  <tr
                    key={customer.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{rank}</td>
                    <td className="px-4 py-3 font-medium">{customer.name}</td>
                    <td className="px-4 py-3 text-primary font-semibold">
                      {customer.loyaltyPoints}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StampBar
                          filled={customer.stampCount}
                          total={loyaltySettings.stampsForFreeItem}
                        />
                        <span className="text-xs text-muted-foreground">
                          {customer.stampCount}/
                          {loyaltySettings.stampsForFreeItem}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatPrice(totalSpent)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lastVisit ? formatDateTime(lastVisit.date) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {rankings.length === 0 && (
            <div className="py-10 text-center text-muted-foreground text-sm">
              Δεν υπάρχουν πελάτες
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
