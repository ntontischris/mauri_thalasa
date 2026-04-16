export interface PriceableItem {
  price: number;
  quantity: number;
  modifiers: { price: number }[];
}

export interface VatableItem extends PriceableItem {
  vatRate: number;
}

export interface VatBreakdownRow {
  rate: number;
  gross: number;
  vat: number;
  net: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateLineTotal(item: PriceableItem): number {
  const modifierSum = item.modifiers.reduce((s, m) => s + m.price, 0);
  return round2((item.price + modifierSum) * item.quantity);
}

export function calculateOrderSubtotal(items: PriceableItem[]): number {
  return round2(items.reduce((sum, item) => sum + calculateLineTotal(item), 0));
}

export function calculateVatBreakdown(items: VatableItem[]): VatBreakdownRow[] {
  const byRate = new Map<number, number>();
  for (const item of items) {
    const gross = calculateLineTotal(item);
    byRate.set(item.vatRate, (byRate.get(item.vatRate) ?? 0) + gross);
  }
  return Array.from(byRate.entries())
    .map(([rate, rawGross]) => {
      const gross = round2(rawGross);
      const net = round2(gross / (1 + rate / 100));
      const vat = round2(gross - net);
      return { rate, gross, vat, net };
    })
    .sort((a, b) => b.rate - a.rate);
}
