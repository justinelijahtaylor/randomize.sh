import { describe, it, expect, beforeEach } from "vitest";
import { tb, d, initFromMap } from "../unicode-parser";

describe("UnicodeParser", () => {
  beforeEach(() => {
    const entries = new Map<number, string>();
    entries.set(0x0001, "A");
    entries.set(0x0002, "B");
    entries.set(0x0003, "C");
    entries.set(0x0004, "0");
    entries.set(0x0005, "1");
    entries.set(0x0010, "Hello");
    initFromMap(entries);
  });

  it("populates forward table (tb) correctly", () => {
    expect(tb[0x0001]).toBe("A");
    expect(tb[0x0002]).toBe("B");
    expect(tb[0x0003]).toBe("C");
    expect(tb[0x0010]).toBe("Hello");
  });

  it("populates reverse table (d) correctly", () => {
    expect(d.get("A")).toBe(0x0001);
    expect(d.get("B")).toBe(0x0002);
    expect(d.get("C")).toBe(0x0003);
    expect(d.get("Hello")).toBe(0x0010);
  });

  it("returns null for unmapped forward entries", () => {
    expect(tb[0x0006]).toBeNull();
    expect(tb[0xffff]).toBeNull();
  });

  it("returns undefined for unmapped reverse entries", () => {
    expect(d.get("Z")).toBeUndefined();
  });

  it("handles multi-character mapping strings", () => {
    expect(tb[0x0010]).toBe("Hello");
    expect(d.get("Hello")).toBe(0x0010);
  });

  it("reinitializing clears old entries", () => {
    expect(tb[0x0001]).toBe("A");

    const newEntries = new Map<number, string>();
    newEntries.set(0x0050, "X");
    initFromMap(newEntries);

    expect(tb[0x0001]).toBeNull();
    expect(tb[0x0050]).toBe("X");
    expect(d.get("A")).toBeUndefined();
    expect(d.get("X")).toBe(0x0050);
  });
});
