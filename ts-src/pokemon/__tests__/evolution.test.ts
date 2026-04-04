import { describe, it, expect } from "vitest";
import { Evolution } from "../evolution";
import {
  EvolutionType,
  usesLevel,
  evolutionTypeToIndex,
  evolutionTypeFromIndex,
  skipSplitEvo,
} from "../evolution-type";
import { Pokemon } from "../pokemon";
import { Type } from "../type";

function makePokemon(number: number, name: string): Pokemon {
  const p = new Pokemon();
  p.number = number;
  p.name = name;
  p.primaryType = Type.NORMAL;
  return p;
}

describe("EvolutionType enum", () => {
  it("has LEVEL as the first entry", () => {
    expect(EvolutionType.LEVEL).toBe(0);
  });

  it("has all expected evolution types", () => {
    expect(EvolutionType.STONE).toBeDefined();
    expect(EvolutionType.TRADE).toBeDefined();
    expect(EvolutionType.TRADE_ITEM).toBeDefined();
    expect(EvolutionType.HAPPINESS).toBeDefined();
    expect(EvolutionType.HAPPINESS_DAY).toBeDefined();
    expect(EvolutionType.HAPPINESS_NIGHT).toBeDefined();
    expect(EvolutionType.LEVEL_ATTACK_HIGHER).toBeDefined();
    expect(EvolutionType.LEVEL_DEFENSE_HIGHER).toBeDefined();
    expect(EvolutionType.LEVEL_ATK_DEF_SAME).toBeDefined();
    expect(EvolutionType.LEVEL_LOW_PV).toBeDefined();
    expect(EvolutionType.LEVEL_HIGH_PV).toBeDefined();
    expect(EvolutionType.LEVEL_CREATE_EXTRA).toBeDefined();
    expect(EvolutionType.LEVEL_IS_EXTRA).toBeDefined();
    expect(EvolutionType.LEVEL_HIGH_BEAUTY).toBeDefined();
    expect(EvolutionType.STONE_MALE_ONLY).toBeDefined();
    expect(EvolutionType.STONE_FEMALE_ONLY).toBeDefined();
    expect(EvolutionType.LEVEL_ITEM_DAY).toBeDefined();
    expect(EvolutionType.LEVEL_ITEM_NIGHT).toBeDefined();
    expect(EvolutionType.LEVEL_WITH_MOVE).toBeDefined();
    expect(EvolutionType.LEVEL_WITH_OTHER).toBeDefined();
    expect(EvolutionType.LEVEL_MALE_ONLY).toBeDefined();
    expect(EvolutionType.LEVEL_FEMALE_ONLY).toBeDefined();
    expect(EvolutionType.LEVEL_ELECTRIFIED_AREA).toBeDefined();
    expect(EvolutionType.LEVEL_MOSS_ROCK).toBeDefined();
    expect(EvolutionType.LEVEL_ICY_ROCK).toBeDefined();
    expect(EvolutionType.TRADE_SPECIAL).toBeDefined();
    expect(EvolutionType.FAIRY_AFFECTION).toBeDefined();
    expect(EvolutionType.LEVEL_WITH_DARK).toBeDefined();
    expect(EvolutionType.LEVEL_UPSIDE_DOWN).toBeDefined();
    expect(EvolutionType.LEVEL_RAIN).toBeDefined();
    expect(EvolutionType.LEVEL_DAY).toBeDefined();
    expect(EvolutionType.LEVEL_NIGHT).toBeDefined();
    expect(EvolutionType.LEVEL_FEMALE_ESPURR).toBeDefined();
    expect(EvolutionType.LEVEL_GAME).toBeDefined();
    expect(EvolutionType.LEVEL_DAY_GAME).toBeDefined();
    expect(EvolutionType.LEVEL_NIGHT_GAME).toBeDefined();
    expect(EvolutionType.LEVEL_SNOWY).toBeDefined();
    expect(EvolutionType.LEVEL_DUSK).toBeDefined();
    expect(EvolutionType.LEVEL_NIGHT_ULTRA).toBeDefined();
    expect(EvolutionType.STONE_ULTRA).toBeDefined();
    expect(EvolutionType.NONE).toBeDefined();
  });
});

describe("Evolution construction", () => {
  it("stores from, to, carryStats, type, and extraInfo", () => {
    const bulbasaur = makePokemon(1, "Bulbasaur");
    const ivysaur = makePokemon(2, "Ivysaur");

    const evo = new Evolution(bulbasaur, ivysaur, true, EvolutionType.LEVEL, 16);

    expect(evo.from).toBe(bulbasaur);
    expect(evo.to).toBe(ivysaur);
    expect(evo.carryStats).toBe(true);
    expect(evo.type).toBe(EvolutionType.LEVEL);
    expect(evo.extraInfo).toBe(16);
  });

  it("has default values for forme and formeSuffix", () => {
    const a = makePokemon(1, "A");
    const b = makePokemon(2, "B");
    const evo = new Evolution(a, b, false, EvolutionType.STONE, 0);
    expect(evo.forme).toBe(0);
    expect(evo.formeSuffix).toBe("");
  });

  it("toFullName returns to.name + formeSuffix", () => {
    const a = makePokemon(1, "Eevee");
    const b = makePokemon(2, "Vaporeon");
    const evo = new Evolution(a, b, false, EvolutionType.STONE, 0);
    expect(evo.toFullName()).toBe("Vaporeon");

    evo.formeSuffix = "-Alolan";
    expect(evo.toFullName()).toBe("Vaporeon-Alolan");
  });
});

describe("Evolution equals and compareTo", () => {
  it("equals checks from, to, and type", () => {
    const a = makePokemon(1, "A");
    const b = makePokemon(2, "B");

    const evo1 = new Evolution(a, b, true, EvolutionType.LEVEL, 16);
    const evo2 = new Evolution(a, b, false, EvolutionType.LEVEL, 20);
    expect(evo1.equals(evo2)).toBe(true);

    const evo3 = new Evolution(a, b, true, EvolutionType.STONE, 16);
    expect(evo1.equals(evo3)).toBe(false);
  });

  it("equals returns false for null", () => {
    const a = makePokemon(1, "A");
    const b = makePokemon(2, "B");
    const evo = new Evolution(a, b, false, EvolutionType.LEVEL, 16);
    expect(evo.equals(null)).toBe(false);
  });

  it("compareTo orders by from.number, then to.number, then type", () => {
    const a = makePokemon(1, "A");
    const b = makePokemon(2, "B");
    const c = makePokemon(3, "C");

    const evo1 = new Evolution(a, b, false, EvolutionType.LEVEL, 0);
    const evo2 = new Evolution(a, c, false, EvolutionType.LEVEL, 0);
    expect(evo1.compareTo(evo2)).toBeLessThan(0);

    const evo3 = new Evolution(b, c, false, EvolutionType.LEVEL, 0);
    expect(evo1.compareTo(evo3)).toBeLessThan(0);
  });
});

describe("usesLevel()", () => {
  it("returns true for LEVEL", () => {
    expect(usesLevel(EvolutionType.LEVEL)).toBe(true);
  });

  it("returns true for level-based variants", () => {
    expect(usesLevel(EvolutionType.LEVEL_ATTACK_HIGHER)).toBe(true);
    expect(usesLevel(EvolutionType.LEVEL_DEFENSE_HIGHER)).toBe(true);
    expect(usesLevel(EvolutionType.LEVEL_ATK_DEF_SAME)).toBe(true);
    expect(usesLevel(EvolutionType.LEVEL_LOW_PV)).toBe(true);
    expect(usesLevel(EvolutionType.LEVEL_HIGH_PV)).toBe(true);
    expect(usesLevel(EvolutionType.LEVEL_CREATE_EXTRA)).toBe(true);
    expect(usesLevel(EvolutionType.LEVEL_IS_EXTRA)).toBe(true);
    expect(usesLevel(EvolutionType.LEVEL_MALE_ONLY)).toBe(true);
    expect(usesLevel(EvolutionType.LEVEL_FEMALE_ONLY)).toBe(true);
    expect(usesLevel(EvolutionType.LEVEL_WITH_DARK)).toBe(true);
    expect(usesLevel(EvolutionType.LEVEL_UPSIDE_DOWN)).toBe(true);
    expect(usesLevel(EvolutionType.LEVEL_RAIN)).toBe(true);
    expect(usesLevel(EvolutionType.LEVEL_DAY)).toBe(true);
    expect(usesLevel(EvolutionType.LEVEL_NIGHT)).toBe(true);
    expect(usesLevel(EvolutionType.LEVEL_FEMALE_ESPURR)).toBe(true);
    expect(usesLevel(EvolutionType.LEVEL_GAME)).toBe(true);
    expect(usesLevel(EvolutionType.LEVEL_DAY_GAME)).toBe(true);
    expect(usesLevel(EvolutionType.LEVEL_NIGHT_GAME)).toBe(true);
    expect(usesLevel(EvolutionType.LEVEL_SNOWY)).toBe(true);
    expect(usesLevel(EvolutionType.LEVEL_DUSK)).toBe(true);
    expect(usesLevel(EvolutionType.LEVEL_NIGHT_ULTRA)).toBe(true);
  });

  it("returns false for non-level evolution types", () => {
    expect(usesLevel(EvolutionType.STONE)).toBe(false);
    expect(usesLevel(EvolutionType.TRADE)).toBe(false);
    expect(usesLevel(EvolutionType.TRADE_ITEM)).toBe(false);
    expect(usesLevel(EvolutionType.HAPPINESS)).toBe(false);
    expect(usesLevel(EvolutionType.HAPPINESS_DAY)).toBe(false);
    expect(usesLevel(EvolutionType.HAPPINESS_NIGHT)).toBe(false);
    expect(usesLevel(EvolutionType.LEVEL_HIGH_BEAUTY)).toBe(false);
    expect(usesLevel(EvolutionType.STONE_MALE_ONLY)).toBe(false);
    expect(usesLevel(EvolutionType.STONE_FEMALE_ONLY)).toBe(false);
    expect(usesLevel(EvolutionType.FAIRY_AFFECTION)).toBe(false);
    expect(usesLevel(EvolutionType.TRADE_SPECIAL)).toBe(false);
    expect(usesLevel(EvolutionType.STONE_ULTRA)).toBe(false);
    expect(usesLevel(EvolutionType.NONE)).toBe(false);
  });
});

describe("skipSplitEvo()", () => {
  it("returns true for LEVEL_HIGH_BEAUTY, LEVEL_NIGHT_ULTRA, STONE_ULTRA", () => {
    expect(skipSplitEvo(EvolutionType.LEVEL_HIGH_BEAUTY)).toBe(true);
    expect(skipSplitEvo(EvolutionType.LEVEL_NIGHT_ULTRA)).toBe(true);
    expect(skipSplitEvo(EvolutionType.STONE_ULTRA)).toBe(true);
  });

  it("returns false for normal evolution types", () => {
    expect(skipSplitEvo(EvolutionType.LEVEL)).toBe(false);
    expect(skipSplitEvo(EvolutionType.STONE)).toBe(false);
    expect(skipSplitEvo(EvolutionType.TRADE)).toBe(false);
  });
});

describe("evolutionTypeToIndex and evolutionTypeFromIndex", () => {
  it("LEVEL has index 1 in gen1", () => {
    expect(evolutionTypeToIndex(EvolutionType.LEVEL, 1)).toBe(1);
  });

  it("LEVEL has index 4 in gen3", () => {
    expect(evolutionTypeToIndex(EvolutionType.LEVEL, 3)).toBe(4);
  });

  it("TRADE_ITEM is not available in gen1 (returns -1)", () => {
    expect(evolutionTypeToIndex(EvolutionType.TRADE_ITEM, 1)).toBe(-1);
  });

  it("round-trips for gen7 LEVEL", () => {
    const index = evolutionTypeToIndex(EvolutionType.LEVEL, 7);
    expect(index).toBe(4);
    const type = evolutionTypeFromIndex(7, index);
    expect(type).toBe(EvolutionType.LEVEL);
  });

  it("evolutionTypeFromIndex returns null for invalid index", () => {
    expect(evolutionTypeFromIndex(1, 99)).toBeNull();
  });
});
