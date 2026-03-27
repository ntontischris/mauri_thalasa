// EatFlow POS - Mock History Data (30 days of analytics)
// Deterministic generation using date-based patterns (no Math.random)

import { subDays, format, getDay } from "date-fns";
import type { Station } from "./types";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface HourlyRevenue {
  hour: number;
  revenue: number;
}

export interface ProductSale {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
  station: Station;
}

export interface DailyStats {
  date: string; // ISO date "YYYY-MM-DD"
  revenue: number;
  orderCount: number;
  avgCheck: number;
  cashPayments: number;
  cardPayments: number;
  hourlyRevenue: HourlyRevenue[];
  productSales: ProductSale[];
}

export interface MockPrepTime {
  productId: string;
  productName: string;
  avgMinutes: number;
  station: Station;
}

export interface MockCancellation {
  date: string;
  productId: string;
  productName: string;
  reason: string;
}

// ─── Product Reference ─────────────────────────────────────────────────────
// Mirrors initialProducts from mock-data.ts

interface ProductRef {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  station: Station;
  vatRate: 13 | 24;
  popularity: number; // weight for selection (higher = more likely to appear)
  minQty: number;
  maxQty: number;
}

const PRODUCT_REFS: ProductRef[] = [
  // Ωμά (cat1, cold) — raw appetizers
  {
    id: "p1",
    name: "Καρπάτσιο Λαβρακιού",
    price: 16,
    categoryId: "cat1",
    station: "cold",
    vatRate: 13,
    popularity: 6,
    minQty: 3,
    maxQty: 8,
  },
  {
    id: "p2",
    name: "Καρπάτσιο Μπαρμπουνιού",
    price: 18,
    categoryId: "cat1",
    station: "cold",
    vatRate: 13,
    popularity: 4,
    minQty: 2,
    maxQty: 6,
  },
  {
    id: "p3",
    name: "Ταρτάρ Γαρίδας",
    price: 18,
    categoryId: "cat1",
    station: "cold",
    vatRate: 13,
    popularity: 5,
    minQty: 2,
    maxQty: 7,
  },
  // Κρύα Ορεκτικά (cat2, cold)
  {
    id: "p4",
    name: "Ταραμοσαλάτα Λευκή",
    price: 12,
    categoryId: "cat2",
    station: "cold",
    vatRate: 13,
    popularity: 8,
    minQty: 5,
    maxQty: 15,
  },
  {
    id: "p5",
    name: "Μελιτζανοσαλάτα",
    price: 8,
    categoryId: "cat2",
    station: "cold",
    vatRate: 13,
    popularity: 9,
    minQty: 6,
    maxQty: 18,
  },
  {
    id: "p6",
    name: "Καβουροσαλάτα",
    price: 16,
    categoryId: "cat2",
    station: "cold",
    vatRate: 13,
    popularity: 5,
    minQty: 2,
    maxQty: 8,
  },
  {
    id: "p7",
    name: "Χτένια Ωμά",
    price: 22,
    categoryId: "cat2",
    station: "cold",
    vatRate: 13,
    popularity: 4,
    minQty: 2,
    maxQty: 6,
  },
  // Ζεστά Ορεκτικά (cat3, hot)
  {
    id: "p8",
    name: "Σαγανάκι Γαρίδες",
    price: 18,
    categoryId: "cat3",
    station: "hot",
    vatRate: 13,
    popularity: 8,
    minQty: 4,
    maxQty: 12,
  },
  {
    id: "p9",
    name: "Αχνιστά Όστρακα",
    price: 16,
    categoryId: "cat3",
    station: "hot",
    vatRate: 13,
    popularity: 5,
    minQty: 3,
    maxQty: 8,
  },
  {
    id: "p10",
    name: "Καλαμαράκια Τηγανητά",
    price: 14,
    categoryId: "cat3",
    station: "hot",
    vatRate: 13,
    popularity: 10,
    minQty: 6,
    maxQty: 20,
  },
  {
    id: "p11",
    name: "Γαρίδες Τηγανητές",
    price: 18,
    categoryId: "cat3",
    station: "hot",
    vatRate: 13,
    popularity: 7,
    minQty: 4,
    maxQty: 12,
  },
  // Ψητά Θαλασσινά (cat4, hot) — priced per kg, portions ~0.3-0.5kg
  {
    id: "p12",
    name: "Τσιπούρα",
    price: 75,
    categoryId: "cat4",
    station: "hot",
    vatRate: 13,
    popularity: 7,
    minQty: 2,
    maxQty: 6,
  },
  {
    id: "p13",
    name: "Μπαρμπούνι",
    price: 85,
    categoryId: "cat4",
    station: "hot",
    vatRate: 13,
    popularity: 5,
    minQty: 1,
    maxQty: 4,
  },
  {
    id: "p14",
    name: "Φαγκρί",
    price: 95,
    categoryId: "cat4",
    station: "hot",
    vatRate: 13,
    popularity: 4,
    minQty: 1,
    maxQty: 3,
  },
  {
    id: "p15",
    name: "Συναγρίδα",
    price: 95,
    categoryId: "cat4",
    station: "hot",
    vatRate: 13,
    popularity: 3,
    minQty: 1,
    maxQty: 3,
  },
  {
    id: "p16",
    name: "Γαρίδες Θερμαϊκού",
    price: 95,
    categoryId: "cat4",
    station: "hot",
    vatRate: 13,
    popularity: 4,
    minQty: 1,
    maxQty: 3,
  },
  {
    id: "p17",
    name: "Καλαμάρι",
    price: 55,
    categoryId: "cat4",
    station: "hot",
    vatRate: 13,
    popularity: 6,
    minQty: 2,
    maxQty: 5,
  },
  {
    id: "p18",
    name: "Χταπόδι",
    price: 48,
    categoryId: "cat4",
    station: "hot",
    vatRate: 13,
    popularity: 7,
    minQty: 2,
    maxQty: 6,
  },
  // Μαγειρευτά (cat5, hot)
  {
    id: "p19",
    name: "Ψαρόσουπα",
    price: 90,
    categoryId: "cat5",
    station: "hot",
    vatRate: 13,
    popularity: 3,
    minQty: 1,
    maxQty: 3,
  },
  {
    id: "p20",
    name: "Φρικασέ",
    price: 120,
    categoryId: "cat5",
    station: "hot",
    vatRate: 13,
    popularity: 2,
    minQty: 1,
    maxQty: 2,
  },
  {
    id: "p21",
    name: "Κοκκινιστό",
    price: 120,
    categoryId: "cat5",
    station: "hot",
    vatRate: 13,
    popularity: 2,
    minQty: 1,
    maxQty: 2,
  },
  {
    id: "p22",
    name: "Πλακί",
    price: 140,
    categoryId: "cat5",
    station: "hot",
    vatRate: 13,
    popularity: 2,
    minQty: 1,
    maxQty: 2,
  },
  // Ζυμαρικά (cat6, hot)
  {
    id: "p23",
    name: "Γαριδομακαρονάδα",
    price: 28,
    categoryId: "cat6",
    station: "hot",
    vatRate: 13,
    popularity: 8,
    minQty: 4,
    maxQty: 12,
  },
  {
    id: "p24",
    name: "Αστακομακαρονάδα",
    price: 45,
    categoryId: "cat6",
    station: "hot",
    vatRate: 13,
    popularity: 5,
    minQty: 2,
    maxQty: 6,
  },
  // Γλυκά (cat7, dessert)
  {
    id: "p25",
    name: "Μπακλαβάς",
    price: 20,
    categoryId: "cat7",
    station: "dessert",
    vatRate: 13,
    popularity: 6,
    minQty: 3,
    maxQty: 10,
  },
  {
    id: "p26",
    name: "Τιραμισού",
    price: 14,
    categoryId: "cat7",
    station: "dessert",
    vatRate: 13,
    popularity: 7,
    minQty: 4,
    maxQty: 12,
  },
  {
    id: "p27",
    name: "Lemon Bar",
    price: 12,
    categoryId: "cat7",
    station: "dessert",
    vatRate: 13,
    popularity: 5,
    minQty: 3,
    maxQty: 8,
  },
  {
    id: "p28",
    name: "Cheesecake",
    price: 14,
    categoryId: "cat7",
    station: "dessert",
    vatRate: 13,
    popularity: 6,
    minQty: 3,
    maxQty: 10,
  },
];

// ─── Deterministic Pseudo-Random ────────────────────────────────────────────
// Simple seeded hash for deterministic "randomness" based on date + index

function seededValue(seed: number): number {
  // Simple hash function producing 0-1 range
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function seededRange(seed: number, min: number, max: number): number {
  return min + seededValue(seed) * (max - min);
}

function seededInt(seed: number, min: number, max: number): number {
  return Math.floor(seededRange(seed, min, max + 1));
}

// ─── Hourly Distribution Pattern ────────────────────────────────────────────

// Distribution weights for hours 12-23
const HOURLY_WEIGHTS: Record<number, number> = {
  12: 0.04, // opening ramp
  13: 0.12, // lunch peak
  14: 0.11, // lunch peak
  15: 0.04, // quiet
  16: 0.02, // quiet
  17: 0.02, // quiet
  18: 0.03, // early dinner
  19: 0.06, // dinner ramp
  20: 0.16, // dinner peak
  21: 0.18, // dinner peak
  22: 0.14, // dinner peak
  23: 0.08, // late
};

function distributeRevenueByHour(
  totalRevenue: number,
  daySeed: number,
): HourlyRevenue[] {
  const hours: HourlyRevenue[] = [];
  let remaining = totalRevenue;

  for (let hour = 12; hour <= 23; hour++) {
    const baseWeight = HOURLY_WEIGHTS[hour] ?? 0;
    // Add slight noise per hour
    const noise = 1 + (seededValue(daySeed * 100 + hour) - 0.5) * 0.3;
    const weight = baseWeight * noise;
    const hourRevenue = Math.round(totalRevenue * weight * 100) / 100;
    hours.push({ hour, revenue: hourRevenue });
    remaining -= hourRevenue;
  }

  // Distribute remainder to dinner peak
  if (remaining > 0) {
    const peakIdx = hours.findIndex((h) => h.hour === 21);
    if (peakIdx >= 0) {
      hours[peakIdx].revenue =
        Math.round((hours[peakIdx].revenue + remaining) * 100) / 100;
    }
  }

  return hours;
}

// ─── Product Selection ──────────────────────────────────────────────────────

function selectDailyProducts(
  daySeed: number,
  isWeekend: boolean,
): ProductSale[] {
  const productCount = isWeekend
    ? seededInt(daySeed + 500, 12, 15)
    : seededInt(daySeed + 500, 8, 12);

  // Sort products by a seeded score to pick different ones each day
  const scored = PRODUCT_REFS.map((p, idx) => ({
    product: p,
    score: p.popularity * 2 + seededValue(daySeed + idx * 7) * 10,
  }));

  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, productCount);

  return selected.map(({ product }, idx) => {
    const qtyMultiplier = isWeekend ? 1.5 : 1;
    const qty = Math.max(
      1,
      Math.round(
        seededRange(daySeed + idx * 13, product.minQty, product.maxQty) *
          qtyMultiplier,
      ),
    );

    return {
      productId: product.id,
      productName: product.name,
      quantity: qty,
      revenue: Math.round(qty * product.price * 100) / 100,
      station: product.station,
    };
  });
}

// ─── Generate 30 Days ───────────────────────────────────────────────────────

function generateMockHistory(): DailyStats[] {
  const today = new Date();
  const days: DailyStats[] = [];

  for (let i = 1; i <= 30; i++) {
    const date = subDays(today, i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayOfWeek = getDay(date); // 0=Sun, 5=Fri, 6=Sat

    // Use date components as seed for determinism
    const daySeed =
      date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

    // Generate product sales first, then derive revenue
    const productSales = selectDailyProducts(daySeed, isWeekend);
    const productRevenue = productSales.reduce(
      (sum, ps) => sum + ps.revenue,
      0,
    );

    // Ensure total revenue is within spec range (add some extra for drinks/misc)
    const baseMin = isWeekend ? 3000 : 1500;
    const baseMax = isWeekend ? 5500 : 3000;
    const targetRevenue = seededRange(daySeed + 1, baseMin, baseMax);
    const revenue = Math.max(targetRevenue, productRevenue);

    // Scale product sales if revenue needs adjustment
    const scaleFactor = revenue / (productRevenue || 1);
    if (scaleFactor > 1.05) {
      // Scale up product quantities slightly
      for (const ps of productSales) {
        const extraQty = Math.max(
          0,
          Math.round((scaleFactor - 1) * ps.quantity),
        );
        ps.quantity += extraQty;
        ps.revenue =
          Math.round(
            ps.quantity * (ps.revenue / (ps.quantity - extraQty || 1)) * 100,
          ) / 100;
      }
    }

    // Recalculate actual revenue from products
    const actualRevenue =
      Math.round(productSales.reduce((sum, ps) => sum + ps.revenue, 0) * 100) /
      100;

    // Order count
    const avgCheck = seededRange(daySeed + 2, 18, 28);
    const orderCount = Math.max(
      isWeekend ? 25 : 15,
      Math.round(actualRevenue / avgCheck),
    );
    const realAvgCheck = Math.round((actualRevenue / orderCount) * 100) / 100;

    // Cash/card split: ~55% cash with noise
    const cashRatio = seededRange(daySeed + 3, 0.35, 0.45);
    const cashPayments = Math.round(actualRevenue * cashRatio * 100) / 100;
    const cardPayments = Math.round((actualRevenue - cashPayments) * 100) / 100;

    // Hourly revenue distribution
    const hourlyRevenue = distributeRevenueByHour(actualRevenue, daySeed);

    days.push({
      date: dateStr,
      revenue: actualRevenue,
      orderCount,
      avgCheck: realAvgCheck,
      cashPayments,
      cardPayments,
      hourlyRevenue,
      productSales,
    });
  }

  // Sort ascending by date (oldest first)
  days.sort((a, b) => a.date.localeCompare(b.date));

  return days;
}

export const mockHistory: DailyStats[] = generateMockHistory();

// ─── Prep Times ─────────────────────────────────────────────────────────────

export const mockPrepTimes: MockPrepTime[] = [
  // Ωμά / raw cold appetizers: 5-8 min
  {
    productId: "p1",
    productName: "Καρπάτσιο Λαβρακιού",
    avgMinutes: 6,
    station: "cold",
  },
  {
    productId: "p2",
    productName: "Καρπάτσιο Μπαρμπουνιού",
    avgMinutes: 7,
    station: "cold",
  },
  {
    productId: "p3",
    productName: "Ταρτάρ Γαρίδας",
    avgMinutes: 8,
    station: "cold",
  },
  // Κρύα Ορεκτικά / cold appetizers: 5-8 min
  {
    productId: "p4",
    productName: "Ταραμοσαλάτα Λευκή",
    avgMinutes: 5,
    station: "cold",
  },
  {
    productId: "p5",
    productName: "Μελιτζανοσαλάτα",
    avgMinutes: 5,
    station: "cold",
  },
  {
    productId: "p6",
    productName: "Καβουροσαλάτα",
    avgMinutes: 7,
    station: "cold",
  },
  {
    productId: "p7",
    productName: "Χτένια Ωμά",
    avgMinutes: 6,
    station: "cold",
  },
  // Ζεστά Ορεκτικά / hot appetizers: 8-12 min
  {
    productId: "p8",
    productName: "Σαγανάκι Γαρίδες",
    avgMinutes: 10,
    station: "hot",
  },
  {
    productId: "p9",
    productName: "Αχνιστά Όστρακα",
    avgMinutes: 9,
    station: "hot",
  },
  {
    productId: "p10",
    productName: "Καλαμαράκια Τηγανητά",
    avgMinutes: 8,
    station: "hot",
  },
  {
    productId: "p11",
    productName: "Γαρίδες Τηγανητές",
    avgMinutes: 10,
    station: "hot",
  },
  // Ψητά Θαλασσινά / grilled seafood: 12-18 min
  { productId: "p12", productName: "Τσιπούρα", avgMinutes: 15, station: "hot" },
  {
    productId: "p13",
    productName: "Μπαρμπούνι",
    avgMinutes: 14,
    station: "hot",
  },
  { productId: "p14", productName: "Φαγκρί", avgMinutes: 18, station: "hot" },
  {
    productId: "p15",
    productName: "Συναγρίδα",
    avgMinutes: 18,
    station: "hot",
  },
  {
    productId: "p16",
    productName: "Γαρίδες Θερμαϊκού",
    avgMinutes: 12,
    station: "hot",
  },
  { productId: "p17", productName: "Καλαμάρι", avgMinutes: 13, station: "hot" },
  { productId: "p18", productName: "Χταπόδι", avgMinutes: 16, station: "hot" },
  // Μαγειρευτά / cooked dishes: 20-30 min
  {
    productId: "p19",
    productName: "Ψαρόσουπα",
    avgMinutes: 25,
    station: "hot",
  },
  { productId: "p20", productName: "Φρικασέ", avgMinutes: 28, station: "hot" },
  {
    productId: "p21",
    productName: "Κοκκινιστό",
    avgMinutes: 30,
    station: "hot",
  },
  { productId: "p22", productName: "Πλακί", avgMinutes: 25, station: "hot" },
  // Ζυμαρικά / pasta: 12-15 min
  {
    productId: "p23",
    productName: "Γαριδομακαρονάδα",
    avgMinutes: 14,
    station: "hot",
  },
  {
    productId: "p24",
    productName: "Αστακομακαρονάδα",
    avgMinutes: 15,
    station: "hot",
  },
  // Γλυκά / desserts: 5-8 min
  {
    productId: "p25",
    productName: "Μπακλαβάς",
    avgMinutes: 5,
    station: "dessert",
  },
  {
    productId: "p26",
    productName: "Τιραμισού",
    avgMinutes: 5,
    station: "dessert",
  },
  {
    productId: "p27",
    productName: "Lemon Bar",
    avgMinutes: 6,
    station: "dessert",
  },
  {
    productId: "p28",
    productName: "Cheesecake",
    avgMinutes: 6,
    station: "dessert",
  },
];

// ─── Cancellations ──────────────────────────────────────────────────────────

function generateCancellations(): MockCancellation[] {
  const today = new Date();
  const reasons = [
    "Εξαντλήθηκε το υλικό",
    "Λάθος παραγγελία",
    "Αλλαγή γνώμης πελάτη",
    "Καθυστέρηση παρασκευής",
    "Αλλεργία πελάτη",
    "Ελαττωματική παρτίδα",
  ];

  const cancellations: MockCancellation[] = [
    {
      date: format(subDays(today, 2), "yyyy-MM-dd"),
      productId: "p14",
      productName: "Φαγκρί",
      reason: reasons[0],
    },
    {
      date: format(subDays(today, 5), "yyyy-MM-dd"),
      productId: "p10",
      productName: "Καλαμαράκια Τηγανητά",
      reason: reasons[1],
    },
    {
      date: format(subDays(today, 8), "yyyy-MM-dd"),
      productId: "p24",
      productName: "Αστακομακαρονάδα",
      reason: reasons[2],
    },
    {
      date: format(subDays(today, 12), "yyyy-MM-dd"),
      productId: "p7",
      productName: "Χτένια Ωμά",
      reason: reasons[4],
    },
    {
      date: format(subDays(today, 17), "yyyy-MM-dd"),
      productId: "p12",
      productName: "Τσιπούρα",
      reason: reasons[3],
    },
    {
      date: format(subDays(today, 21), "yyyy-MM-dd"),
      productId: "p8",
      productName: "Σαγανάκι Γαρίδες",
      reason: reasons[5],
    },
    {
      date: format(subDays(today, 25), "yyyy-MM-dd"),
      productId: "p18",
      productName: "Χταπόδι",
      reason: reasons[0],
    },
  ];

  return cancellations;
}

export const mockCancellations: MockCancellation[] = generateCancellations();
