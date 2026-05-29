import { describe, expect, it } from "vitest";
import { parseQuickEntry } from "~/lib/parse/quick-entry";

describe("parseQuickEntry", () => {
  it("extracts amount and infers expense by default", () => {
    const r = parseQuickEntry("กาแฟ 65");
    expect(r.amount).toBe(65);
    expect(r.kind).toBe("expense");
    expect(r.title).toBe("กาแฟ");
    expect(r.categoryId).toBe("cat-food");
  });

  it("infers income from เงินเดือน keyword and routes to cat-salary", () => {
    const r = parseQuickEntry("เงินเดือน 25000");
    expect(r.amount).toBe(25000);
    expect(r.kind).toBe("income");
    expect(r.categoryId).toBe("cat-salary");
  });

  it("routes side hustle phrasing to cat-side", () => {
    const r = parseQuickEntry("งานเสริม 800");
    expect(r.kind).toBe("income");
    expect(r.categoryId).toBe("cat-side");
  });

  it("hits cat-transport on รถ/แท็กซี่/grab", () => {
    expect(parseQuickEntry("ค่ารถ 40").categoryId).toBe("cat-transport");
    expect(parseQuickEntry("grab 120").categoryId).toBe("cat-transport");
    expect(parseQuickEntry("แท็กซี่ 90").categoryId).toBe("cat-transport");
  });

  it("hits cat-bills on bill phrasing", () => {
    expect(parseQuickEntry("ค่าน้ำ 320").categoryId).toBe("cat-bills");
    expect(parseQuickEntry("ค่าไฟ 1500").categoryId).toBe("cat-bills");
  });

  it("returns null amount when no number is present", () => {
    const r = parseQuickEntry("ข้าวเที่ยง");
    expect(r.amount).toBeNull();
    expect(r.title).toBe("ข้าวเที่ยง");
  });

  it("handles decimals", () => {
    const r = parseQuickEntry("ขนม 12.5");
    expect(r.amount).toBe(12.5);
  });

  it("uses the last number when several appear", () => {
    const r = parseQuickEntry("ข้าว 2 จาน 120");
    expect(r.amount).toBe(120);
    expect(r.title).toBe("ข้าว 2 จาน");
  });

  it("leaves categoryId null when no keyword matches", () => {
    const r = parseQuickEntry("ของขวัญ 500");
    expect(r.categoryId).toBeNull();
  });

  it("preserves the whole input as title when only a number is given", () => {
    const r = parseQuickEntry("100");
    expect(r.amount).toBe(100);
    expect(r.title).toBe("100");
  });
});
