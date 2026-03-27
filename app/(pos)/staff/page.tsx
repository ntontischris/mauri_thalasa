"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { StaffList } from "@/components/pos/staff-list";
import { ShiftScheduler } from "@/components/pos/shift-scheduler";
import { StaffPerformance } from "@/components/pos/staff-performance";
import { StaffChecklist } from "@/components/pos/staff-checklist";

type Tab = "staff" | "shifts" | "performance" | "checklist";

const TAB_LABELS: Record<Tab, string> = {
  staff: "Προσωπικό",
  shifts: "Βάρδιες",
  performance: "Performance",
  checklist: "Checklist",
};

export default function StaffPage() {
  const [selectedTab, setSelectedTab] = useState<Tab>("staff");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="size-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Προσωπικό</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border">
        {(["staff", "shifts", "performance", "checklist"] as Tab[]).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                selectedTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          ),
        )}
      </div>

      {/* Tab Content */}
      {selectedTab === "staff" && <StaffList />}
      {selectedTab === "shifts" && <ShiftScheduler />}
      {selectedTab === "performance" && <StaffPerformance />}
      {selectedTab === "checklist" && <StaffChecklist />}
    </div>
  );
}
