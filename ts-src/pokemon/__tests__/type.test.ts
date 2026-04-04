import { describe, it, expect } from "vitest";
import {
  Type,
  isHackOnly,
  GEN1,
  GEN2THROUGH5,
  GEN6PLUS,
  getAllTypes,
  randomType,
  camelCase,
  typeCamelCase,
} from "../type";

describe("Type enum", () => {
  it("has all 18 standard types with correct ordinal values", () => {
    expect(Type.NORMAL).toBe(0);
    expect(Type.FIGHTING).toBe(1);
    expect(Type.FLYING).toBe(2);
    expect(Type.GRASS).toBe(3);
    expect(Type.WATER).toBe(4);
    expect(Type.FIRE).toBe(5);
    expect(Type.ROCK).toBe(6);
    expect(Type.GROUND).toBe(7);
    expect(Type.PSYCHIC).toBe(8);
    expect(Type.BUG).toBe(9);
    expect(Type.DRAGON).toBe(10);
    expect(Type.ELECTRIC).toBe(11);
    expect(Type.GHOST).toBe(12);
    expect(Type.POISON).toBe(13);
    expect(Type.ICE).toBe(14);
    expect(Type.STEEL).toBe(15);
    expect(Type.DARK).toBe(16);
    expect(Type.FAIRY).toBe(17);
  });

  it("has hack-only types after the standard types", () => {
    expect(Type.GAS).toBe(18);
    expect(Type.WOOD).toBe(19);
    expect(Type.ABNORMAL).toBe(20);
    expect(Type.WIND).toBe(21);
    expect(Type.SOUND).toBe(22);
    expect(Type.LIGHT).toBe(23);
    expect(Type.TRI).toBe(24);
  });

  it("identifies hack-only types correctly", () => {
    expect(isHackOnly(Type.GAS)).toBe(true);
    expect(isHackOnly(Type.WOOD)).toBe(true);
    expect(isHackOnly(Type.ABNORMAL)).toBe(true);
    expect(isHackOnly(Type.WIND)).toBe(true);
    expect(isHackOnly(Type.SOUND)).toBe(true);
    expect(isHackOnly(Type.LIGHT)).toBe(true);
    expect(isHackOnly(Type.TRI)).toBe(true);
  });

  it("does not mark standard types as hack-only", () => {
    expect(isHackOnly(Type.NORMAL)).toBe(false);
    expect(isHackOnly(Type.FIRE)).toBe(false);
    expect(isHackOnly(Type.FAIRY)).toBe(false);
    expect(isHackOnly(Type.STEEL)).toBe(false);
  });
});

describe("Generation-specific type lists", () => {
  it("GEN1 contains types up through ICE (15 types)", () => {
    expect(GEN1).toHaveLength(15);
    expect(GEN1).toContain(Type.NORMAL);
    expect(GEN1).toContain(Type.ICE);
    expect(GEN1).not.toContain(Type.STEEL);
    expect(GEN1).not.toContain(Type.DARK);
    expect(GEN1).not.toContain(Type.FAIRY);
  });

  it("GEN2THROUGH5 contains types up through DARK (17 types)", () => {
    expect(GEN2THROUGH5).toHaveLength(17);
    expect(GEN2THROUGH5).toContain(Type.STEEL);
    expect(GEN2THROUGH5).toContain(Type.DARK);
    expect(GEN2THROUGH5).not.toContain(Type.FAIRY);
  });

  it("GEN6PLUS contains types up through FAIRY (18 types)", () => {
    expect(GEN6PLUS).toHaveLength(18);
    expect(GEN6PLUS).toContain(Type.FAIRY);
    expect(GEN6PLUS).not.toContain(Type.GAS);
  });

  it("getAllTypes returns correct list per generation", () => {
    expect(getAllTypes(1)).toBe(GEN1);
    expect(getAllTypes(2)).toBe(GEN2THROUGH5);
    expect(getAllTypes(3)).toBe(GEN2THROUGH5);
    expect(getAllTypes(4)).toBe(GEN2THROUGH5);
    expect(getAllTypes(5)).toBe(GEN2THROUGH5);
    expect(getAllTypes(6)).toBe(GEN6PLUS);
    expect(getAllTypes(7)).toBe(GEN6PLUS);
  });
});

describe("randomType", () => {
  it("returns a valid type from the provided random function", () => {
    // random() returning 0 should give the first type
    const result0 = randomType(() => 0);
    expect(result0).toBe(Type.NORMAL);

    // random() returning just under 1 should give the last type
    const result1 = randomType(() => 0.999);
    // Should be a valid numeric Type value
    expect(typeof result1).toBe("number");
    expect(result1).toBeGreaterThanOrEqual(0);
  });

  it("returns different types for different random values", () => {
    const types = new Set<Type>();
    for (let i = 0; i < 25; i++) {
      types.add(randomType(() => i / 25));
    }
    expect(types.size).toBeGreaterThan(1);
  });
});

describe("camelCase", () => {
  it("capitalizes the first letter of each word", () => {
    expect(camelCase("NORMAL")).toBe("Normal");
    expect(camelCase("normal")).toBe("Normal");
  });

  it("handles multi-word strings", () => {
    expect(camelCase("MEDIUM FAST")).toBe("Medium Fast");
    expect(camelCase("medium slow")).toBe("Medium Slow");
  });

  it("preserves apostrophes within words", () => {
    expect(camelCase("FARFETCH'D")).toBe("Farfetch'd");
  });
});

describe("typeCamelCase", () => {
  it("converts type enum names to camel case", () => {
    expect(typeCamelCase(Type.NORMAL)).toBe("Normal");
    expect(typeCamelCase(Type.FIGHTING)).toBe("Fighting");
    expect(typeCamelCase(Type.PSYCHIC)).toBe("Psychic");
    expect(typeCamelCase(Type.FAIRY)).toBe("Fairy");
  });
});
