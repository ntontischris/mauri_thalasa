import { getStaffMembers } from "@/lib/queries/staff";
import { StaffPanel } from "@/components/pos/staff-panel";

export default async function StaffPage() {
  const staff = await getStaffMembers();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Προσωπικό</h1>
        <p className="text-muted-foreground">{staff.length} μέλη</p>
      </div>
      <StaffPanel initialStaff={staff} />
    </div>
  );
}
