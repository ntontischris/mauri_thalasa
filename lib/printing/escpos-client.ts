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

export interface PrinterConfig {
  ip: string;
  port: number;
}

export interface ReceiptPrintPayload {
  order: DbOrder;
  items: OrderItemWithModifiers[];
  productVatRates: Map<string, number>;
  paymentMethod: PaymentMethod | null;
  cashGiven?: number;
}

const RECEIPT_COLUMNS = 48;
const CONNECT_TIMEOUT_MS = 5000;

export function getPrinterConfig(): PrinterConfig | null {
  const ip = process.env.PRINTER_IP;
  if (!ip) return null;
  const portRaw = process.env.PRINTER_PORT;
  const port = portRaw ? Number.parseInt(portRaw, 10) : 9100;
  if (!Number.isFinite(port) || port <= 0) return null;
  return { ip, port };
}

// Greek -> Latin transliteration. Default codepages on most generic ESC/POS
// printers don't ship cp1253 reliably; transliteration guarantees a readable
// receipt across every model.
const GREEK_TRANSLIT_MAP: Record<string, string> = {
  Α: "A",
  Β: "V",
  Γ: "G",
  Δ: "D",
  Ε: "E",
  Ζ: "Z",
  Η: "I",
  Θ: "Th",
  Ι: "I",
  Κ: "K",
  Λ: "L",
  Μ: "M",
  Ν: "N",
  Ξ: "X",
  Ο: "O",
  Π: "P",
  Ρ: "R",
  Σ: "S",
  Τ: "T",
  Υ: "Y",
  Φ: "F",
  Χ: "Ch",
  Ψ: "Ps",
  Ω: "O",
  Ά: "A",
  Έ: "E",
  Ή: "I",
  Ί: "I",
  Ό: "O",
  Ύ: "Y",
  Ώ: "O",
  Ϊ: "I",
  Ϋ: "Y",
  α: "a",
  β: "v",
  γ: "g",
  δ: "d",
  ε: "e",
  ζ: "z",
  η: "i",
  θ: "th",
  ι: "i",
  κ: "k",
  λ: "l",
  μ: "m",
  ν: "n",
  ξ: "x",
  ο: "o",
  π: "p",
  ρ: "r",
  σ: "s",
  ς: "s",
  τ: "t",
  υ: "y",
  φ: "f",
  χ: "ch",
  ψ: "ps",
  ω: "o",
  ά: "a",
  έ: "e",
  ή: "i",
  ί: "i",
  ό: "o",
  ύ: "y",
  ώ: "o",
  ϊ: "i",
  ϋ: "y",
  ΐ: "i",
  ΰ: "y",
};

function transliterate(input: string): string {
  let out = "";
  for (const ch of input) {
    out += GREEK_TRANSLIT_MAP[ch] ?? ch;
  }
  return out;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max);
}

function padLine(left: string, right: string, width: number): string {
  const gap = Math.max(1, width - left.length - right.length);
  return `${left}${" ".repeat(gap)}${right}`;
}

function formatEuro(n: number): string {
  return `${n.toFixed(2)} EUR`;
}

function paymentLabel(method: PaymentMethod | null): string {
  if (method === "cash") return "Metrita";
  if (method === "card") return "Karta";
  return "-";
}

export async function buildReceiptBuffer(
  payload: ReceiptPrintPayload,
): Promise<Buffer> {
  // Dynamic import keeps escpos-buffer out of any client bundle.
  const { Printer, Model, InMemory, Style, Align } =
    await import("escpos-buffer");

  const connection = new InMemory();
  const model = new Model("POS-80");
  const printer = await Printer.CONNECT(model, connection);
  await printer.setColumns(RECEIPT_COLUMNS);

  const now = new Date();
  const receiptNumber = transliterate(
    generateReceiptNumber(now, payload.order.id),
  );

  // --- Header ---
  await printer.writeln(
    "MAYRI THALASSA",
    Style.Bold | Style.DoubleHeight | Style.DoubleWidth,
    Align.Center,
  );
  await printer.writeln("Nikis 3, Kalamaria 55132", 0, Align.Center);
  await printer.writeln("AFM: 800474837", 0, Align.Center);
  await printer.writeln("-".repeat(RECEIPT_COLUMNS));

  // --- Receipt metadata ---
  const dateStr = now.toLocaleDateString("el-GR");
  const timeStr = now.toLocaleTimeString("el-GR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  await printer.writeln(receiptNumber, Style.Bold);
  await printer.writeln(padLine(`${dateStr} ${timeStr}`, "", RECEIPT_COLUMNS));
  await printer.writeln(
    padLine(
      `Trapezi: ${payload.order.table_number}`,
      `#${payload.order.id.slice(-6)}`,
      RECEIPT_COLUMNS,
    ),
  );
  await printer.writeln("-".repeat(RECEIPT_COLUMNS));

  // --- Items ---
  const nameWidth = RECEIPT_COLUMNS - 16; // leave room for qty prefix + price
  for (const item of payload.items) {
    const modTotal = item.order_item_modifiers.reduce((s, m) => s + m.price, 0);
    const lineTotal = (item.price + modTotal) * item.quantity;
    const qtyPrefix = `${item.quantity}x `;
    const name = truncate(
      transliterate(item.product_name),
      nameWidth - qtyPrefix.length,
    );
    const priceStr = formatEuro(lineTotal);
    await printer.writeln(
      padLine(`${qtyPrefix}${name}`, priceStr, RECEIPT_COLUMNS),
    );
    if (item.order_item_modifiers.length > 0) {
      const mods = item.order_item_modifiers
        .map((m) => transliterate(m.name))
        .join(", ");
      await printer.writeln(`   + ${truncate(mods, RECEIPT_COLUMNS - 5)}`);
    }
  }

  await printer.writeln("-".repeat(RECEIPT_COLUMNS));

  // --- Totals ---
  const vatableItems = payload.items.map((item) => ({
    price: item.price,
    quantity: item.quantity,
    modifiers: item.order_item_modifiers.map((m) => ({ price: m.price })),
    vatRate: payload.productVatRates.get(item.product_id) ?? 24,
  }));
  const subtotal = calculateOrderSubtotal(vatableItems);
  const vatBreakdown = calculateVatBreakdown(vatableItems);

  for (const row of vatBreakdown) {
    await printer.writeln(
      padLine(
        `Kathari axia ${row.rate}%`,
        formatEuro(row.net),
        RECEIPT_COLUMNS,
      ),
    );
    await printer.writeln(
      padLine(`FPA ${row.rate}%`, formatEuro(row.vat), RECEIPT_COLUMNS),
    );
  }

  await printer.writeln("-".repeat(RECEIPT_COLUMNS));
  await printer.writeln(
    padLine("SYNOLO", formatEuro(subtotal), RECEIPT_COLUMNS),
    Style.Bold | Style.DoubleHeight,
  );

  // --- Payment ---
  if (payload.paymentMethod) {
    await printer.writeln(
      padLine("Pliromi:", paymentLabel(payload.paymentMethod), RECEIPT_COLUMNS),
    );
    if (payload.paymentMethod === "cash" && payload.cashGiven != null) {
      await printer.writeln(
        padLine("Dothikan:", formatEuro(payload.cashGiven), RECEIPT_COLUMNS),
      );
      await printer.writeln(
        padLine(
          "Resta:",
          formatEuro(payload.cashGiven - subtotal),
          RECEIPT_COLUMNS,
        ),
      );
    }
  }

  // --- Footer ---
  await printer.feed(1);
  await printer.writeln("Efcharistoume!", Style.Bold, Align.Center);
  await printer.feed(3);
  await printer.cutter();

  return connection.buffer();
}

export async function printReceipt(
  payload: ReceiptPrintPayload,
): Promise<boolean> {
  const config = getPrinterConfig();
  if (!config) return false;

  let buffer: Buffer;
  try {
    buffer = await buildReceiptBuffer(payload);
  } catch (error) {
    console.error("[escpos] failed to build receipt buffer", error);
    return false;
  }

  try {
    const net = await import("node:net");
    return await sendBufferToPrinter(net.createConnection, config, buffer);
  } catch (error) {
    console.error("[escpos] failed to send buffer to printer", error);
    return false;
  }
}

type CreateConnection = typeof import("node:net").createConnection;

function sendBufferToPrinter(
  createConnection: CreateConnection,
  config: PrinterConfig,
  buffer: Buffer,
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: boolean, reason?: unknown) => {
      if (settled) return;
      settled = true;
      if (!result && reason) {
        console.error("[escpos] printer error", reason);
      }
      try {
        socket.destroy();
      } catch {
        // ignore
      }
      resolve(result);
    };

    const socket = createConnection(
      { host: config.ip, port: config.port },
      () => {
        socket.write(buffer, (err) => {
          if (err) {
            finish(false, err);
            return;
          }
          socket.end();
        });
      },
    );

    const timer = setTimeout(() => {
      finish(false, new Error("printer connect timeout"));
    }, CONNECT_TIMEOUT_MS);

    socket.on("close", () => {
      clearTimeout(timer);
      finish(true);
    });
    socket.on("error", (err) => {
      clearTimeout(timer);
      finish(false, err);
    });
  });
}
