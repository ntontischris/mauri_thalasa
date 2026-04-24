import { describe, it, expect } from "vitest";
import { extractStaffId } from "@/lib/auth/current-staff";

describe("extractStaffId", () => {
  it("returns the staff_id when present as a non-empty string", () => {
    expect(
      extractStaffId({ staff_id: "7c1f0c4a-88e9-4d7a-9b26-99f3f9b5c3e1" }),
    ).toBe("7c1f0c4a-88e9-4d7a-9b26-99f3f9b5c3e1");
  });

  it("returns null when metadata is null or undefined", () => {
    expect(extractStaffId(null)).toBeNull();
    expect(extractStaffId(undefined)).toBeNull();
  });

  it("returns null when staff_id is missing", () => {
    expect(extractStaffId({ role: "waiter" })).toBeNull();
  });

  it("returns null when staff_id is an empty string", () => {
    expect(extractStaffId({ staff_id: "" })).toBeNull();
  });

  it("returns null when staff_id is not a string", () => {
    expect(extractStaffId({ staff_id: 123 })).toBeNull();
    expect(extractStaffId({ staff_id: null })).toBeNull();
    expect(extractStaffId({ staff_id: { nested: "x" } })).toBeNull();
  });
});
