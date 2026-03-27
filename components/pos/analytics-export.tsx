"use client";

import { useState } from "react";
import { FileText, Download, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAnalytics } from "@/hooks/use-analytics";
import { format, subDays } from "date-fns";

type VatPeriod = "today" | "week" | "month";
type Frequency = "daily" | "weekly" | "monthly";

function downloadCsv(data: string, filename: string) {
  const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getTodayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function getVatPeriodDates(period: VatPeriod): { from: string; to: string } {
  const today = getTodayStr();
  if (period === "today") return { from: today, to: today };
  if (period === "week")
    return { from: format(subDays(new Date(), 7), "yyyy-MM-dd"), to: today };
  return { from: format(subDays(new Date(), 30), "yyyy-MM-dd"), to: today };
}

export function AnalyticsExport() {
  const { getVatReport, generateCsvData } = useAnalytics();

  const [autoSendEnabled, setAutoSendEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [vatPeriod, setVatPeriod] = useState<VatPeriod>("month");

  const { from, to } = getVatPeriodDates(vatPeriod);
  const vatReport = getVatReport(from, to);

  const vatTotals = vatReport.reduce(
    (acc, row) => ({
      net: acc.net + row.net,
      vat: acc.vat + row.vat,
      gross: acc.gross + row.gross,
    }),
    { net: 0, vat: 0, gross: 0 },
  );

  const handlePdfExport = () => {
    alert("Δημιουργία PDF... (mock demo)");
  };

  const handleSalesCsvExport = () => {
    const data = generateCsvData("sales");
    downloadCsv(data, `πωλήσεις-${getTodayStr()}.csv`);
  };

  const handleInventoryCsvExport = () => {
    const data = generateCsvData("inventory");
    downloadCsv(data, `αποθήκη-${getTodayStr()}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Export Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Εξαγωγή Δεδομένων</CardTitle>
          <CardDescription>
            Κατεβάστε αναφορές σε διάφορες μορφές
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <div className="flex items-center gap-2 font-medium">
                <FileText className="size-5 text-muted-foreground" />
                PDF Σύνοψη
              </div>
              <p className="text-sm text-muted-foreground">
                Πλήρης αναφορά σε PDF
              </p>
              <Button
                onClick={handlePdfExport}
                variant="outline"
                className="mt-auto w-full"
              >
                <FileText className="mr-2 size-4" />
                Λήψη PDF
              </Button>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <div className="flex items-center gap-2 font-medium">
                <Download className="size-5 text-muted-foreground" />
                CSV Πωλήσεων
              </div>
              <p className="text-sm text-muted-foreground">
                30 ημέρες πωλήσεων
              </p>
              <Button
                onClick={handleSalesCsvExport}
                variant="outline"
                className="mt-auto w-full"
              >
                <Download className="mr-2 size-4" />
                Λήψη CSV
              </Button>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <div className="flex items-center gap-2 font-medium">
                <Package className="size-5 text-muted-foreground" />
                CSV Αποθήκης
              </div>
              <p className="text-sm text-muted-foreground">
                Τρέχον απόθεμα υλικών
              </p>
              <Button
                onClick={handleInventoryCsvExport}
                variant="outline"
                className="mt-auto w-full"
              >
                <Download className="mr-2 size-4" />
                Λήψη CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VAT Report */}
      <Card>
        <CardHeader>
          <CardTitle>Αναφορά ΦΠΑ</CardTitle>
          <CardDescription>
            Ανάλυση ΦΠΑ ανά συντελεστή για την επιλεγμένη περίοδο
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Period Selector */}
          <div className="flex gap-2">
            {(["today", "week", "month"] as VatPeriod[]).map((p) => {
              const label =
                p === "today" ? "Σήμερα" : p === "week" ? "Εβδομάδα" : "Μήνας";
              return (
                <Button
                  key={p}
                  variant={vatPeriod === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setVatPeriod(p)}
                >
                  {label}
                </Button>
              );
            })}
          </div>

          {vatReport.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ΦΠΑ %</TableHead>
                  <TableHead className="text-right">Καθαρή Αξία</TableHead>
                  <TableHead className="text-right">ΦΠΑ</TableHead>
                  <TableHead className="text-right">Σύνολο</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vatReport.map((row) => (
                  <TableRow key={row.vatRate}>
                    <TableCell className="font-medium">
                      {row.vatRate}%
                    </TableCell>
                    <TableCell className="text-right">
                      €{row.net.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      €{row.vat.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      €{row.gross.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 font-bold">
                  <TableCell>Σύνολο</TableCell>
                  <TableCell className="text-right">
                    €{vatTotals.net.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    €{vatTotals.vat.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    €{vatTotals.gross.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-24 items-center justify-center text-muted-foreground">
              Δεν υπάρχουν δεδομένα ΦΠΑ για την επιλεγμένη περίοδο
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-send Section */}
      <Card>
        <CardHeader>
          <CardTitle>Αυτόματη Αποστολή</CardTitle>
          <CardDescription>
            Ρύθμιση αυτόματης αποστολής αναφορών μέσω email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={autoSendEnabled}
              onCheckedChange={setAutoSendEnabled}
              id="auto-send-toggle"
            />
            <label
              htmlFor="auto-send-toggle"
              className="font-medium cursor-pointer"
            >
              Αυτόματη αποστολή email
            </label>
          </div>

          {autoSendEnabled && (
            <div className="space-y-3 pl-9">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="email-input">
                  Email αποστολής
                </label>
                <Input
                  id="email-input"
                  type="email"
                  placeholder="email@restaurant.gr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Συχνότητα</label>
                <Select
                  value={frequency}
                  onValueChange={(val) => setFrequency(val as Frequency)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Ημερήσια</SelectItem>
                    <SelectItem value="weekly">Εβδομαδιαία</SelectItem>
                    <SelectItem value="monthly">Μηνιαία</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Demo — δεν αποστέλλεται πραγματικά
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default AnalyticsExport;
