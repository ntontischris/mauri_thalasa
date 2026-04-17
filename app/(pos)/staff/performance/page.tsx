import { getStaffPerformance } from "@/lib/queries/staff-performance";
import { StaffPerformance } from "@/components/pos/staff-performance";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StaffPerformancePage() {
  const rows = await getStaffPerformance();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/staff">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Απόδοση Προσωπικού</h1>
          <p className="text-muted-foreground">
            Κατάταξη, τζίρος, παραγγελίες ανά υπάλληλο
          </p>
        </div>
      </div>
      <StaffPerformance rows={rows} />
    </div>
  );
}
