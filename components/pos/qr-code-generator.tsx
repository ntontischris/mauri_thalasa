"use client";

import { usePOS } from "@/lib/pos-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrCode, ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";

export function QrCodeGenerator() {
  const { state } = usePOS();
  const [copied, setCopied] = useState<string | null>(null);

  // In production, this would be the actual domain
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const getMenuUrl = (tableId: string, tableNumber: number) =>
    `${baseUrl}/menu?table=${tableId}&num=${tableNumber}`;

  const copyUrl = (tableId: string, tableNumber: number) => {
    const url = getMenuUrl(tableId, tableNumber);
    navigator.clipboard.writeText(url);
    setCopied(tableId);
    setTimeout(() => setCopied(null), 2000);
  };

  // Generate a simple SVG QR-like pattern (placeholder - in production use a QR library)
  const renderQrPlaceholder = (tableNumber: number) => (
    <div className="flex size-24 flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
      <QrCode className="size-8 text-primary" />
      <span className="mt-1 text-xs font-bold text-primary">T{tableNumber}</span>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="size-5" />
          QR Code Μενού ανά Τραπέζι
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Κάθε τραπέζι έχει μοναδικό QR code. Ο πελάτης σκανάρει, βλέπει το μενού και παραγγέλνει.
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {state.tables
            .sort((a, b) => a.number - b.number)
            .map((table) => (
              <div
                key={table.id}
                className="flex flex-col items-center gap-2 rounded-lg border p-3"
              >
                {renderQrPlaceholder(table.number)}
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => copyUrl(table.id, table.number)}
                    title="Αντιγραφή URL"
                  >
                    {copied === table.id ? (
                      <Check className="size-3.5 text-green-600" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => window.open(getMenuUrl(table.id, table.number), "_blank")}
                    title="Άνοιγμα"
                  >
                    <ExternalLink className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Tip: Εκτυπώστε τα QR codes σε αυτοκόλλητα και τοποθετήστε τα στα τραπέζια.
          Σε production, χρησιμοποιήστε ένα QR library (π.χ. qrcode.react) για πραγματικά QR codes.
        </p>
      </CardContent>
    </Card>
  );
}
