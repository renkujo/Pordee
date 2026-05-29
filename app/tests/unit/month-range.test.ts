import { describe, expect, it } from "vitest";
import { getMonthRange } from "~/lib/date/month-range";

describe("getMonthRange", () => {
  it("returns the first instant of the month and the first of the next month", () => {
    const r = getMonthRange(new Date(Date.UTC(2026, 4, 15, 12, 30)));
    expect(r.from).toBe("2026-05-01T00:00:00.000Z");
    expect(r.to).toBe("2026-06-01T00:00:00.000Z");
  });

  it("rolls year over December", () => {
    const r = getMonthRange(new Date(Date.UTC(2026, 11, 31, 23, 59)));
    expect(r.from).toBe("2026-12-01T00:00:00.000Z");
    expect(r.to).toBe("2027-01-01T00:00:00.000Z");
  });

  it("is inclusive of the first day and exclusive of the next month", () => {
    const r = getMonthRange(new Date(Date.UTC(2026, 0, 1, 0, 0)));
    expect(r.from).toBe("2026-01-01T00:00:00.000Z");
    expect(r.to).toBe("2026-02-01T00:00:00.000Z");
  });
});
