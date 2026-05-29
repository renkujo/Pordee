import { describe, expect, it } from "vitest";
import { fmtBaht, fmtSignedBaht } from "~/lib/format/baht";

describe("fmtBaht", () => {
  it("formats integers with the Thai baht symbol", () => {
    expect(fmtBaht(65)).toContain("65");
    expect(fmtBaht(65)).toContain("฿");
  });

  it("rounds to 0 decimal places by default", () => {
    const out = fmtBaht(65.4);
    expect(out).toMatch(/65/);
    expect(out).not.toMatch(/\.4/);
  });

  it("keeps decimals when precise:true", () => {
    expect(fmtBaht(65.4, { precise: true })).toMatch(/65\.4/);
  });

  it("returns em dash for non-finite", () => {
    expect(fmtBaht(NaN)).toBe("—");
    expect(fmtBaht(Infinity)).toBe("—");
  });
});

describe("fmtSignedBaht", () => {
  it("prefixes + for income", () => {
    expect(fmtSignedBaht(100, "income")).toMatch(/^\+/);
  });

  it("prefixes - for expense and always shows positive magnitude", () => {
    const out = fmtSignedBaht(60, "expense");
    expect(out.startsWith("-")).toBe(true);
    expect(out).toMatch(/60/);
  });

  it("handles negative input by taking abs value", () => {
    const out = fmtSignedBaht(-50, "expense");
    expect(out.startsWith("-")).toBe(true);
    expect(out).toMatch(/50/);
  });
});
