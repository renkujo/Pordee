import { describe, expect, it } from "vitest";
import { getInitialNextRunOn, getNextRunOnAfter } from "~/lib/date/recurrence";

describe("recurrence scheduling", () => {
  it("falls back to the last day of a shorter month", () => {
    const rule = {
      frequency: "monthly" as const,
      weeklyDay: null,
      monthlyDay: 31,
      yearlyMonth: null,
      yearlyDay: null,
      startDate: "2026-01-31",
      endDate: null,
    };

    expect(getInitialNextRunOn(rule)).toBe("2026-01-31");
    expect(getNextRunOnAfter(rule, "2026-01-31")).toBe("2026-02-28");
    expect(getNextRunOnAfter(rule, "2026-02-28")).toBe("2026-03-31");
  });

  it("starts weekly rules on the selected weekday at or after start date", () => {
    expect(
      getInitialNextRunOn({
        frequency: "weekly",
        weeklyDay: 1,
        monthlyDay: null,
        yearlyMonth: null,
        yearlyDay: null,
        startDate: "2026-06-10",
        endDate: null,
      })
    ).toBe("2026-06-15");
  });
});
