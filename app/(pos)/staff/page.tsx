import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStaffMembers } from "@/lib/queries/staff";
import { getTodayShifts } from "@/lib/queries/shifts";
import { StaffPanel } from "@/components/pos/staff-panel";
import { ClockPanel } from "@/components/pos/clock-panel";

export default async function StaffPage() {
  const [staff, shifts] = await Promise.all([
    getStaffMembers(),
    getTodayShifts(),
  ]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Προσωπικό</h1>
          <p className="text-muted-foreground">{staff.length} μέλη</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/staff/performance">
            <BarChart3 className="mr-2 size-4" />
            Απόδοση
          </Link>
        </Button>
      </div>

      <ClockPanel staff={staff} initialShifts={shifts} />

      <StaffPanel initialStaff={staff} />
    </div>
  );
}
