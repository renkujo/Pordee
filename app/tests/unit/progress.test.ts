import { describe, expect, it } from "vitest";
import { getSharePercent } from "~/lib/format/progress";

describe("getSharePercent", () => {
  it("rounds a share into an integer percent", () => {
    expect(getSharePercent(1_200, 3_000)).toBe(40);
  });

  it("returns zero when amount or total cannot produce a positive share", () => {
    expect(getSharePercent(0, 3_000)).toBe(0);
    expect(getSharePercent(1_200, 0)).toBe(0);
    expect(getSharePercent(-100, 3_000)).toBe(0);
  });

  it("caps shares at 100 percent", () => {
    expect(getSharePercent(4_000, 3_000)).toBe(100);
  });
});
