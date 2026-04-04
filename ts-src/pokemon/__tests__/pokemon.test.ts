import { describe, it, expect } from "vitest";
import { Pokemon } from "../pokemon";
import { Type } from "../type";
import { ExpCurve } from "../exp-curve";

function makePokemon(overrides: Partial<{
  number: number;
  name: string;
  primaryType: Type;
  secondaryType: Type | null;
  hp: number;
  attack: number;
  defense: number;
  spatk: number;
  spdef: number;
  speed: number;
}>): Pokemon {
  const p = new Pokemon();
  p.number = overrides.number ?? 1;
  p.name = overrides.name ?? "TestMon";
  p.primaryType = overrides.primaryType ?? Type.NORMAL;
  p.secondaryType = overrides.secondaryType ?? null;
  p.hp = overrides.hp ?? 50;
  p.attack = overrides.attack ?? 50;
  p.defense = overrides.defense ?? 50;
  p.spatk = overrides.spatk ?? 50;
  p.spdef = overrides.spdef ?? 50;
  p.speed = overrides.speed ?? 50;
  p.growthCurve = ExpCurve.MEDIUM_FAST;
  return p;
}

describe("Pokemon construction and field access", () => {
  it("has default field values after construction", () => {
    const p = new Pokemon();
    expect(p.name).toBe("");
    expect(p.number).toBe(0);
    expect(p.hp).toBe(0);
    expect(p.attack).toBe(0);
    expect(p.defense).toBe(0);
    expect(p.spatk).toBe(0);
    expect(p.spdef).toBe(0);
    expect(p.speed).toBe(0);
    expect(p.secondaryType).toBeNull();
    expect(p.evolutionsFrom).toEqual([]);
    expect(p.evolutionsTo).toEqual([]);
  });

  it("allows setting and reading fields", () => {
    const p = makePokemon({
      number: 25,
      name: "Pikachu",
      primaryType: Type.ELECTRIC,
      hp: 35,
      attack: 55,
      defense: 40,
      spatk: 50,
      spdef: 50,
      speed: 90,
    });
    expect(p.number).toBe(25);
    expect(p.name).toBe("Pikachu");
    expect(p.primaryType).toBe(Type.ELECTRIC);
    expect(p.secondaryType).toBeNull();
  });
});

describe("bst()", () => {
  it("calculates base stat total correctly", () => {
    const p = makePokemon({
      hp: 45,
      attack: 49,
      defense: 49,
      spatk: 65,
      spdef: 65,
      speed: 45,
    });
    expect(p.bst()).toBe(45 + 49 + 49 + 65 + 65 + 45);
  });

  it("returns 0 for a Pokemon with all zero stats", () => {
    const p = makePokemon({ hp: 0, attack: 0, defense: 0, spatk: 0, spdef: 0, speed: 0 });
    expect(p.bst()).toBe(0);
  });
});

describe("shuffleStats()", () => {
  it("preserves BST after shuffling", () => {
    const p = makePokemon({
      hp: 100,
      attack: 80,
      defense: 60,
      spatk: 120,
      spdef: 70,
      speed: 90,
    });
    const originalBST = p.bst();

    let i = 0;
    const deterministicRandom = () => {
      // Simple seeded sequence
      const vals = [0.7, 0.3, 0.5, 0.1, 0.9, 0.4, 0.6, 0.2, 0.8];
      return vals[i++ % vals.length];
    };

    p.shuffleStats(deterministicRandom);
    expect(p.bst()).toBe(originalBST);
  });

  it("rearranges stats (with high probability)", () => {
    const p = makePokemon({
      hp: 10,
      attack: 20,
      defense: 30,
      spatk: 40,
      spdef: 50,
      speed: 60,
    });
    const originalStats = [p.hp, p.attack, p.defense, p.spatk, p.spdef, p.speed];

    let i = 0;
    p.shuffleStats(() => {
      const vals = [0.8, 0.2, 0.6, 0.1, 0.9];
      return vals[i++ % vals.length];
    });

    const newStats = [p.hp, p.attack, p.defense, p.spatk, p.spdef, p.speed];
    // Stats should be a permutation of originals
    expect(newStats.sort((a, b) => a - b)).toEqual(originalStats.sort((a, b) => a - b));
  });
});

describe("randomizeStatsWithinBST()", () => {
  it("preserves BST approximately for normal Pokemon", () => {
    const p = makePokemon({
      hp: 80,
      attack: 82,
      defense: 83,
      spatk: 100,
      spdef: 100,
      speed: 80,
    });
    const originalBST = p.bst();

    let i = 0;
    p.randomizeStatsWithinBST(() => {
      const vals = [0.5, 0.3, 0.7, 0.2, 0.8, 0.4];
      return vals[i++ % vals.length];
    });

    // BST may differ slightly due to rounding, but should be close
    expect(Math.abs(p.bst() - originalBST)).toBeLessThanOrEqual(6);
    // All stats should be at least minimum values
    expect(p.hp).toBeGreaterThanOrEqual(20);
    expect(p.attack).toBeGreaterThanOrEqual(10);
    expect(p.defense).toBeGreaterThanOrEqual(10);
    expect(p.spatk).toBeGreaterThanOrEqual(10);
    expect(p.spdef).toBeGreaterThanOrEqual(10);
    expect(p.speed).toBeGreaterThanOrEqual(10);
  });

  it("keeps Shedinja at 1 HP", () => {
    const shedinja = makePokemon({
      number: 292,
      name: "Shedinja",
      hp: 1,
      attack: 90,
      defense: 45,
      spatk: 30,
      spdef: 30,
      speed: 40,
    });

    let i = 0;
    shedinja.randomizeStatsWithinBST(() => {
      const vals = [0.5, 0.3, 0.7, 0.2, 0.8];
      return vals[i++ % vals.length];
    });

    expect(shedinja.hp).toBe(1);
  });
});

describe("Type getters", () => {
  it("primaryType is set correctly", () => {
    const p = makePokemon({ primaryType: Type.FIRE });
    expect(p.primaryType).toBe(Type.FIRE);
  });

  it("secondaryType is null for single-type Pokemon", () => {
    const p = makePokemon({ primaryType: Type.WATER });
    expect(p.secondaryType).toBeNull();
  });

  it("secondaryType is set for dual-type Pokemon", () => {
    const p = makePokemon({ primaryType: Type.WATER, secondaryType: Type.FLYING });
    expect(p.secondaryType).toBe(Type.FLYING);
  });
});

describe("Legendary species sets", () => {
  it("Mewtwo is legendary", () => {
    const p = makePokemon({ number: 150, name: "Mewtwo" });
    expect(p.isLegendary()).toBe(true);
  });

  it("Mewtwo is a strong legendary", () => {
    const p = makePokemon({ number: 150, name: "Mewtwo" });
    expect(p.isStrongLegendary()).toBe(true);
  });

  it("Mew is legendary but not strong legendary", () => {
    const p = makePokemon({ number: 151, name: "Mew" });
    expect(p.isLegendary()).toBe(true);
    expect(p.isStrongLegendary()).toBe(false);
  });

  it("Articuno (144) is legendary", () => {
    const p = makePokemon({ number: 144 });
    expect(p.isLegendary()).toBe(true);
  });

  it("Rayquaza (384) is a strong legendary", () => {
    const p = makePokemon({ number: 384 });
    expect(p.isLegendary()).toBe(true);
    expect(p.isStrongLegendary()).toBe(true);
  });

  it("Pikachu (25) is not legendary", () => {
    const p = makePokemon({ number: 25, name: "Pikachu" });
    expect(p.isLegendary()).toBe(false);
    expect(p.isStrongLegendary()).toBe(false);
  });

  it("Ultra Beasts are identified correctly", () => {
    const nihilego = makePokemon({ number: 793 });
    expect(nihilego.isUltraBeast()).toBe(true);

    const pikachu = makePokemon({ number: 25 });
    expect(pikachu.isUltraBeast()).toBe(false);
  });
});

describe("equals and compareTo", () => {
  it("equals returns true for same number", () => {
    const a = makePokemon({ number: 25 });
    const b = makePokemon({ number: 25 });
    expect(a.equals(b)).toBe(true);
  });

  it("equals returns false for different number", () => {
    const a = makePokemon({ number: 25 });
    const b = makePokemon({ number: 26 });
    expect(a.equals(b)).toBe(false);
  });

  it("equals returns false for null", () => {
    const a = makePokemon({ number: 25 });
    expect(a.equals(null)).toBe(false);
  });

  it("compareTo orders by number", () => {
    const a = makePokemon({ number: 25 });
    const b = makePokemon({ number: 150 });
    expect(a.compareTo(b)).toBeLessThan(0);
    expect(b.compareTo(a)).toBeGreaterThan(0);
    expect(a.compareTo(a)).toBe(0);
  });
});

describe("fullName", () => {
  it("returns name with forme suffix", () => {
    const p = makePokemon({ name: "Charizard" });
    p.formeSuffix = "-Mega X";
    expect(p.fullName()).toBe("Charizard-Mega X");
  });

  it("returns just name when no forme suffix", () => {
    const p = makePokemon({ name: "Pikachu" });
    expect(p.fullName()).toBe("Pikachu");
  });
});

describe("bstForPowerLevels", () => {
  it("returns normal BST for non-Shedinja", () => {
    const p = makePokemon({ hp: 80, attack: 82, defense: 83, spatk: 100, spdef: 100, speed: 80 });
    expect(p.bstForPowerLevels()).toBe(p.bst());
  });

  it("adjusts BST for Shedinja (292)", () => {
    const shedinja = makePokemon({
      number: 292,
      hp: 1,
      attack: 90,
      defense: 45,
      spatk: 30,
      spdef: 30,
      speed: 40,
    });
    // Shedinja formula: (atk + def + spa + spd + spe) * 6 / 5
    const expected = (90 + 45 + 30 + 30 + 40) * 6 / 5;
    expect(shedinja.bstForPowerLevels()).toBe(expected);
  });
});
