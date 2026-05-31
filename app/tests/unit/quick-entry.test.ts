import { describe, expect, it } from "vitest";
import { parseQuickEntry } from "~/lib/parse/quick-entry";

describe("parseQuickEntry", () => {
  it("extracts amount and infers expense by default", () => {
    const r = parseQuickEntry("กาแฟ 65");
    expect(r.amount).toBe(65);
    expect(r.kind).toBe("expense");
    expect(r.title).toBe("กาแฟ");
    expect(r.categoryName).toBe("อาหาร");
  });

  it("infers income from เงินเดือน keyword and routes to เงินเดือน", () => {
    const r = parseQuickEntry("เงินเดือน 25000");
    expect(r.amount).toBe(25000);
    expect(r.kind).toBe("income");
    expect(r.categoryName).toBe("เงินเดือน");
  });

  it("routes side hustle phrasing to งานเสริม", () => {
    const r = parseQuickEntry("งานเสริม 800");
    expect(r.kind).toBe("income");
    expect(r.categoryName).toBe("งานเสริม");
  });

  it("hits เดินทาง on รถ/แท็กซี่/grab", () => {
    expect(parseQuickEntry("ค่ารถ 40").categoryName).toBe("เดินทาง");
    expect(parseQuickEntry("grab 120").categoryName).toBe("เดินทาง");
    expect(parseQuickEntry("แท็กซี่ 90").categoryName).toBe("เดินทาง");
  });

  it("hits บิล on bill phrasing", () => {
    expect(parseQuickEntry("ค่าน้ำ 320").categoryName).toBe("บิล");
    expect(parseQuickEntry("ค่าไฟ 1500").categoryName).toBe("บิล");
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

  it("leaves categoryName null when no keyword matches", () => {
    const r = parseQuickEntry("ของขวัญ 500");
    expect(r.categoryName).toBeNull();
  });

  it("preserves the whole input as title when only a number is given", () => {
    const r = parseQuickEntry("100");
    expect(r.amount).toBe(100);
    expect(r.title).toBe("100");
  });
});
