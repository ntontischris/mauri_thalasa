const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const DEFAULT_RULES = {
  maxAdvanceDays: 30,
  minAdvanceHours: 1,
  minPartySize: 1,
  maxPartySize: 8,
  earliestTimeHHMM: "12:00",
  latestTimeHHMM: "22:30",
} as const;

export interface PublicBookingInput {
  readonly reservation_date: string;
  readonly reservation_time: string;
  readonly party_size: number;
}

export interface PublicBookingRules {
  readonly now: Date;
  readonly maxAdvanceDays?: number;
  readonly minAdvanceHours?: number;
  readonly minPartySize?: number;
  readonly maxPartySize?: number;
  readonly earliestTimeHHMM?: string;
  readonly latestTimeHHMM?: string;
}

export type PublicBookingValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string };

export function validatePublicBooking(
  input: PublicBookingInput,
  rules: PublicBookingRules,
): PublicBookingValidation {
  const {
    maxAdvanceDays = DEFAULT_RULES.maxAdvanceDays,
    minAdvanceHours = DEFAULT_RULES.minAdvanceHours,
    minPartySize = DEFAULT_RULES.minPartySize,
    maxPartySize = DEFAULT_RULES.maxPartySize,
    earliestTimeHHMM = DEFAULT_RULES.earliestTimeHHMM,
    latestTimeHHMM = DEFAULT_RULES.latestTimeHHMM,
  } = rules;

  if (!DATE_RE.test(input.reservation_date)) {
    return { ok: false, error: "Μη έγκυρη ημερομηνία." };
  }
  if (!TIME_RE.test(input.reservation_time)) {
    return { ok: false, error: "Μη έγκυρη ώρα." };
  }

  if (input.party_size < minPartySize) {
    return { ok: false, error: "Μη έγκυρος αριθμός ατόμων." };
  }
  if (input.party_size > maxPartySize) {
    return {
      ok: false,
      error: `Για ${maxPartySize}+ άτομα παρακαλώ κάντε κράτηση τηλεφωνικώς.`,
    };
  }

  const earliestMin = toMinutes(earliestTimeHHMM);
  const latestMin = toMinutes(latestTimeHHMM);
  const requestedMin = toMinutes(input.reservation_time);
  if (requestedMin < earliestMin || requestedMin > latestMin) {
    return {
      ok: false,
      error: `Εκτός ωράριου κρατήσεων (${earliestTimeHHMM}–${latestTimeHHMM}).`,
    };
  }

  const requestedAt = parseLocalDateTime(
    input.reservation_date,
    input.reservation_time,
    rules.now,
  );

  const minAllowedAt = new Date(
    rules.now.getTime() + minAdvanceHours * 60 * 60 * 1000,
  );
  if (requestedAt.getTime() < minAllowedAt.getTime()) {
    const sameDay = isSameLocalDate(requestedAt, rules.now);
    if (sameDay) {
      return {
        ok: false,
        error: `Πολύ νωρίς. Οι κρατήσεις γίνονται τουλάχιστον ${minAdvanceHours} ώρα(ες) πριν.`,
      };
    }
    return { ok: false, error: "Η ημερομηνία είναι στο παρελθόν." };
  }

  const maxAllowedDate = new Date(rules.now);
  maxAllowedDate.setDate(maxAllowedDate.getDate() + maxAdvanceDays);
  if (startOfLocalDay(requestedAt) > startOfLocalDay(maxAllowedDate)) {
    return {
      ok: false,
      error: `Κρατήσεις γίνονται έως ${maxAdvanceDays} ημέρες νωρίτερα.`,
    };
  }

  return { ok: true };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function parseLocalDateTime(date: string, time: string, reference: Date): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const local = new Date(reference.getTime());
  local.setFullYear(y, mo - 1, d);
  local.setHours(h, mi, 0, 0);
  return local;
}

function startOfLocalDay(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

function isSameLocalDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
