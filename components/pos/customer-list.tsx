"use client";

import { useState, useMemo } from "react";
import { Search, Star, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCustomers } from "@/hooks/use-customers";
import { formatPrice } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { CustomerDetail } from "@/components/pos/customer-detail";

type Filter = "all" | "vip" | "allergies";
type SortField = "name" | "visits" | "total";
type SortDir = "asc" | "desc";

export function CustomerList() {
  const { customers, searchCustomers, getVisitCount, getTotalSpent } =
    useCustomers();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
  };

  const filtered = useMemo(() => {
    let result = query ? searchCustomers(query) : customers;

    if (filter === "vip") {
      result = result.filter((c) => c.isVip);
    } else if (filter === "allergies") {
      result = result.filter((c) => c.allergies.length > 0);
    }

    return [...result].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "name") {
        return a.name.localeCompare(b.name, "el") * dir;
      }
      if (sortField === "visits") {
        return (getVisitCount(a.id) - getVisitCount(b.id)) * dir;
      }
      return (getTotalSpent(a.id) - getTotalSpent(b.id)) * dir;
    });
  }, [
    customers,
    query,
    filter,
    sortField,
    sortDir,
    searchCustomers,
    getVisitCount,
    getTotalSpent,
  ]);

  const selectedCustomer = selectedCustomerId
    ? customers.find((c) => c.id === selectedCustomerId)
    : undefined;

  const FILTERS: { value: Filter; label: string }[] = [
    { value: "all", label: "Όλοι" },
    { value: "vip", label: "VIP" },
    { value: "allergies", label: "Με Αλλεργίες" },
  ];

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Αναζήτηση με όνομα ή τηλέφωνο..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
                filter === value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th
                className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                onClick={() => handleSort("name")}
              >
                Όνομα{sortIndicator("name")}
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Τηλέφωνο
              </th>
              <th
                className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                onClick={() => handleSort("visits")}
              >
                Επισκέψεις{sortIndicator("visits")}
              </th>
              <th
                className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                onClick={() => handleSort("total")}
              >
                Σύνολο{sortIndicator("total")}
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Badges
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((customer) => {
              const isSelected = selectedCustomerId === customer.id;
              const visitCount = getVisitCount(customer.id);
              const totalSpent = getTotalSpent(customer.id);

              return (
                <tr
                  key={customer.id}
                  onClick={() =>
                    setSelectedCustomerId(isSelected ? null : customer.id)
                  }
                  className={cn(
                    "cursor-pointer transition-colors",
                    isSelected ? "bg-primary/5" : "hover:bg-muted/30",
                  )}
                >
                  <td className="px-4 py-3 font-medium">{customer.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {customer.phone ?? "-"}
                  </td>
                  <td className="px-4 py-3">{visitCount}</td>
                  <td className="px-4 py-3">{formatPrice(totalSpent)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {customer.isVip && (
                        <Star className="size-4 text-amber-500 fill-amber-500" />
                      )}
                      {customer.allergies.length > 0 && (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-200 text-xs">
                          <AlertTriangle className="size-3 mr-1" />
                          {customer.allergies.length}
                        </Badge>
                      )}
                      {customer.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            Δεν βρέθηκαν πελάτες
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedCustomer && <CustomerDetail customer={selectedCustomer} />}
    </div>
  );
}
