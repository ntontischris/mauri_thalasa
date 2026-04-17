import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStaffMembers } from "@/lib/queries/staff";
import { StaffPanel } from "@/components/pos/staff-panel";

export default async function StaffPage() {
  const staff = await getStaffMembers();
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
      <StaffPanel initialStaff={staff} />
    </div>
  );
}
