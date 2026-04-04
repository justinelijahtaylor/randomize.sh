import { describe, it, expect } from "vitest";
import { RomFunctions, StringLengthSD } from "../rom-functions";
import { MoveLearnt } from "../../pokemon/move-learnt";

describe("RomFunctions.camelCase", () => {
  it("converts all-caps to title case", () => {
    expect(RomFunctions.camelCase("BULBASAUR")).toBe("Bulbasaur");
  });

  it("converts all-lower to title case", () => {
    expect(RomFunctions.camelCase("pikachu")).toBe("Pikachu");
  });

  it("handles multi-word names with spaces", () => {
    expect(RomFunctions.camelCase("MR. MIME")).toBe("Mr. Mime");
  });

  it("handles hyphens as word separators", () => {
    expect(RomFunctions.camelCase("HO-OH")).toBe("Ho-Oh");
  });

  it("preserves apostrophes within words", () => {
    expect(RomFunctions.camelCase("FARFETCH'D")).toBe("Farfetch'd");
  });

  it("handles smart apostrophe (U+2019)", () => {
    expect(RomFunctions.camelCase("FARFETCH\u2019D")).toBe(
      "Farfetch\u2019d"
    );
  });

  it("handles empty string", () => {
    expect(RomFunctions.camelCase("")).toBe("");
  });

  it("handles single character", () => {
    expect(RomFunctions.camelCase("A")).toBe("A");
    expect(RomFunctions.camelCase("a")).toBe("A");
  });

  it("handles names with numbers", () => {
    expect(RomFunctions.camelCase("PORYGON2")).toBe("Porygon2");
  });
});

describe("RomFunctions.search (KMP byte search)", () => {
  it("finds a pattern at the beginning", () => {
    const haystack = new Uint8Array([1, 2, 3, 4, 5]);
    const needle = new Uint8Array([1, 2, 3]);
    expect(RomFunctions.search(haystack, needle)).toEqual([0]);
  });

  it("finds a pattern at the end", () => {
    const haystack = new Uint8Array([1, 2, 3, 4, 5]);
    const needle = new Uint8Array([3, 4, 5]);
    expect(RomFunctions.search(haystack, needle)).toEqual([2]);
  });

  it("finds multiple occurrences", () => {
    const haystack = new Uint8Array([1, 2, 1, 2, 1, 2]);
    const needle = new Uint8Array([1, 2]);
    expect(RomFunctions.search(haystack, needle)).toEqual([0, 2, 4]);
  });

  it("returns empty array when pattern not found", () => {
    const haystack = new Uint8Array([1, 2, 3, 4, 5]);
    const needle = new Uint8Array([6, 7]);
    expect(RomFunctions.search(haystack, needle)).toEqual([]);
  });

  it("finds single byte", () => {
    const haystack = new Uint8Array([10, 20, 30, 20, 40]);
    const needle = new Uint8Array([20]);
    expect(RomFunctions.search(haystack, needle)).toEqual([1, 3]);
  });

  it("handles search with beginOffset", () => {
    const haystack = new Uint8Array([1, 2, 3, 1, 2, 3]);
    const needle = new Uint8Array([1, 2, 3]);
    const results = RomFunctions.search(haystack, 2, needle);
    expect(results).toEqual([3]);
  });

  it("handles search with beginOffset and endOffset", () => {
    const haystack = new Uint8Array([1, 2, 3, 1, 2, 3, 1, 2, 3]);
    const needle = new Uint8Array([1, 2, 3]);
    const results = RomFunctions.search(haystack, 1, 6, needle);
    expect(results).toEqual([3]);
  });

  it("handles empty needle gracefully", () => {
    const haystack = new Uint8Array([1, 2, 3]);
    const needle = new Uint8Array([]);
    // Empty needle: the KMP loop won't match anything meaningful
    const results = RomFunctions.search(haystack, needle);
    expect(Array.isArray(results)).toBe(true);
  });
});

describe("RomFunctions.freeSpaceFinder", () => {
  it("finds free space (not long-aligned)", () => {
    // Create a ROM with a block of 0xFF bytes
    const rom = new Uint8Array(100).fill(0x00);
    // Fill positions 20-39 with 0xFF
    for (let i = 20; i < 40; i++) {
      rom[i] = 0xff;
    }
    // Search for 10 bytes of free space (needs amount + 2 = 12 consecutive 0xFF)
    const result = RomFunctions.freeSpaceFinder(rom, 0xff, 10, 0, false);
    // Should find start at 20, then + 2 = 22
    expect(result).toBe(22);
  });

  it("finds free space (long-aligned)", () => {
    const rom = new Uint8Array(100).fill(0x00);
    // Fill positions 20-49 with 0xFF
    for (let i = 20; i < 50; i++) {
      rom[i] = 0xff;
    }
    // Search for 10 bytes of free space (needs amount + 5 = 15 consecutive 0xFF)
    const result = RomFunctions.freeSpaceFinder(rom, 0xff, 10, 0, true);
    // Should find first match at 20, then (20 + 5) & ~3 = 25 & ~3 = 24
    expect(result).toBe(24);
  });

  it("returns -1 based value when no free space found", () => {
    const rom = new Uint8Array(10).fill(0x00);
    // No free space of 0xFF exists
    const result = RomFunctions.freeSpaceFinder(rom, 0xff, 5, 0, false);
    // searchForFirst returns -1, so result is -1 + 2 = 1
    expect(result).toBe(1);
  });
});

describe("RomFunctions.getMovesAtLevel", () => {
  function makeMoveLearnt(move: number, level: number): MoveLearnt {
    const ml = new MoveLearnt();
    ml.move = move;
    ml.level = level;
    return ml;
  }

  it("returns the last 4 moves at the given level", () => {
    const movesets = new Map<number, MoveLearnt[]>();
    movesets.set(1, [
      makeMoveLearnt(10, 1),
      makeMoveLearnt(20, 1),
      makeMoveLearnt(30, 5),
      makeMoveLearnt(40, 10),
      makeMoveLearnt(50, 15),
      makeMoveLearnt(60, 20),
    ]);
    const moves = RomFunctions.getMovesAtLevel(1, movesets, 20);
    expect(moves).toEqual([30, 40, 50, 60]);
  });

  it("returns fewer than 4 moves if not enough learned", () => {
    const movesets = new Map<number, MoveLearnt[]>();
    movesets.set(1, [
      makeMoveLearnt(10, 1),
      makeMoveLearnt(20, 5),
    ]);
    const moves = RomFunctions.getMovesAtLevel(1, movesets, 10);
    expect(moves).toEqual([10, 20, 0, 0]);
  });

  it("stops at the given level", () => {
    const movesets = new Map<number, MoveLearnt[]>();
    movesets.set(1, [
      makeMoveLearnt(10, 1),
      makeMoveLearnt(20, 5),
      makeMoveLearnt(30, 15),
    ]);
    const moves = RomFunctions.getMovesAtLevel(1, movesets, 10);
    expect(moves).toEqual([10, 20, 0, 0]);
  });

  it("handles empty moveset", () => {
    const movesets = new Map<number, MoveLearnt[]>();
    movesets.set(1, []);
    const moves = RomFunctions.getMovesAtLevel(1, movesets, 50);
    expect(moves).toEqual([0, 0, 0, 0]);
  });

  it("handles missing pokemon in movesets", () => {
    const movesets = new Map<number, MoveLearnt[]>();
    const moves = RomFunctions.getMovesAtLevel(999, movesets, 50);
    expect(moves).toEqual([0, 0, 0, 0]);
  });

  it("skips duplicate moves", () => {
    const movesets = new Map<number, MoveLearnt[]>();
    movesets.set(1, [
      makeMoveLearnt(10, 1),
      makeMoveLearnt(10, 5), // duplicate
      makeMoveLearnt(20, 10),
    ]);
    const moves = RomFunctions.getMovesAtLevel(1, movesets, 10);
    expect(moves).toEqual([10, 20, 0, 0]);
  });

  it("uses custom emptyValue", () => {
    const movesets = new Map<number, MoveLearnt[]>();
    movesets.set(1, [makeMoveLearnt(10, 1)]);
    const moves = RomFunctions.getMovesAtLevel(1, movesets, 10, 0xffff);
    expect(moves).toEqual([10, 0xffff, 0xffff, 0xffff]);
  });
});

describe("RomFunctions.rewriteDescriptionForNewLineSize", () => {
  const ssd = new StringLengthSD();

  it("wraps long text to fit line size", () => {
    const text = "This is a long description that should be wrapped";
    const result = RomFunctions.rewriteDescriptionForNewLineSize(
      text, "\n", 20, ssd
    );
    const lines = result.split("\n");
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(20);
    }
  });

  it("removes existing newlines and re-wraps", () => {
    const text = "Short\ntext here";
    const result = RomFunctions.rewriteDescriptionForNewLineSize(
      text, "\n", 50, ssd
    );
    expect(result).toBe("Short text here");
  });

  it("removes hyphenated line breaks", () => {
    const text = "some-\nword here";
    const result = RomFunctions.rewriteDescriptionForNewLineSize(
      text, "\n", 50, ssd
    );
    expect(result).toBe("someword here");
  });
});

describe("StringLengthSD", () => {
  it("returns string length", () => {
    const ssd = new StringLengthSD();
    expect(ssd.lengthFor("hello")).toBe(5);
    expect(ssd.lengthFor("")).toBe(0);
    expect(ssd.lengthFor("a")).toBe(1);
  });
});
