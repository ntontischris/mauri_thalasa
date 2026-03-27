"use client";

import {
  Star,
  Phone,
  Mail,
  Cake,
  StickyNote,
  Heart,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomers } from "@/hooks/use-customers";
import { useLoyalty } from "@/hooks/use-loyalty";
import { formatPrice, formatDateTime } from "@/lib/mock-data";
import type { Customer } from "@/lib/types";

interface CustomerDetailProps {
  customer: Customer;
}

export function CustomerDetail({ customer }: CustomerDetailProps) {
  const { getCustomerVisits, getFavoriteProducts } = useCustomers();
  const { loyaltySettings } = useLoyalty();

  const visits = getCustomerVisits(customer.id).slice(0, 20);
  const favorites = getFavoriteProducts(customer.id, 3);

  const stampDots = Array.from(
    { length: loyaltySettings.stampsForFreeItem },
    (_, i) => i < customer.stampCount,
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-border">
      {/* Personal Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Προσωπικά
            {customer.isVip && (
              <Star className="size-4 text-amber-500 fill-amber-500" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {customer.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="size-3.5" />
              <span>{customer.phone}</span>
            </div>
          )}
          {customer.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-3.5" />
              <span>{customer.email}</span>
            </div>
          )}
          {customer.birthday && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Cake className="size-3.5" />
              <span>
                {new Intl.DateTimeFormat("el-GR", {
                  day: "2-digit",
                  month: "long",
                }).format(new Date(customer.birthday))}
              </span>
            </div>
          )}
          {customer.notes && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <StickyNote className="size-3.5 mt-0.5" />
              <span>{customer.notes}</span>
            </div>
          )}

          {/* Tags */}
          {customer.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {customer.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allergies & Favorites */}
      <div className="space-y-4">
        {/* Allergies */}
        {customer.allergies.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Αλλεργίες</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {customer.allergies.map((allergy) => (
                  <Badge
                    key={allergy}
                    className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-200"
                  >
                    {allergy}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Favorite Products */}
        {favorites.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Heart className="size-3.5" />
                Αγαπημένα
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {favorites.map((fav) => (
                  <div
                    key={fav.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{fav.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {fav.count}x
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Loyalty Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Loyalty</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Πόντοι</span>
            <span className="font-bold text-primary">
              {customer.loyaltyPoints}
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Stamps</span>
              <span className="text-xs text-muted-foreground">
                {customer.stampCount}/{loyaltySettings.stampsForFreeItem}
              </span>
            </div>
            <div className="flex gap-1.5">
              {stampDots.map((filled, i) => (
                <div
                  key={i}
                  className={`size-3.5 rounded-full border-2 ${
                    filled
                      ? "bg-primary border-primary"
                      : "bg-background border-border"
                  }`}
                />
              ))}
            </div>
          </div>
          {customer.loyaltyPoints >= loyaltySettings.pointsForReward && (
            <p className="text-xs text-green-600 font-medium">
              Διαθέσιμο reward: {formatPrice(loyaltySettings.rewardValue)}{" "}
              έκπτωση!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Visit History */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="size-3.5" />
            Ιστορικό Επισκέψεων ({visits.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Δεν υπάρχουν επισκέψεις
            </p>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                      Ημ/νία
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                      Τραπέζι
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                      Σύνολο
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                      Πιάτα
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visits.map((visit) => (
                    <tr
                      key={visit.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-3 py-2">
                        {formatDateTime(visit.date)}
                      </td>
                      <td className="px-3 py-2">#{visit.tableNumber}</td>
                      <td className="px-3 py-2 font-medium">
                        {formatPrice(visit.total)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs max-w-[200px] truncate">
                        {visit.items.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
