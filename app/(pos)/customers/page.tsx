"use client";

import { useState } from "react";
import { Users, Plus, Star, Cake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCustomers } from "@/hooks/use-customers";
import { CustomerList } from "@/components/pos/customer-list";
import { CustomerForm } from "@/components/pos/customer-form";
import type { Customer } from "@/lib/types";

export default function CustomersPage() {
  const { addCustomer, getVipCustomers, getUpcomingBirthdays } = useCustomers();
  const [formOpen, setFormOpen] = useState(false);

  const vipCustomers = getVipCustomers();
  const upcomingBirthdays = getUpcomingBirthdays(7);

  const handleSave = (data: Omit<Customer, "id" | "createdAt">) => {
    addCustomer(data);
    setFormOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Users className="size-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Πελατολόγιο</h1>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4 mr-2" />
          Νέος Πελάτης
        </Button>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* VIP Count */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Star className="size-5 text-amber-500 fill-amber-500" />
            <div>
              <p className="text-2xl font-bold">{vipCustomers.length}</p>
              <p className="text-xs text-muted-foreground">VIP Πελάτες</p>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Birthdays */}
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <Cake className="size-5 text-pink-500 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-medium">
                Γενέθλια τις επόμενες 7 ημέρες
              </p>
              {upcomingBirthdays.length === 0 ? (
                <p className="text-xs text-muted-foreground">Κανένα</p>
              ) : (
                <div className="flex flex-wrap gap-1 mt-1">
                  {upcomingBirthdays.map((c) => (
                    <span
                      key={c.id}
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <CustomerList />

      {/* Customer Form Dialog */}
      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={handleSave}
      />
    </div>
  );
}
