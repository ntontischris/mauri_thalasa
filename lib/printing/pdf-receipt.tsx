import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import {
  calculateOrderSubtotal,
  calculateVatBreakdown,
} from "@/lib/pricing/order-totals";
import { generateReceiptNumber } from "@/lib/pricing/receipt-number";
import type {
  DbOrder,
  OrderItemWithModifiers,
  PaymentMethod,
} from "@/lib/types/database";

export interface PdfReceiptProps {
  order: DbOrder;
  items: OrderItemWithModifiers[];
  productVatRates: Map<string, number>;
  paymentMethod: PaymentMethod | null;
  cashGiven?: number;
  issuedAt?: Date;
}

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 14, fontWeight: "bold", textAlign: "center" },
  subtitle: { textAlign: "center", fontSize: 9, marginBottom: 2 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  separator: { borderBottom: "1pt dashed #666", marginVertical: 6 },
  total: { fontSize: 12, fontWeight: "bold", marginTop: 4 },
  small: { fontSize: 9, color: "#555" },
});

function formatPrice(n: number): string {
  return `${n.toFixed(2)} €`;
}

export function PdfReceipt({
  order,
  items,
  productVatRates,
  paymentMethod,
  cashGiven,
  issuedAt,
}: PdfReceiptProps) {
  const now = issuedAt ?? new Date();
  const receiptNumber = generateReceiptNumber(now, order.id);

  const vatableItems = items.map((item) => ({
    price: item.price,
    quantity: item.quantity,
    modifiers: item.order_item_modifiers.map((m) => ({ price: m.price })),
    vatRate: productVatRates.get(item.product_id) ?? 24,
  }));
  const subtotal = calculateOrderSubtotal(vatableItems);
  const vatBreakdown = calculateVatBreakdown(vatableItems);

  return (
    <Document>
      <Page size={[226, 842]} style={styles.page}>
        <Text style={styles.title}>ΜΑΥΡΗ ΘΑΛΑΣΣΑ</Text>
        <Text style={styles.subtitle}>Νίκης 3, Καλαμαριά 55132</Text>
        <Text style={styles.subtitle}>ΑΦΜ: 800474837</Text>

        <View style={styles.separator} />

        <View style={styles.row}>
          <Text>{receiptNumber}</Text>
          <Text>
            {now.toLocaleDateString("el-GR")}{" "}
            {now.toLocaleTimeString("el-GR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <View style={styles.row}>
          <Text>Τραπέζι: {order.table_number}</Text>
          <Text>#{order.id.slice(-6)}</Text>
        </View>

        <View style={styles.separator} />

        {items.map((item) => {
          const modTotal = item.order_item_modifiers.reduce(
            (s, m) => s + m.price,
            0,
          );
          const lineTotal = (item.price + modTotal) * item.quantity;
          return (
            <View key={item.id}>
              <View style={styles.row}>
                <Text>
                  {item.quantity}× {item.product_name}
                </Text>
                <Text>{formatPrice(lineTotal)}</Text>
              </View>
              {item.order_item_modifiers.length > 0 && (
                <Text style={styles.small}>
                  + {item.order_item_modifiers.map((m) => m.name).join(", ")}
                </Text>
              )}
            </View>
          );
        })}

        <View style={styles.separator} />

        {vatBreakdown.map((row) => (
          <View key={row.rate} style={styles.row}>
            <Text>Καθαρή αξία {row.rate}%:</Text>
            <Text>{formatPrice(row.net)}</Text>
          </View>
        ))}
        {vatBreakdown.map((row) => (
          <View key={`vat-${row.rate}`} style={styles.row}>
            <Text>ΦΠΑ {row.rate}%:</Text>
            <Text>{formatPrice(row.vat)}</Text>
          </View>
        ))}

        <View style={styles.separator} />

        <View style={styles.row}>
          <Text style={styles.total}>ΣΥΝΟΛΟ</Text>
          <Text style={styles.total}>{formatPrice(subtotal)}</Text>
        </View>

        {paymentMethod && (
          <>
            <View style={styles.row}>
              <Text>Πληρωμή:</Text>
              <Text>{paymentMethod === "cash" ? "Μετρητά" : "Κάρτα"}</Text>
            </View>
            {paymentMethod === "cash" && cashGiven != null && (
              <>
                <View style={styles.row}>
                  <Text>Δόθηκαν:</Text>
                  <Text>{formatPrice(cashGiven)}</Text>
                </View>
                <View style={styles.row}>
                  <Text>Ρέστα:</Text>
                  <Text>{formatPrice(cashGiven - subtotal)}</Text>
                </View>
              </>
            )}
          </>
        )}

        <Text style={[styles.subtitle, { marginTop: 10 }]}>
          Ευχαριστούμε για την προτίμησή σας
        </Text>
      </Page>
    </Document>
  );
}
