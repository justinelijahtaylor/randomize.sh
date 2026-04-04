import { describe, it, expect } from "vitest";
import {
  Effectiveness,
  against,
  superEffective,
  notVeryEffective,
} from "../effectiveness";
import { Type } from "../type";

describe("Effectiveness enum", () => {
  it("has all effectiveness levels", () => {
    expect(Effectiveness.ZERO).toBeDefined();
    expect(Effectiveness.HALF).toBeDefined();
    expect(Effectiveness.NEUTRAL).toBeDefined();
    expect(Effectiveness.DOUBLE).toBeDefined();
    expect(Effectiveness.QUARTER).toBeDefined();
    expect(Effectiveness.QUADRUPLE).toBeDefined();
  });
});

describe("Gen6+ type effectiveness", () => {
  it("Fire is super effective against Grass", () => {
    const result = superEffective(Type.FIRE, 6, false);
    expect(result).toContain(Type.GRASS);
  });

  it("Water resists Water", () => {
    const result = notVeryEffective(Type.WATER, 6, false);
    expect(result).toContain(Type.WATER);
  });

  it("Normal has no effect on Ghost", () => {
    const result = notVeryEffective(Type.NORMAL, 6, false);
    expect(result).toContain(Type.GHOST);
  });

  it("Electric has no effect on Ground", () => {
    const result = notVeryEffective(Type.ELECTRIC, 6, false);
    expect(result).toContain(Type.GROUND);
  });

  it("Fighting is super effective against Steel", () => {
    const result = superEffective(Type.FIGHTING, 6, false);
    expect(result).toContain(Type.STEEL);
  });

  it("Fairy is super effective against Dragon", () => {
    const result = superEffective(Type.FAIRY, 6, false);
    expect(result).toContain(Type.DRAGON);
  });

  it("Dragon has no effect on Fairy in Gen6+", () => {
    const result = notVeryEffective(Type.DRAGON, 6, false);
    expect(result).toContain(Type.FAIRY);
  });

  it("Poison is super effective against Fairy in Gen6+", () => {
    const result = superEffective(Type.POISON, 6, false);
    expect(result).toContain(Type.FAIRY);
  });

  it("Steel is super effective against Fairy in Gen6+", () => {
    const result = superEffective(Type.STEEL, 6, false);
    expect(result).toContain(Type.FAIRY);
  });
});

describe("Gen1 table differences", () => {
  it("Gen1 does not have Dark, Steel, or Fairy types", () => {
    const superAgainstNormal = superEffective(Type.NORMAL, 1, false);
    expect(superAgainstNormal).not.toContain(Type.DARK);
    expect(superAgainstNormal).not.toContain(Type.STEEL);
    expect(superAgainstNormal).not.toContain(Type.FAIRY);
  });

  it("Ghost has no effect on Psychic in Gen1", () => {
    const result = notVeryEffective(Type.GHOST, 1, false);
    expect(result).toContain(Type.PSYCHIC);
  });

  it("Bug is super effective against Poison in Gen1", () => {
    const result = superEffective(Type.BUG, 1, false);
    expect(result).toContain(Type.POISON);
  });

  it("Poison is super effective against Bug in Gen1", () => {
    const result = superEffective(Type.POISON, 1, false);
    expect(result).toContain(Type.BUG);
  });
});

describe("Gen2-5 vs Gen6+ differences", () => {
  it("Gen2-5 does not include Fairy type in super effective lists", () => {
    const poisonSE = superEffective(Type.POISON, 3, false);
    expect(poisonSE).not.toContain(Type.FAIRY);
  });

  it("Ghost is super effective against Psychic in Gen2-5", () => {
    const result = superEffective(Type.GHOST, 2, false);
    expect(result).toContain(Type.PSYCHIC);
  });

  it("Dark exists in Gen2-5", () => {
    const fightingSE = superEffective(Type.FIGHTING, 2, false);
    expect(fightingSE).toContain(Type.DARK);
  });

  it("Steel exists in Gen2-5", () => {
    const fightingSE = superEffective(Type.FIGHTING, 2, false);
    expect(fightingSE).toContain(Type.STEEL);
  });

  it("Ghost resists Steel in Gen2-5 but not in Gen6+", () => {
    const gen2NVE = notVeryEffective(Type.GHOST, 3, false);
    expect(gen2NVE).toContain(Type.STEEL);

    const gen6NVE = notVeryEffective(Type.GHOST, 6, false);
    expect(gen6NVE).not.toContain(Type.STEEL);
  });
});

describe("against() for dual-typed Pokemon", () => {
  it("returns null for Gen1", () => {
    const result = against(Type.FIRE, null, 1, false);
    expect(result).toBeNull();
  });

  it("returns effectiveness map for Gen6+ single type", () => {
    const result = against(Type.FIRE, null, 6, false);
    expect(result).not.toBeNull();
    expect(result!.get(Type.WATER)).toBe(Effectiveness.DOUBLE);
    expect(result!.get(Type.GRASS)).toBe(Effectiveness.HALF);
  });

  it("combines effectiveness for dual types", () => {
    // Fire/Grass: Water should be neutral (super vs Fire, not very vs Grass)
    const result = against(Type.FIRE, Type.GRASS, 6, false);
    expect(result).not.toBeNull();
    expect(result!.get(Type.WATER)).toBe(Effectiveness.NEUTRAL);
  });

  it("calculates quadruple effectiveness on dual types", () => {
    // Rock/Ground: Water is super effective against both
    const result = against(Type.ROCK, Type.GROUND, 6, false);
    expect(result).not.toBeNull();
    expect(result!.get(Type.WATER)).toBe(Effectiveness.QUADRUPLE);
  });

  it("calculates quarter effectiveness on dual types", () => {
    // Rock/Ground: Poison is not very effective against both
    const result = against(Type.ROCK, Type.GROUND, 6, false);
    expect(result).not.toBeNull();
    expect(result!.get(Type.POISON)).toBe(Effectiveness.QUARTER);
  });
});

describe("effectivenessUpdated flag", () => {
  it("Gen2-5 with effectivenessUpdated uses Gen6+ table", () => {
    // With updated effectiveness, Ghost should not resist Steel (Gen6+ change)
    const nveUpdated = notVeryEffective(Type.GHOST, 3, true);
    expect(nveUpdated).not.toContain(Type.STEEL);
  });
});
