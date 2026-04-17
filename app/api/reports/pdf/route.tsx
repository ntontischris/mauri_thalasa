import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import {
  getAnalyticsSummary,
  getTopProducts,
  getVatBreakdown,
} from "@/lib/queries/analytics";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 11, fontFamily: "Helvetica" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#666", marginBottom: 14 },
  section: { marginBottom: 16 },
  heading: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 6,
    borderBottom: "1pt solid #999",
    paddingBottom: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  label: { color: "#444" },
  value: { fontWeight: "bold" },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #ddd",
    paddingVertical: 3,
  },
  td: { flex: 1 },
  tdRight: { flex: 1, textAlign: "right" },
});

function formatPrice(n: number): string {
  return `${n.toFixed(2)} €`;
}

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: start.toISOString(), to: now.toISOString() };
}

export async function GET() {
  const [summary, topProducts, vatRows] = await Promise.all([
    getAnalyticsSummary(),
    getTopProducts(10),
    (async () => {
      const r = monthRange();
      return getVatBreakdown(r.from, r.to);
    })(),
  ]);

  const vatTotals = vatRows.reduce(
    (acc, r) => {
      acc.net += r.net;
      acc.vat += r.vat;
      acc.gross += r.gross;
      return acc;
    },
    { net: 0, vat: 0, gross: 0 },
  );

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Αναφορά Εστιατορίου</Text>
        <Text style={styles.subtitle}>
          Εκδόθηκε: {new Date().toLocaleString("el-GR")}
        </Text>

        <View style={styles.section}>
          <Text style={styles.heading}>Σύνοψη</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Τζίρος σήμερα</Text>
            <Text style={styles.value}>
              {formatPrice(summary.revenue_today)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Παραγγελίες σήμερα</Text>
            <Text style={styles.value}>{summary.orders_today}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Τζίρος εβδομάδας</Text>
            <Text style={styles.value}>
              {formatPrice(summary.revenue_week)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Τζίρος μήνα</Text>
            <Text style={styles.value}>
              {formatPrice(summary.revenue_month)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Παραγγελίες μήνα</Text>
            <Text style={styles.value}>{summary.orders_month}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Μέσος λογαριασμός</Text>
            <Text style={styles.value}>
              {formatPrice(summary.avg_ticket_month)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Φιλοδωρήματα μήνα</Text>
            <Text style={styles.value}>{formatPrice(summary.tips_month)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Top προϊόντα (μήνας)</Text>
          {topProducts.map((p) => (
            <View key={p.name} style={styles.tableRow}>
              <Text style={styles.td}>{p.name}</Text>
              <Text style={styles.tdRight}>{p.quantity}×</Text>
              <Text style={styles.tdRight}>{formatPrice(p.revenue)}</Text>
            </View>
          ))}
          {topProducts.length === 0 && (
            <Text style={styles.label}>Δεν υπάρχουν δεδομένα.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Αναφορά ΦΠΑ (μήνας)</Text>
          <View style={styles.tableRow}>
            <Text style={styles.td}>ΦΠΑ %</Text>
            <Text style={styles.tdRight}>Καθαρή</Text>
            <Text style={styles.tdRight}>ΦΠΑ</Text>
            <Text style={styles.tdRight}>Σύνολο</Text>
          </View>
          {vatRows.map((r) => (
            <View key={r.rate} style={styles.tableRow}>
              <Text style={styles.td}>{r.rate}%</Text>
              <Text style={styles.tdRight}>{formatPrice(r.net)}</Text>
              <Text style={styles.tdRight}>{formatPrice(r.vat)}</Text>
              <Text style={styles.tdRight}>{formatPrice(r.gross)}</Text>
            </View>
          ))}
          <View style={[styles.tableRow, { borderTop: "1pt solid #333" }]}>
            <Text style={styles.td}>Σύνολο</Text>
            <Text style={styles.tdRight}>{formatPrice(vatTotals.net)}</Text>
            <Text style={styles.tdRight}>{formatPrice(vatTotals.vat)}</Text>
            <Text style={styles.tdRight}>{formatPrice(vatTotals.gross)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="report-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
