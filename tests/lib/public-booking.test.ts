import { describe, it, expect } from "vitest";
import { validatePublicBooking } from "@/lib/reservations/public-booking";

const now = new Date("2026-04-24T10:00:00+03:00");

describe("validatePublicBooking", () => {
  describe("date range", () => {
    it("accepts today at a future time", () => {
      const result = validatePublicBooking(
        {
          reservation_date: "2026-04-24",
          reservation_time: "20:00",
          party_size: 2,
        },
        { now },
      );
      expect(result.ok).toBe(true);
    });

    it("rejects a date in the past", () => {
      const result = validatePublicBooking(
        {
          reservation_date: "2026-04-23",
          reservation_time: "20:00",
          party_size: 2,
        },
        { now },
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/παρελθόν/);
    });

    it("rejects a date beyond the advance window", () => {
      const result = validatePublicBooking(
        {
          reservation_date: "2026-06-01",
          reservation_time: "20:00",
          party_size: 2,
        },
        { now, maxAdvanceDays: 30 },
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/30 ημέρες/);
    });

    it("accepts the last allowed day in the advance window", () => {
      const result = validatePublicBooking(
        {
          reservation_date: "2026-05-24",
          reservation_time: "20:00",
          party_size: 2,
        },
        { now, maxAdvanceDays: 30 },
      );
      expect(result.ok).toBe(true);
    });
  });

  describe("same-day minimum notice", () => {
    it("rejects a time that is too soon on the same day", () => {
      const result = validatePublicBooking(
        {
          reservation_date: "2026-04-24",
          reservation_time: "12:00",
          party_size: 2,
        },
        {
          now: new Date("2026-04-24T11:30:00+03:00"),
          minAdvanceHours: 1,
        },
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/νωρίς/);
    });

    it("accepts a same-day time outside the minimum notice window", () => {
      const result = validatePublicBooking(
        {
          reservation_date: "2026-04-24",
          reservation_time: "14:00",
          party_size: 2,
        },
        {
          now: new Date("2026-04-24T11:30:00+03:00"),
          minAdvanceHours: 1,
        },
      );
      expect(result.ok).toBe(true);
    });
  });

  describe("operating hours", () => {
    it("rejects a time before opening", () => {
      const result = validatePublicBooking(
        {
          reservation_date: "2026-04-25",
          reservation_time: "11:00",
          party_size: 2,
        },
        { now },
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/ωράριο/);
    });

    it("rejects a time after closing", () => {
      const result = validatePublicBooking(
        {
          reservation_date: "2026-04-25",
          reservation_time: "23:00",
          party_size: 2,
        },
        { now },
      );
      expect(result.ok).toBe(false);
    });

    it("accepts the opening time", () => {
      const result = validatePublicBooking(
        {
          reservation_date: "2026-04-25",
          reservation_time: "12:00",
          party_size: 2,
        },
        { now },
      );
      expect(result.ok).toBe(true);
    });

    it("accepts the latest allowed time", () => {
      const result = validatePublicBooking(
        {
          reservation_date: "2026-04-25",
          reservation_time: "22:30",
          party_size: 2,
        },
        { now },
      );
      expect(result.ok).toBe(true);
    });
  });

  describe("party size", () => {
    it("rejects zero-party", () => {
      const result = validatePublicBooking(
        {
          reservation_date: "2026-04-25",
          reservation_time: "20:00",
          party_size: 0,
        },
        { now },
      );
      expect(result.ok).toBe(false);
    });

    it("rejects parties above the public limit", () => {
      const result = validatePublicBooking(
        {
          reservation_date: "2026-04-25",
          reservation_time: "20:00",
          party_size: 9,
        },
        { now, maxPartySize: 8 },
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/τηλεφωνικώς/);
    });

    it("accepts the maximum party size", () => {
      const result = validatePublicBooking(
        {
          reservation_date: "2026-04-25",
          reservation_time: "20:00",
          party_size: 8,
        },
        { now, maxPartySize: 8 },
      );
      expect(result.ok).toBe(true);
    });
  });

  describe("input format", () => {
    it("rejects a malformed date", () => {
      const result = validatePublicBooking(
        {
          reservation_date: "24-04-2026",
          reservation_time: "20:00",
          party_size: 2,
        },
        { now },
      );
      expect(result.ok).toBe(false);
    });

    it("rejects a malformed time", () => {
      const result = validatePublicBooking(
        {
          reservation_date: "2026-04-25",
          reservation_time: "8pm",
          party_size: 2,
        },
        { now },
      );
      expect(result.ok).toBe(false);
    });
  });
});
