import { getReservations, getWaitlist } from "@/lib/queries/reservations";
import { ReservationsPanel } from "@/components/pos/reservations-panel";

export default async function ReservationsPage() {
  const today = new Date().toISOString().split("T")[0];
  const [reservations, waitlist] = await Promise.all([
    getReservations(today),
    getWaitlist(),
  ]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Κρατήσεις</h1>
        <p className="text-muted-foreground">
          {reservations.length} σήμερα • {waitlist.length} σε αναμονή
        </p>
      </div>
      <ReservationsPanel
        initialReservations={reservations}
        initialWaitlist={waitlist}
      />
    </div>
  );
}
