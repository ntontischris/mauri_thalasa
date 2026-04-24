import { AlertTriangle, PackageX, ShoppingCart } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  getReplenishmentNeeded,
  type ReplenishmentRow,
} from "@/lib/queries/replenishment";
import { cn } from "@/lib/utils";

const URGENCY_ORDER = { critical: 0, high: 1, normal: 2 } as const;

const URGENCY_LABEL = {
  critical: "Εξαντλημένο",
  high: "Κρίσιμο",
  normal: "Χαμηλό",
} as const;

export async function ReplenishmentBanner() {
  const rows = await getReplenishmentNeeded();
  if (rows.length === 0) return null;

  const sorted = [...rows].sort(
    (a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency],
  );
  const critical = rows.filter((r) => r.urgency === "critical").length;
  const high = rows.filter((r) => r.urgency === "high").length;
  const top = sorted.slice(0, 5);
  const remaining = rows.length - top.length;
  const hasCriticalOrHigh = critical > 0 || high > 0;

  return (
    <Alert
      variant={hasCriticalOrHigh ? "destructive" : "default"}
      className={cn(!hasCriticalOrHigh && "border-amber-500/40 bg-amber-500/5")}
    >
      {hasCriticalOrHigh ? (
        <PackageX className="size-4" />
      ) : (
        <AlertTriangle className="size-4" />
      )}
      <AlertTitle className="flex flex-wrap items-center gap-2">
        <span>
          {rows.length} υλικ{rows.length === 1 ? "ό" : "ά"} χρειάζονται
          αναπλήρωση
        </span>
        {critical > 0 && (
          <Badge variant="destructive" className="gap-1">
            <PackageX className="size-3" />
            {critical} εξαντλημέν{critical === 1 ? "ο" : "α"}
          </Badge>
        )}
        {high > 0 && (
          <Badge
            variant="outline"
            className="border-destructive/50 text-destructive"
          >
            {high} κρίσιμ{high === 1 ? "ο" : "α"}
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className="mt-1 gap-2">
        <ul className="w-full space-y-1">
          {top.map((r) => (
            <ReplenishmentLine key={r.ingredient_id} row={r} />
          ))}
        </ul>
        {remaining > 0 && (
          <p className="text-xs">+ {remaining} ακόμη στη λίστα πιο κάτω.</p>
        )}
      </AlertDescription>
    </Alert>
  );
}

function ReplenishmentLine({ row }: { row: ReplenishmentRow }) {
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
      <span className="font-medium">{row.ingredient_name}</span>
      <span className="text-muted-foreground">
        · απόθεμα {fmt(row.current_stock)} {row.unit} / ελάχ.{" "}
        {fmt(row.min_stock)} {row.unit}
      </span>
      <span className="inline-flex items-center gap-1 text-xs font-medium">
        <ShoppingCart className="size-3" />
        πρόταση: {fmt(row.suggested_order_qty)} {row.unit}
        {row.supplier_name ? ` — ${row.supplier_name}` : ""}
      </span>
      <Badge
        variant={row.urgency === "critical" ? "destructive" : "outline"}
        className="ml-auto text-[10px]"
      >
        {URGENCY_LABEL[row.urgency]}
      </Badge>
    </li>
  );
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}
