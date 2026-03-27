"use client";

import { toast } from "sonner";
import { MessageSquare, Mail, Clock, Trophy, Stamp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLoyalty } from "@/hooks/use-loyalty";
import { useCustomers } from "@/hooks/use-customers";
import { formatPrice, formatDateTime } from "@/lib/mock-data";
import type { Customer } from "@/lib/types";

function daysSince(dateString: string): number {
  const diff = Date.now() - new Date(dateString).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getLastVisitDate(
  customer: Customer,
  getCustomerVisits: (id: string) => { date: string }[],
): string | null {
  const visits = getCustomerVisits(customer.id);
  return visits[0]?.date ?? null;
}

function sendDemo(type: "SMS" | "Email") {
  toast("Demo: Δεν στάλθηκε πραγματικά", {
    description: `${type} προσομοίωση — δεν έγινε πραγματική αποστολή.`,
  });
}

export function LoyaltyWinback() {
  const {
    getIdleCustomers,
    getNearReward,
    getNearStampReward,
    loyaltySettings,
  } = useLoyalty();
  const { getCustomerVisits, getTotalSpent } = useCustomers();

  const idleCustomers = getIdleCustomers(30);
  const nearRewardCustomers = getNearReward(20);
  const nearStampCustomers = getNearStampReward(2);

  return (
    <div className="space-y-6">
      {/* Near Reward Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="size-4 text-amber-500" />
            Κοντά σε Reward
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Near Points Reward */}
          {nearRewardCustomers.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Πόντοι — Κοντά στην έκπτωση
              </p>
              <div className="space-y-2">
                {nearRewardCustomers.map((c) => {
                  const remaining =
                    loyaltySettings.pointsForReward - c.loyaltyPoints;
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-amber-700 dark:text-amber-300">
                        {c.loyaltyPoints} πόντοι — {remaining} ακόμα
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Near Stamp Reward */}
          {nearStampCustomers.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Stamp className="size-3.5" />
                Stamps — Σχεδόν δωρεάν!
              </p>
              <div className="space-y-2">
                {nearStampCustomers.map((c) => {
                  const remaining =
                    loyaltySettings.stampsForFreeItem - c.stampCount;
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm dark:border-green-800 dark:bg-green-950"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-green-700 dark:text-green-300">
                        {c.stampCount}/{loyaltySettings.stampsForFreeItem}{" "}
                        stamps — {remaining} ακόμα
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {nearRewardCustomers.length === 0 &&
            nearStampCustomers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Κανένας πελάτης κοντά σε reward αυτή τη στιγμή
              </p>
            )}
        </CardContent>
      </Card>

      {/* Win-back Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="size-4 text-orange-500" />
            Αδρανείς Πελάτες
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template Preview */}
          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground italic">
            &ldquo;Αγαπητέ {"{name}"}, μας λείψατε! Ελάτε με 15% έκπτωση στην
            επόμενη επίσκεψή σας. — Μαύρη Θάλασσα&rdquo;
          </div>

          {idleCustomers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Δεν υπάρχουν αδρανείς πελάτες (30+ ημέρες)
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Όνομα
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Τελ. Επίσκεψη
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Ημέρες Απουσίας
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Σύνολο €
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Ενέργειες
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {idleCustomers.map((customer) => {
                    const lastDate = getLastVisitDate(
                      customer,
                      getCustomerVisits,
                    );
                    const days = lastDate ? daysSince(lastDate) : null;
                    const totalSpent = getTotalSpent(customer.id);

                    return (
                      <tr
                        key={customer.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium">
                          {customer.name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {lastDate ? formatDateTime(lastDate) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {days !== null ? (
                            <span className="font-semibold text-orange-600 dark:text-orange-400">
                              {days} ημέρες
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">{formatPrice(totalSpent)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendDemo("SMS")}
                            >
                              <MessageSquare className="size-3.5 mr-1" />
                              SMS
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendDemo("Email")}
                            >
                              <Mail className="size-3.5 mr-1" />
                              Email
                            </Button>
                          </div>
                        </td>
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
