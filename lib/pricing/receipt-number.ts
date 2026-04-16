function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateReceiptNumber(date: Date, orderId?: string): string {
  const year = date.getFullYear();
  const seed = orderId ? hashString(orderId) : Math.floor(Math.random() * 1e9);
  const seq = String(seed % 1_000_000).padStart(6, "0");
  return `ΑΛΠ-${year}-${seq}`;
}
